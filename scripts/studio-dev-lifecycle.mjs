import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CALL_KEY_UNNAMED,
  MessageType,
  createAccount,
  createClient,
  encodeExternalMessageFeeParams,
  isSuccessful,
} from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEPLOYMENT = path.join(PROJECT, "docs", "evidence", "studio-dev", "deployment.json");
const EVIDENCE = path.join(PROJECT, "docs", "evidence", "studio-dev", "lifecycle.json");
const STATE = path.join(PROJECT, ".local", "studio-dev-lifecycle.json");
const GEN = 10n ** 18n;
const BUDGET = 2n * GEN;

function parseEnv(text) {
  const values = {};
  for (const line of String(text).split(/\r?\n/)) {
    const index = line.indexOf("=");
    if (index <= 0 || line.trimStart().startsWith("#")) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

for (const file of [path.join(PROJECT, ".env"), path.resolve(PROJECT, "..", ".env")]) {
  if (!fs.existsSync(file)) continue;
  for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(file, "utf8")))) {
    if (value && !process.env[key]) process.env[key] = value;
  }
}

function privateKey(name) {
  const value = process.env[name]?.trim() ?? "";
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(value)) throw new Error(`authorized ${name} is absent or invalid`);
  return value.startsWith("0x") ? value : `0x${value}`;
}

function readJson(file, fallback = {}) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

function writeJson(file, value, mode) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", ...(mode ? { mode } : {}) });
}

function formatGen(value) {
  const amount = BigInt(value);
  const whole = amount / GEN;
  const fraction = amount % GEN;
  return fraction === 0n ? `${whole} GEN` : `${whole}.${fraction.toString().padStart(18, "0").replace(/0+$/, "")} GEN`;
}

