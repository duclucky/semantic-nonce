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
