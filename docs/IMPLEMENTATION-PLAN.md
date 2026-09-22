# SemanticNonce implementation plan

## Outcome and scope

Build, verify, deploy, document, and publish one contract-only GenVM v0.3
Intelligent Contract that enforces a two-unit semantic authorization lease.
No frontend, Vercel project, external custody, cross-chain flow, or Portal
submission action is in scope.

## Ordered tasks and acceptance checks

1. Lock the current official header/API/runner unit in an isolated minimal
   lint probe, then use exactly that unit in `contracts/semantic_nonce.py`.
   Acceptance: installed `genvm-lint check` recognizes the project-specific
   `SemanticNonce` class.
2. Add direct tests first for storage/state, role isolation, exact 2 GEN
   payability, temporal boundaries, semantic comparator, settlement invariants,
   recovery, tickets, credit, and withdrawal. Acceptance: each behavior test
   initially fails for the missing implementation rather than a broken fixture.
3. Implement only the six writes and eight views specified in
   `docs/README.md`, preserving every safety row and value destination.
   Acceptance: focused tests pass and contract source remains ASCII-only.
4. Add deployment receipt parser fixtures and safe Studio Dev scripts with
   inspect/deploy/resume/lifecycle operations. Acceptance: raw and normalized
   receipt fixtures pass; scripts emit allowlisted fields only.
5. Run the required local gate: semantic lint, all direct/deployment tests,
   source/metadata checks, and `npm run check`. Acceptance: nonzero intended
   test count, no skip on a critical path, exit code 0.
6. Run a bounded Studio Dev deployment and consensus smoke, verify successful
   execution/schema/code/canonical reads, then execute the 2 GEN lifecycle
   idempotently. Acceptance: novel/replay/distinct decisions, ticket
   consumption, 2 GEN withdrawal, recipient balance evidence, and zero
   liability are all canonical.
7. Audit claims and public hygiene, create meaningful commits, publish the
   child repository, verify CI/URLs, and run the objective precheck.
   Acceptance: no secret/control file, public URL reachable, and precheck
   prints `NO BLOCKER` for `intelligent-contracts` with the verified Explorer
   address.
8. Re-read the master prompt and audit every phase, gate, directive, matrix,
   command, and evidence item before preparing the copy-ready Portal fields.

## Material risks

- Official header examples currently differ on whether a pragma precedes the
  same v0.3 runner. Resolve with current Studio template, semantic lint, and a
  bounded smoke; never mix v0.2 imports with v0.3 runtime.
- Direct mode runs the leader only. Pure comparator/malicious-output tests and
  real Studio Dev consensus evidence are both mandatory.
- Live fees are real on Studio Dev. Read balances/estimate before any write,
  reuse existing authorized EOAs, and never retry an ambiguous value action
  before reading status and resulting state.