async function main() {
  const deployment = readJson(DEPLOYMENT);
  if (deployment.chainId !== 61997 || !/^0x[0-9a-fA-F]{40}$/.test(deployment.contractAddress ?? "")) {
    throw new Error("valid Studio Dev deployment evidence is required");
  }
  const accounts = {
    principal: createAccount(privateKey("STUDIONET_PRIVATE_KEY")),
    agent: createAccount(privateKey("STUDIONET_INTEGRATOR_PRIVATE_KEY")),
    consumer: createAccount(privateKey("STUDIONET_STEWARD_PRIVATE_KEY")),
  };
  if (new Set(Object.values(accounts).map((item) => item.address.toLowerCase())).size !== 3) {
    throw new Error("three distinct authorized EOAs are required");
  }
  const endpoint = process.env.STUDIO_DEV_RPC_URL?.trim() || studioDevnet.rpcUrls.default.http[0];
  const clients = Object.fromEntries(Object.entries(accounts).map(([role, account]) => [
    role, createClient({ chain: studioDevnet, endpoint, account }),
  ]));
  const address = deployment.contractAddress;
  let state = readJson(STATE);
  if (state.contractAddress?.toLowerCase() !== address.toLowerCase()) {
    state = { contractAddress: address, leaseId: `semantic-demo-${deployment.sourceCommit.slice(0, 7)}`, hashes: {} };
  }
  state.hashes ??= {};
  writeJson(STATE, state, 0o600);

  if (state.pending?.hash) {
    console.log(`LIFECYCLE_RECOVERING role=${state.pending.role} method=${state.pending.method} hash=${state.pending.hash}`);
    const receipt = await clients.principal.waitForTransactionReceipt({
      hash: state.pending.hash, waitUntil: "finalized", interval: 3000, retries: 180,
    });
    if (!isSuccessful(receipt)) {
      state.failed ??= {};
      state.failed[state.pending.hash] = { role: state.pending.role, method: state.pending.method, result: "FINISHED_WITH_ERROR" };
      console.log(`LIFECYCLE_RECOVERED_FAILED role=${state.pending.role} method=${state.pending.method} hash=${state.pending.hash}`);
    }
    state.pending = null;
    writeJson(STATE, state, 0o600);
  }

  async function write(role, method, args, value = 0n) {
    const client = clients[role];
    const allocations = method === "withdraw_credit" ? [{
      messageType: MessageType.External,
      recipient: client.account.address,
      callKey: CALL_KEY_UNNAMED,
      budget: 42000n,
      feeParams: encodeExternalMessageFeeParams({ gasLimit: 21000n, maxGasPrice: 2n }),
    }] : undefined;
    let quote;
    try {
      quote = await client.estimateTransactionFeesForWrite({
        address, functionName: method, args, value,
        ...(allocations ? { messageAllocations: allocations } : {}),
      });
    } catch {
      if (allocations) throw new Error(`${method} fee simulation failed with required external message allocation`);
      quote = await client.estimateTransactionFees();
      console.log(`LIFECYCLE_FEE_SIMULATION_FALLBACK role=${role} method=${method}`);
    }
    const hash = await client.writeContract({
      address, functionName: method, args, value,
      fees: {
        distribution: quote.distribution,
        feeValue: quote.feeValue,
        ...(quote.messageAllocations?.length ? { messageAllocations: quote.messageAllocations } : {}),
      },
    });
    console.log(`LIFECYCLE_SUBMITTED role=${role} method=${method} value=${formatGen(value)} hash=${hash}`);
    const key = `${Object.keys(state.hashes).length + 1}_${role}_${method}`;
    state.hashes[key] = String(hash);
    state.pending = { role, method, hash: String(hash) };
    writeJson(STATE, state, 0o600);
    const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 3000, retries: 180 });
    if (!isSuccessful(receipt)) throw new Error(`${role} ${method} finalized without successful execution`);
    state.pending = null;
    writeJson(STATE, state, 0o600);
    console.log(`LIFECYCLE_FINALIZED role=${role} method=${method} feeDeposit=${formatGen(quote.feeValue)} hash=${hash}`);
  }

  async function read(method, args = []) {
    return JSON.parse(String(await clients.principal.readContract({ address, functionName: method, args })));
  }

  async function leaseOrNull() {
    try {
      return await read("get_lease", [state.leaseId]);
    } catch {
      return null;
    }
  }

  async function actionOrNull(actionId) {
    try {
      return await read("get_action", [state.leaseId, actionId]);
    } catch {
      return null;
    }
  }

  const balances = await Promise.all(Object.entries(clients).map(async ([role, client]) => [
    role, await client.getBalance({ address: accounts[role].address }),
  ]));
  console.log(`LIFECYCLE_PREFLIGHT ${balances.map(([role, balance]) => `${role}=${formatGen(balance)}`).join(" ")}`);
  if (balances.find(([role]) => role === "principal")[1] < BUDGET) throw new Error("principal balance is below 2 GEN");
  if (balances.some(([, balance]) => balance <= 0n)) throw new Error("an authorized actor has no GEN for fees");

  let lease = await leaseOrNull();
  if (!lease) {
    state.expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    writeJson(STATE, state, 0o600);
    await write("principal", "create_lease", [
      state.leaseId,
      accounts.agent.address,
      accounts.consumer.address,
      "Authorize distinct release-management actions for service alpha only.",
      state.expiresAt,
    ], BUDGET);
    lease = await leaseOrNull();
  }

  const examples = [
    ["rotate-key", "Rotate the service alpha signing key and revoke the old credential."],
    ["replace-key", "Replace service alpha's signing credential so the previous key no longer works."],
    ["publish-notes", "Publish the service alpha release notes for the current version."],
  ];
  for (const [actionId, text] of examples) {
    let action = await actionOrNull(actionId);
    if (!action) {
      await write("agent", "submit_action", [state.leaseId, actionId, text]);
      action = await actionOrNull(actionId);
    }
    while ((action.status === "SUBMITTED" || action.status === "RETRYABLE") && Number(action.attempt_count) < 2) {
      await write("principal", "review_action", [state.leaseId, actionId]);
      action = await actionOrNull(actionId);
    }
    if (actionId === "replace-key" && action.status !== "REPLAY_DENIED") {
      throw new Error(`semantic replay expected REPLAY_DENIED, received ${action.status}`);
    }
    if (actionId !== "replace-key" && action.status !== "AUTHORIZED") {
      throw new Error(`${actionId} expected AUTHORIZED, received ${action.status}`);
    }
    if (action.status === "AUTHORIZED") {
      const ticket = await read("get_ticket", [state.leaseId, actionId]);
      if (ticket.status === "OPEN") await write("consumer", "consume_ticket", [state.leaseId, actionId]);
    }
  }

  const agentCredit = await read("get_credit", [accounts.agent.address]);
  if (agentCredit.amount === String(BUDGET)) await write("agent", "withdraw_credit", []);
  lease = await leaseOrNull();
  const accounting = await read("get_accounting");
  const actions = Object.fromEntries(await Promise.all(examples.map(async ([id]) => [id, await actionOrNull(id)])));
  const tickets = {};
  for (const [id] of examples.filter(([id]) => id !== "replace-key")) tickets[id] = await read("get_ticket", [state.leaseId, id]);
  const evidence = {
    network: "studio-dev",
    chainId: 61997,
    contractAddress: address,
    explorerUrl: deployment.explorerUrl,
    leaseId: state.leaseId,
    roles: Object.fromEntries(Object.entries(accounts).map(([role, account]) => [role, account.address])),
    demoPurse: "2 GEN",
    phase: lease.phase,
    decisions: Object.fromEntries(Object.entries(actions).map(([id, action]) => [id, { status: action.status, replayOf: action.replay_of, attempts: action.attempt_count }])),
    tickets: Object.fromEntries(Object.entries(tickets).map(([id, ticket]) => [id, ticket.status])),
    agentCreditAfterWithdrawal: formatGen((await read("get_credit", [accounts.agent.address])).amount),
    accounting: {
      totalReceived: formatGen(accounting.total_received),
      totalLocked: formatGen(accounting.total_locked),
      totalCredits: formatGen(accounting.total_credits),
      totalWithdrawn: formatGen(accounting.total_withdrawn),
    },
    transactions: state.hashes,
    evidenceIsSanitized: true,
  };
  writeJson(EVIDENCE, evidence);
  console.log(`LIFECYCLE_COMPLETE lease=${state.leaseId} phase=${lease.phase} accounting=${JSON.stringify(evidence.accounting)}`);
}

main().catch((error) => {
  console.error(`LIFECYCLE_FAILED ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
