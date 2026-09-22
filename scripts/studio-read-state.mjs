import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAccount, createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deployment = JSON.parse(fs.readFileSync(path.join(project, "docs", "evidence", "studio-dev", "deployment.json"), "utf8"));
const values = {};
for (const file of [path.join(project, ".env"), path.resolve(project, "..", ".env")]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const index = line.indexOf("=");
    if (index <= 0 || line.trimStart().startsWith("#")) continue;
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (value) values[line.slice(0, index).trim()] = value;
  }
}
const rawKey = values.STUDIONET_INTEGRATOR_PRIVATE_KEY ?? "";
if (!/^(0x)?[0-9a-fA-F]{64}$/.test(rawKey)) throw new Error("authorized agent key unavailable");
const agent = createAccount(rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`);
const client = createClient({ chain: studioDevnet, endpoint: values.STUDIO_DEV_RPC_URL || studioDevnet.rpcUrls.default.http[0] });
const hash = process.argv[2];
const status = hash ? await client.request({ method: "gen_getTransactionStatus", params: [hash] }) : "NOT_REQUESTED";
async function retryRead(functionName, args = []) {
  let last;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await client.readContract({ address: deployment.contractAddress, functionName, args });
    } catch (error) {
      last = error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw last;
}
const credit = await retryRead("get_credit", [agent.address]);
const accounting = await retryRead("get_accounting");
console.log(`STATE_STATUS ${status}`);
console.log(`STATE_AGENT ${agent.address}`);
console.log(`STATE_CREDIT ${String(credit)}`);
console.log(`STATE_ACCOUNTING ${String(accounting)}`);
