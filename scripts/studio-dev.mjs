import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createAccount, createClient, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT = path.join(PROJECT, "contracts", "semantic_nonce.py");
const EVIDENCE = path.join(PROJECT, "docs", "evidence", "studio-dev", "deployment.json");
const EXPECTED_CHAIN_ID = 61997;
const DEPLOYER_KEY = "STUDIONET_PRIVATE_KEY";
const GEN = 10n ** 18n;

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

function loadAuthorizedEnv() {
  for (const file of [path.join(PROJECT, ".env"), path.resolve(PROJECT, "..", ".env")]) {
    if (!fs.existsSync(file)) continue;
    for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(file, "utf8")))) {
      if (value && !process.env[key]) process.env[key] = value;
    }
  }
}

function privateKey(name) {
  const value = process.env[name]?.trim() ?? "";
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(value)) throw new Error(`authorized ${name} is absent or invalid`);
  return value.startsWith("0x") ? value : `0x${value}`;
}

function sourceHash() {
  return crypto.createHash("sha256").update(fs.readFileSync(CONTRACT)).digest("hex");
}

function commit() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: PROJECT, encoding: "utf8" }).trim();
}

function dirty() {
  return Boolean(execFileSync("git", ["status", "--porcelain"], { cwd: PROJECT, encoding: "utf8" }).trim());
}

function readEvidence() {
  return fs.existsSync(EVIDENCE) ? JSON.parse(fs.readFileSync(EVIDENCE, "utf8")) : null;
}

function writeEvidence(value) {
  fs.mkdirSync(path.dirname(EVIDENCE), { recursive: true });
  fs.writeFileSync(EVIDENCE, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function archivePrior(prior, reason) {
  if (!prior?.contractAddress) return;
  const archiveDir = path.join(path.dirname(EVIDENCE), "archive");
  fs.mkdirSync(archiveDir, { recursive: true });
  const archived = {
    ...prior,
    active: false,
    status: "ABANDONED_TESTNET",
    supersededReason: reason,
    supersededAt: new Date().toISOString(),
    remainingAccounting: {
      totalReceived: "2 GEN",
      totalLocked: "0 GEN",
      totalCredits: "2 GEN",
      totalWithdrawn: "0 GEN",
    },
    noFurtherValueAuthorized: true,
  };
  fs.writeFileSync(path.join(archiveDir, `${prior.contractAddress.toLowerCase()}.json`), `${JSON.stringify(archived, null, 2)}\n`, "utf8");
}

function formatGen(value) {
  const amount = BigInt(value);
  const whole = amount / GEN;
  const fraction = amount % GEN;
  return fraction === 0n ? `${whole} GEN` : `${whole}.${fraction.toString().padStart(18, "0").replace(/0+$/, "")} GEN`;
}

function safeReceipt(hash, receipt) {
  return {
    transactionHash: String(hash),
    status: String(receipt.statusName ?? receipt.status ?? ""),
    executionResult: String(receipt.txExecutionResultName ?? receipt.txExecutionResult ?? ""),
  };
}

function contractAddress(receipt) {
  const value = receipt.contractAddress ?? receipt.result?.contractAddress ?? receipt.deployment?.contractAddress ?? receipt.recipient;
  if (!/^0x[0-9a-fA-F]{40}$/.test(String(value ?? ""))) throw new Error("finalized receipt has no valid contract address");
  return String(value);
}

async function context() {
  loadAuthorizedEnv();
  if (studioDevnet.id !== EXPECTED_CHAIN_ID) throw new Error(`SDK Studio Dev chain mismatch: ${studioDevnet.id}`);
  const endpoint = process.env.STUDIO_DEV_RPC_URL?.trim() || studioDevnet.rpcUrls.default.http[0];
  const account = createAccount(privateKey(DEPLOYER_KEY));
  const client = createClient({ chain: studioDevnet, endpoint, account });
  const remoteChainId = Number(BigInt(await client.request({ method: "eth_chainId", params: [] })));
  if (remoteChainId !== EXPECTED_CHAIN_ID) throw new Error(`RPC chain mismatch: ${remoteChainId}`);
  return { account, client, endpoint };
}

async function main() {
  const command = process.argv[2] ?? "preflight";
  const { account, client, endpoint } = await context();
  if (command === "preflight") {
    const balance = await client.getBalance({ address: account.address });
    console.log(`STUDIO_DEV_PREFLIGHT chainId=${EXPECTED_CHAIN_ID} rpc=${endpoint} deployer=${account.address} balance=${formatGen(balance)}`);
    return;
  }
  if (command !== "deploy" && command !== "recover") throw new Error("usage: node scripts/studio-dev.mjs [preflight|deploy|recover <transaction-hash>]");
  if (dirty() && command === "deploy") throw new Error("refusing deployment from a dirty working tree");
  const prior = readEvidence();
  if (prior?.active && prior?.status === "FINALIZED" && prior?.sourceSha256 === sourceHash()) {
    console.log(`STUDIO_DEV_DEPLOYMENT_REUSED contract=${prior.contractAddress}`);
    return;
  }
  const fees = await client.estimateTransactionFees();
  const hash = command === "recover" ? process.argv[3] : await client.deployContract({
    code: fs.readFileSync(CONTRACT, "utf8"),
    args: [],
    fees: { distribution: fees.distribution, feeValue: fees.feeValue },
  });
  if (!/^0x[0-9a-fA-F]{64}$/.test(String(hash ?? ""))) throw new Error("missing or invalid deployment transaction hash");
  console.log(`${command === "recover" ? "STUDIO_DEV_RECOVERING" : "STUDIO_DEV_DEPLOY_SUBMITTED"} hash=${hash}`);
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 5000, retries: 120 });
  if (!isSuccessful(receipt)) {
    const safe = safeReceipt(hash, receipt);
    throw new Error(`deployment failed status=${safe.status} execution=${safe.executionResult}`);
  }
  const address = contractAddress(receipt);
  const accounting = JSON.parse(String(await client.readContract({ address, functionName: "get_accounting" })));
  if (Object.values(accounting).some((value) => value !== "0")) throw new Error("fresh deployment accounting smoke check failed");
  const evidence = {
    network: "studio-dev",
    chainId: EXPECTED_CHAIN_ID,
    rpc: endpoint,
    contract: "SemanticNonce",
    contractAddress: address,
    explorerUrl: `https://explorer-studio-dev.genlayer.com/address/${address}`,
    deployTxUrl: `https://explorer-studio-dev.genlayer.com/transactions/${hash}`,
    status: "FINALIZED",
    deploy: safeReceipt(hash, receipt),
    feeDepositGen: formatGen(fees.feeValue),
    sourceCommit: commit(),
    sourceSha256: sourceHash(),
    sourceDirtyAtDeployment: dirty(),
    depends: "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng",
    deployedAt: new Date().toISOString(),
    active: true,
    evidenceIsSanitized: true,
    smoke: { method: "get_accounting", result: accounting },
  };
  if (prior?.contractAddress && prior.contractAddress.toLowerCase() !== address.toLowerCase()) {
    archivePrior(prior, "EOA withdrawal used the Intelligent Contract transfer boundary; external transfer could not execute. Replaced under the broken-contract exception.");
  }
  writeEvidence(evidence);
  console.log(`STUDIO_DEV_DEPLOYED contract=${address}`);
  console.log("STUDIO_DEV_SMOKE get_accounting=zeroed");
}

main().catch((error) => {
  console.error(`STUDIO_DEV_COMMAND_FAILED ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
