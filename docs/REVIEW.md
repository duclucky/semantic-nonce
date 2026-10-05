# Portal-bar review

## Verdict

- Meaning validator: PASS. Independent validators compare scope, novelty,
  coverage, exact replay target, entity IDs, and canonical digests. They do not
  compare JSON text or rationale wording.
- State design: PASS. One project-specific contract uses structured lease,
  action, attempt, ticket, and credit records with explicit phases and direct
  canonical views.
- Edge cases: PASS. Bad input, unauthorized roles, duplicate IDs, terminal
  replay, exhausted budget, model/schema failure, exact time boundaries, closed
  state, and zero credit raise or take a non-penalizing retry path.
- Safety rows: PASS. The six writes match the locked caller/state/time/value
  rows in the specification.
- Temporal gates: PASS. Every time-sensitive public write reads transaction
  time before mutation; equality is late for submit/review/consume and expired
  for close.
- Value and recovery: PASS on the active revision. Consequences follow semantic
  settlement invariants, credits are pull-based, ledger debit precedes EOA
  transfer, and duplicates cannot double-credit, double-consume, or
  double-withdraw.
- Reuse: PASS. Tool gateways, DAO intake, and paid AI/oracle brokers can consume
  the same lease/ticket interface.
- NO-APP: PASS. No frontend or hosted application exists or is claimed.

## Review-driven correction

The first Studio Dev revision exposed a transfer-boundary defect that direct
mode could not prove: `gl.chain.Account` resolves through the Intelligent
Contract boundary. Its withdrawal finalized with an execution error and state
remained unchanged at a 2 GEN credit. That revision is archived as
`ABANDONED_TESTNET` with no further value authorized. The active revision uses
an explicit `@gl.evm.contract_interface`, passed lint and all tests, then proved
the external transfer in a complete Studio Dev lifecycle with zero remaining
liability.

No additional public-behavior change is needed for v1.

## 2026-10-05 verification refresh

The contract source is unchanged. The live Studio Dev template still matches
its v0.3 pragma and concrete runner. A same-source revision was deployed from
clean commit `582f1e3728685ead29805391d7052a5718c18c58`; schema recognizes all
six writes and seven views. The prior successful revision is archived as
`SUPERSEDED_ZERO_LIABILITY`, with an actual zero native balance and zero
outstanding credit/locked accounting. The original broken revision retains
its honest abandonment status and receives no further value.

The current suite has 50 passing tests (46 direct/source, four receipt-parser).
Captured-validator cases reject changed scope, novelty, entity or digest
binding, and a novel leader proposal when independent replay finds a duplicate.
Different rationale wording passes. Additional cases cover creation expiry's
lower and 30-day upper boundaries, review expiry with stale phase, foreign
roles/leases, retry exhaustion, complete refunds and credit-owner isolation.
These controlled direct cases complement actual Studio Dev consensus;
they do not claim that mocked models are live validators.

The new 2 GEN lifecycle authorized key rotation, rejected its paraphrase
without an accounting delta, authorized distinct release notes, consumed both
tickets and withdrew exactly 2 GEN. Native contract balance was observed at
2 GEN immediately before withdrawal and 0 GEN afterward. The successful parent
records a 2 GEN transfer to the named agent. Recipient balance snapshots are
recorded separately because network execution fees affect the recipient's
net balance. All liability is zero.

Deployment tooling now binds pending recovery to source/network/hash,
records the actual replay accounting snapshots, rejects insufficient measured
fee deposits and redacts error payloads. The project precheck's expected
address follows the actual new revision and additionally requires the exact
native balance/transfer proof. No shared grading rule was changed or disabled.
No contract public behavior, frontend, Vercel surface, external execution proof,
external adoption or Portal submission is added or claimed.

All three semantic review receipts report `leader_only=false`, five initial
validators, `MAJORITY_AGREE`, and `FINALIZED`. The live lifecycle therefore
uses multi-validator consensus rather than a leader-only Studio simulation.
