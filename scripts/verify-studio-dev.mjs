import fs from "node:fs";
import crypto from "node:crypto";
import { createClient, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

// Read-only verification: no wallet, signing, transaction submission or funding.
const deployment = JSON.parse(fs.readFileSync("docs/evidence/studio-dev/deployment.json", "utf8"));
const lifecycle = JSON.parse(fs.readFileSync("docs/evidence/studio-dev/lifecycle.json", "utf8"));
const client = createClient({ chain: studioDevnet, endpoint: "https://studio-next.genlayer.com/api" });
const GEN = 10n ** 18n;
function gen(value) {
  const number = BigInt(value), whole = number / GEN, remainder = number % GEN;
  return remainder === 0n ? `${whole} GEN` : `${whole}.${remainder.toString().padStart(18, "0").replace(/0+$/, "")} GEN`;
}
function requireFact(ok, label) { if (!ok) throw new Error(label); }
async function read(method, args = []) {
  const result = String(await client.readContract({ address: deployment.contractAddress, functionName: method, args }));
  return result ? JSON.parse(result) : null;
}
async function main() {
  const chainId = Number(BigInt(await client.request({ method: "eth_chainId", params: [] })));
  requireFact(chainId === 61997 && deployment.chainId === chainId && lifecycle.chainId === chainId, "chain identity");
  requireFact(deployment.contractAddress === lifecycle.contractAddress, "lifecycle address identity");
  const code = await client.getContractCode(deployment.contractAddress);
  const sha256 = crypto.createHash("sha256").update(code).digest("hex");
  const localSha256 = crypto.createHash("sha256").update(fs.readFileSync("contracts/semantic_nonce.py")).digest("hex");
  requireFact(sha256 === localSha256 && sha256 === deployment.sourceSha256, "deployed source identity");
  const schema = await client.getContractSchema(deployment.contractAddress);
  requireFact(Object.keys(schema.methods).length === 13, "schema methods");
  const lease = await read("get_lease", [lifecycle.leaseId]);
  requireFact(lease.phase === "EXHAUSTED" && lease.authorized_count === 2 && BigInt(lease.locked) === 0n, "lease terminal state");
  const decisions = {};
  for (const [id, expected] of Object.entries(lifecycle.decisions)) {
    const action = await read("get_action", [lifecycle.leaseId, id]);
    requireFact(action.status === expected.status && action.replay_of === expected.replayOf, "action decision");
    const attempt = await read("get_attempt", [lifecycle.leaseId, id, action.attempt_count]);
    const ticket = await read("get_ticket", [lifecycle.leaseId, id]);
    requireFact(attempt.coverage === "COMPLETE" && attempt.scope === "IN_SCOPE", "semantic coverage");
    requireFact(expected.status === "AUTHORIZED" ? ticket?.status === "CONSUMED" : ticket === null, "ticket enforcement");
    decisions[id] = { status: action.status, replayOf: action.replay_of, novelty: attempt.novelty, ticket: ticket?.status ?? "NONE" };
  }
  const rawAccounting = await read("get_accounting");
  const accounting = Object.fromEntries(Object.entries(rawAccounting).map(([key, value]) => [key, gen(value)]));
  requireFact(accounting.total_received === "2 GEN" && accounting.total_withdrawn === "2 GEN" && accounting.total_locked === "0 GEN" && accounting.total_credits === "0 GEN", "zero liability");
  const credit = await read("get_credit", [lifecycle.roles.agent]);
  const nativeBalance = gen(await client.getBalance({ address: deployment.contractAddress }));
  requireFact(BigInt(credit.amount) === 0n && nativeBalance === "0 GEN", "native and credit balance");
  const receipts = [];
  for (const [step, hash] of Object.entries({ deploy: deployment.deploy.transactionHash, ...lifecycle.transactions })) {
    const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", fullTransaction: false, retries: 1 });
    requireFact(isSuccessful(receipt), "successful execution receipt");
    const safe = { step, hash, status: receipt.statusName ?? receipt.status, result: "SUCCESS", execution: receipt.txExecutionResultName ?? receipt.txExecutionResult };
    if (step.endsWith("_review_action")) {
      const transaction = await client.getTransaction({ hash });
      requireFact(transaction.leader_only === false && Number(transaction.num_of_initial_validators) >= 2 && transaction.result_name === "MAJORITY_AGREE", "multi-validator consensus");
      safe.consensus = { leaderOnly: false, initialValidators: Number(transaction.num_of_initial_validators), result: transaction.result_name };
    }
    receipts.push(safe);
  }
  const withdrawal = await client.getTransaction({ hash: lifecycle.withdrawalProof.parentTransaction });
  const transfer = withdrawal.messages?.find((message) => String(message.recipient).toLowerCase() === lifecycle.roles.agent.toLowerCase());
  requireFact(isSuccessful(withdrawal) && transfer && BigInt(transfer.value) === 2n * GEN, "exact agent transfer");
  requireFact(lifecycle.withdrawalProof.nativeBefore === "2 GEN" && lifecycle.withdrawalProof.nativeAfter === nativeBalance && lifecycle.withdrawalProof.nativeDecrease === "2 GEN", "recorded native balance decrease");
  const explorer = [];
  for (const url of [deployment.explorerUrl, deployment.deployTxUrl]) {
    const response = await fetch(url);
    requireFact(response.ok, "explorer reachable");
    explorer.push({ url, httpStatus: response.status });
  }
  const evidence = { checkedAt: new Date().toISOString(), mode: "READ_ONLY", chainId, contractAddress: deployment.contractAddress, sourceSha256: sha256, methods: Object.keys(schema.methods), leaseId: lifecycle.leaseId, phase: lease.phase, decisions, accounting, nativeBalance, receipts, withdrawalProof: lifecycle.withdrawalProof, explorer, evidenceIsSanitized: true };
  fs.writeFileSync("docs/evidence/studio-dev/reverification.json", `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`STUDIO_DEV_VERIFY_PASS address=${deployment.contractAddress} receipts=${receipts.length} source=identical phase=${lease.phase} nativeBalance=${nativeBalance}`);
  console.log(`VERIFIED_ACCOUNTING ${JSON.stringify(accounting)}`);
  console.log(`EXPLORER ${deployment.explorerUrl}`);
}
main().catch((error) => {
  console.error(`STUDIO_DEV_VERIFY_FAILED name=${error?.name ?? "Error"} code=${typeof error?.code === "number" ? error.code : "unavailable"}`);
  process.exitCode = 1;
});
