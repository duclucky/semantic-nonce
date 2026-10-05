# SemanticNonce

SemanticNonce is a reusable Intelligent Contract for meaning-level replay
protection. A principal locks a two-action, 2 GEN lease for one agent and one
consumer. GenLayer validators decide whether each proposed action is within the
locked policy and whether its intended operational effect is genuinely new or
semantically repeats a previously authorized action. Only an in-scope novel
action consumes one unit, opens one consumer ticket, and credits exactly 1 GEN
to the agent.

This repository is contract-only. It has no frontend, hosted app, or Vercel
deployment. Gateway authors, DAO proposal intake systems, and paid AI/oracle
brokers can call the same methods without copying the semantic judge.

## Why GenLayer consensus is essential

Byte hashes can detect identical payloads but not paraphrases with the same
effect. `review_action` gives the leader the immutable policy, candidate, and
complete authorized history. A custom validator independently repeats that
semantic task and compares the meaning-critical tuple: entity IDs, policy and
history bindings, source coverage, scope, novelty, and exact replay target.
Reason wording is ignored. If validators reach different semantic decisions,
the result cannot pass. Contract code, never model prose, chooses the fixed
1 GEN credit, ticket, budget decrement, and recipient.

## Public API

Writes:

- `create_lease(...)`: payable exactly 2 GEN; locks roles, policy, and expiry.
- `submit_action(...)`: named agent proposes one bounded action.
- `review_action(...)`: permissionless semantic consensus trigger.
- `consume_ticket(...)`: named consumer consumes an authorization once.
- `close_expired(...)`: principal recovers unused GEN after expiry.
- `withdraw_credit()`: credit owner withdraws the exact ledger amount.

Views:

- `get_lease`, `get_action`, `get_attempt`, `get_ticket`
- `get_credit`, `get_action_id`, `get_accounting`

The full state model, safety rows, Evidence Authority Matrix, value destination
matrix, threat model, and claim-to-code mapping are in
[`docs/README.md`](docs/README.md).

## Verification

```powershell
npm install --ignore-scripts
& 'C:\path\to\python3.12.exe' -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
npm run check
.\.venv\Scripts\gltest.exe tests\
```

The verified local suite contains 50 tests: 46 direct/source tests and four
deployment-receipt parser tests. It covers semantic replay, malicious normalized
outputs, prompt injection, role isolation, duplicate operations, exact expiry
boundaries, retry bounds, accounting conservation, ticket consumption, refund,
and debit-before-transfer.

## Deployment

- `NETWORK = Studio Dev` (chain ID `61997`)
- `CONTRACT_ADDRESS = 0xAEb5A5F4ed4BCFF576D3cDa8e8A3d1d8f0e5E3B4`
- [Contract Explorer](https://explorer-studio-dev.genlayer.com/address/0xAEb5A5F4ed4BCFF576D3cDa8e8A3d1d8f0e5E3B4)
- [Successful deploy transaction](https://explorer-studio-dev.genlayer.com/transactions/0xb60ad373b33295163751b294934f0b9c51e48f9a79b733455ef801a439a64281)

The sanitized deploy record shows `FINALIZED`, `Result: SUCCESS`, and
`FINISHED_WITH_RETURN`; a fresh `get_accounting` read returned zero for all four
ledger totals.

### Real worked lifecycle

Input:

- Principal funded lease `semantic-demo-582f1e3` with exactly 2 GEN.
- `rotate-key`: rotate and revoke the service signing credential.
- `replace-key`: paraphrase the same effect using different wording.
- `publish-notes`: publish release notes, a distinct in-policy effect.

Finalized output:

- `rotate-key -> AUTHORIZED`; ticket consumed; agent credited 1 GEN.
- `replace-key -> REPLAY_DENIED`, replaying `rotate-key`; no value moved.
- `publish-notes -> AUTHORIZED`; ticket consumed; agent credited 1 GEN.
- Lease `EXHAUSTED`; agent withdrew 2 GEN through the EOA transfer boundary.
- Accounting: received 2 GEN, locked 0 GEN, credits 0 GEN, withdrawn 2 GEN.

See the sanitized [deployment evidence](docs/evidence/studio-dev/deployment.json)
and [lifecycle evidence](docs/evidence/studio-dev/lifecycle.json). An earlier
revision is explicitly archived as `ABANDONED_TESTNET`; its EOA transfer used
the wrong boundary, so it receives no further value and is not the active
deployment.

## Honest limits

SemanticNonce authorizes a bounded action description; it does not prove a
downstream tool actually executed or succeeded. The consumer must enforce its
own side-effect idempotency. V1 supports one agent, one consumer, two funded
novel actions, six total submissions, and two review attempts per action.

The current verification revision records native contract balance **2 GEN
before withdrawal and 0 GEN after**, plus the exact 2 GEN agent transfer and
recipient balance snapshots. [Fresh read-only verification](docs/evidence/studio-dev/reverification.json)
binds every successful receipt, semantic decision, ticket and accounting view
to the deployed source. Re-run it with `node scripts/verify-studio-dev.mjs`.
The previous successful revision is preserved with zero-liability closure
proof; the original broken revision remains explicitly abandoned.
