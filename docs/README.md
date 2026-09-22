# SemanticNonce specification

## Identity

- Idea ID: `IDEA-032`
- Project name: SemanticNonce
- Project slug: `semantic-nonce`
- Category: `Intelligent Contracts`
- Status: `BUILDING` only after this specification gate passes
- Repository: child Git repository `semantic-nonce`; public URL pending Phase 9
- Target network: Studio Dev, chain ID 61997

## One-sentence product hook

SemanticNonce lets a principal fund exactly two distinct agent actions while
GenLayer validators block freshly worded semantic replays before they can earn
a ticket or 1 GEN credit.

## Trust problem

- Decision that must not depend on one party: whether a candidate agent action
  is inside one locked authorization and represents a new effect rather than a
  paraphrase of an already consumed effect.
- Why a database/ordinary EVM/backend LLM is insufficient: deterministic code
  can reject an identical nonce or digest, but it cannot compare the meaning of
  differently worded effects. A backend LLM restores unilateral control to the
  operator who decides agent access and payment.
- Value/rights/access at risk: a two-unit 2 GEN execution purse, two one-time
  action tickets, and downstream permission to attempt an irreversible tool
  action.

## Fingerprint

- Trust problem: neutral meaning-level replay classification before access and
  payment.
- Actors/adversary: a principal funds two distinct effects; a named agent can
  profit by paraphrasing one consumed effect; a named consumer must consume a
  ticket once before acting.
- Evidence class + authenticity mechanism: bounded policy, role, action,
  history, ticket, attempt, and accounting records authored through
  role-checked wallet transactions and stored canonically by lease ID.
- Consensus question: is the candidate `IN_SCOPE` or `OUT_OF_SCOPE`; if in
  scope, is it `NOVEL` or a `REPLAY` of exactly one prior authorized action?
- State machine: lease `ACTIVE -> EXHAUSTED | EXPIRED_CLOSED`; action
  `SUBMITTED -> AUTHORIZED | REPLAY_DENIED | OUT_OF_SCOPE | RETRYABLE`;
  ticket `OPEN -> CONSUMED | EXPIRED`.
- Direct consequence: only `IN_SCOPE/NOVEL` consumes one budget unit, opens a
  one-time ticket, and credits 1 GEN to the agent. Expiry refunds every unused
  GEN unit to the principal.
- Reuse surface: lease, action, attempt, ticket, credit, liability, and
  consumer-only ticket methods for agent gateways, DAO intake, and paid
  AI/oracle brokers.

## Mandatory gate matrix

| Gate | PASS/FAIL | Evidence/reason |
| --- | --- | --- |
| Replacement | PASS | A database can count IDs but leaves semantic equivalence, access, and payment under one classifier. |
| Judgment | PASS | Scope and effect equivalence across paraphrases cannot be reduced to deterministic byte/hash equality. |
| Evidence availability | PASS | Every validator receives bounded policy, candidate, and complete prior authorized history from canonical state; a readiness check separates missing input from model failure. |
| Evidence authenticity | PASS | Principal and agent transactions are authoritative for their own contractual representations and bind lease/action/revision/digest/history/attempt/deadline. External execution is never claimed. |
| Equivalence | PASS | Independent validators must agree on scope, novelty, and exact replay target ID; rationale wording is ignored. |
| Consequence | PASS | `IN_SCOPE/NOVEL` alone consumes budget, grants a ticket, and credits 1 GEN; expiry returns unused GEN. |
| Adversarial | PASS | The agent benefits from replay-as-novel; the principal benefits from avoiding duplicate payment and could prefer novel-as-replay. |
| State model | PASS | Per-lease isolation, immutable policy, append-only actions/attempts, direct clock guards, one-time tickets, debit-before-transfer, and full expiry recovery are specified. |
| Reuse | PASS | Three downstream consumers use stable public methods without forking the judge. |
| Contract count | PASS | One contract owns authority, history, tickets, purse, credits, recovery, and withdrawal; a second contract would be pass-through. |
| Differentiation | PASS | Sequential history-aware authorization consumption differs from GrantLattice attenuation, ConcordBatch scheduling, Disclosure Dividend overlap payout, and SkillSlot matching on at least four fingerprint fields. |
| Claim-to-code | PASS | The matrix below maps every retained claim to a method/state, canonical view, direct test, and required Studio Dev proof. |
| Full lifecycle | PASS | The planned lifecycle funds 2 GEN, authorizes novel A, denies paraphrased A without accounting change, authorizes novel B, consumes both tickets, withdraws 2 GEN, and reads zero liability. |
| Scope honesty | PASS | The contract does not prove external execution, replace sink idempotency, authenticate offchain effects, or claim adoption. |

One failed gate requires redesign or rejection; scores cannot compensate.

## Actors, roles, and incentives

| Actor | Permissions | Value at risk | Incentive to bias |
| --- | --- | --- | --- |
| Principal | Create one lease with exactly 2 GEN; choose agent/consumer/policy/expiry; close after expiry; withdraw own refund credit | Up to 2 GEN purse | Avoid duplicate payment; may prefer a distinct action be treated as replay |
| Agent | Submit bounded actions; request/retry review; withdraw earned credit | Up to two fixed 1 GEN credits and action access | Present a consumed effect with fresh wording to obtain another ticket/credit |
| Consumer | Read and consume an authorized ticket once before downstream execution | Reliability of downstream side effects | Bypass or double-consume a ticket for convenience |
| GenLayer validators | Independently classify exact canonical inputs | Consensus integrity | A malicious leader may invent scope, novelty, target IDs, payees, or amounts |

## Scope and non-goals

### In scope

- Two-unit semantic action authorizations funded with exactly 2 GEN.
- Meaning-level comparison against at most two previously authorized actions.
- Complete deterministic validation of IDs, digests, enums, replay target, and
  settlement invariants before hard state or value changes.
- One-time consumer tickets, pull credits, expiry refund, and zero-liability
  accounting.

### Out of scope

- Proving that a downstream tool call executed or succeeded.
- Replacing a payment processor's or tool server's own idempotency guarantee.
- Private evidence, personal data, arbitrary web crawling, legal conclusions,
  reputation scoring, or cross-chain settlement.
- More than two funded novel actions, multiple agents/consumers per lease,
  appeals, and external callbacks in v1.
- A user-facing application, frontend, or Vercel deployment.

## Product/frontend blueprint

Not applicable to the locked `Intelligent Contracts` category. No user-facing
screen, control, browser lifecycle, visual system, or hosted application is
claimed. Integration proof is contract source, direct tests, canonical views,
scripts, sanitized Studio Dev lifecycle evidence, and Explorer links.

## State model

### Stable IDs

- `lease_id`: caller-supplied ASCII identifier, 1-64 characters, globally
  unique.
- `action_id`: caller-supplied ASCII identifier, 1-64 characters, unique
  within a lease.
- `attempt_id`: deterministic `lease_id:action_id:<attempt_number>`.
- `policy_digest`, `action_digest`, and `history_digest`: lowercase SHA-256
  hex over exact contract-defined canonical strings; they bind bytes but do
  not claim external truth.

### Structured storage

- `TreeMap[str, LeaseRecord] leases`
- `TreeMap[str, ActionRecord] actions`, keyed by `lease_id:action_id`
- `TreeMap[str, AttemptRecord] attempts`, keyed by `attempt_id`
- `TreeMap[str, str] lease_action_ids`, keyed by `lease_id:<index>` for bounded
  ordered history
- `TreeMap[str, bigint] credits`, keyed by lowercase address string
- `TreeMap[str, bigint] lease_liability`, plus global received, credited,
  withdrawn, and locked accounting totals
- Persisted money is `bigint` base units; every public document and demo labels
  it as GEN. `GEN_SCALE = 10**18`, and v1 receives exactly 2 GEN.

### State machine

```text
create_lease/principal + exactly 2 GEN -> lease ACTIVE
ACTIVE --submit_action/named agent before expiry--> action SUBMITTED
SUBMITTED|RETRYABLE --review_action/any caller before expiry-->
  AUTHORIZED | REPLAY_DENIED | OUT_OF_SCOPE | RETRYABLE
AUTHORIZED --consume_ticket/named consumer before expiry--> CONSUMED
ACTIVE --second AUTHORIZED result--> EXHAUSTED
ACTIVE --close_expired/principal at-or-after expiry--> EXPIRED_CLOSED
credit > 0 --withdraw_credit/credit owner--> external transfer, credit zero
```

### Temporal entrypoint rules

- Canonical transaction-time source: normalized GenVM message datetime, stored
  and compared as UTC epoch seconds (`bigint`).
- Default interval: creation requires `now < expires_at <= now + 30 days`;
  action submission, semantic review, and ticket consumption require
  `now < expires_at`; equality is late. Expiry close requires
  `now >= expires_at`; equality is expired.
- Entrypoint-local guards: `create_lease`, `submit_action`, `review_action`,
  `consume_ticket`, and `close_expired` each read/validate time before any
  mutation, credit, transfer, or nondeterministic call. A stale `ACTIVE` phase
  never authorizes a late call.
- Recovery conditions: only the principal can close; lease must still be
  `ACTIVE`; expiry must have occurred; unresolved/retryable actions receive no
  credit; every unused 1 GEN unit becomes principal credit once; every open
  ticket becomes `EXPIRED`; duplicate close rejects.

### Illegal transitions

- Duplicate lease/action IDs; action from a non-agent; action after expiry.
- More than six submitted actions, more than two semantic review attempts per
  action, or more than two authorized novel actions.
- Review of a terminal action, review after expiry, or retry after two attempts.
- Replay target outside the same lease's prior authorized history.
- Ticket consumption by a non-consumer, twice, before authorization, after
  expiry, or after lease closure.
- Close before expiry, by a non-principal, after exhaustion/closure, or twice.
- Withdrawal with zero credit or any transfer before ledger debit.

### Authorization

- `create_lease`: any valid principal address through its signed transaction.
- `submit_action`: exact named agent only.
- `review_action`: permissionless liveness call after deterministic readiness
  checks; it cannot choose value destinations.
- `consume_ticket`: exact named consumer only.
- `close_expired`: exact principal only.
- `withdraw_credit`: only the caller's own credit.

### Idempotency and double-action prevention

- Lease and action IDs are unique and immutable.
- One pending action per lease at a time; terminal denied actions stay in
  append-only history but never enter authorized semantic history.
- Attempt numbers increment once per successful review result and are capped at
  two; only explicit `RETRYABLE` may be reviewed again.
- Budget decrements only after all normalized settlement invariants pass.
- Ticket consumption is one-way and one-time.
- Close credits only the remaining locked amount and then zeroes it.
- Withdrawal copies amount, zeroes credit and liability, then emits transfer.

## Write-method safety matrix

| Method | Caller | Allowed states | Forbidden states | Temporal/expiry gate | Idempotency | Value/accounting effect | Views affected | Negative tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `create_lease` | New principal (`gl.message.sender`) | Unique lease ID; valid distinct agent/consumer; bounded policy; exactly 2 GEN | Existing ID; invalid roles/policy/value/expiry | `now < expiry <= now + 30d`; equality at `now` is invalid | Duplicate ID rejects before value accounting | `received += 2 GEN`, `locked += 2 GEN`, lease liability `2 GEN` | lease, accounting, credit | duplicate; 0/1 GEN; bad role; empty/oversize policy; expiry `now-1/now/now+1`; over max; unchanged on reject; payable metadata |
| `submit_action` | Named agent | Lease `ACTIVE`; no pending action; fewer than six actions | Wrong caller; `EXHAUSTED`; `EXPIRED_CLOSED`; duplicate ID; pending action | `now < expiry`; equality is late even if phase stale | Unique action ID/revision; duplicate rejects | No GEN movement; append action and update history digest | lease, action, action list, accounting | wrong caller/state; duplicate; empty/oversize; expiry-1/exact/+1 with stale `ACTIVE`; accounting unchanged |
| `review_action` | Any caller | Action `SUBMITTED` or `RETRYABLE`; lease `ACTIVE`; attempt < 2; complete canonical input | Terminal action; exhausted/closed lease; malformed history; attempt cap | `now < expiry`; equality is late even if states stale | Terminal decisions reject replay; only `RETRYABLE` may create next attempt | Novel: locked/liability `-1 GEN`, agent credit `+1 GEN`, budget `-1`, ticket opens; replay/out-of-scope/retry: zero value | lease, action, attempt, ticket, credit, accounting | wrong state; boundary-1/exact/+1; bad enum/ID/digest/coverage; missing/extra replay target; malicious payee/amount; duplicate settlement; accounting unchanged on rejection |
| `consume_ticket` | Named consumer | Action `AUTHORIZED`, ticket `OPEN`, lease `ACTIVE` or `EXHAUSTED` | Wrong caller; denied/retryable; consumed; closed/expired | `now < expiry`; equality is late even if ticket remains `OPEN` | First call sets consumed; second rejects | No GEN movement; consumes execution right once | action, ticket, lease | wrong caller/state; duplicate; expiry-1/exact/+1 with stale ticket; accounting unchanged |
| `close_expired` | Principal | Lease `ACTIVE` at/after expiry | Wrong caller; pre-expiry; `EXHAUSTED`; `EXPIRED_CLOSED` | `now >= expiry`; equality is expired | Credits remaining liability once, zeroes locked amount, closes once | Locked/liability decrease by remaining 0-2 GEN; principal credit increases equally; open tickets marked expired | lease, actions/tickets, principal credit, accounting | wrong caller/state; expiry-1/exact/+1; pending/retryable action; second close; exact refund; no double credit; invariant |
| `withdraw_credit` | Credited caller | Caller credit > 0 | Zero credit; transfer already initiated for same ledger amount | N/A: withdrawal legality is independent of lease time after credit exists | Debit credit/liability before external transfer; zero credit rejects duplicate | `credits[caller]=0`, liability and credited totals decrease, withdrawn total increases, then exact EOA transfer | credit, accounting | zero credit; agent/principal isolation; double withdraw; finalized/closed lease does not recreate credit; transfer amount/invariant |

No write method may be implemented outside these rows.

## Frontend lifecycle coverage matrix

Not applicable: the locked track is contract-only and claims no browser action.
Scripts and canonical reads cannot be presented as frontend evidence.

## Evidence policy

- Authoritative sources: canonical SemanticNonce contract state only in v1.
- Provenance/authentication: `gl.message.sender` role checks for principal,
  agent, and consumer transactions; contract-authored attempt/ticket/accounting
  records.
- Authorized attestor/signer: principal for authorization policy and roles;
  named agent for candidate action; contract code plus GenLayer consensus for
  decisions and consequences.
- Anti-replay event/digest identity: unique lease/action/attempt IDs, immutable
  revisions, SHA-256 canonical digests, current complete history digest, and
  one-time ticket state.
- Signed timestamp bounds: transaction time is checked against immutable lease
  expiry; no offchain signed timestamp is accepted.
- Immutable policy/source version URLs and hashes: no URL source in v1; exact
  stored policy text and digest are immutable after lease creation.
- Allowed schemes/domains/paths: N/A because no web fetch is allowed in v1.
- Time/window rules: creation and all action/review/consume writes use the
  explicit intervals above.
- Size/count bounds: policy 1-2,000 characters; action 1-800 characters;
  IDs 1-64 ASCII characters; six total actions; two authorized actions; two
  attempts per action; two prior authorized actions in the prompt.
- Missing evidence: deterministic rejection before nondeterminism.
- Contradictory evidence: impossible role/digest/history combinations reject;
  semantic ambiguity returns non-penalizing `RETRYABLE`.
- Unavailable source: N/A for web; LLM/runtime inability cannot create a hard
  consequence and results in failed consensus or `RETRYABLE`.
- Invalid/unverifiable attestation: revert or explicit `RETRYABLE`, with GEN,
  budget, ticket, credit, and hard state unchanged.
- Canonical objective/policy source and hash: immutable lease policy state.
- Workflow/entity, step/requirement, actor/subject binding: lease ID, action ID,
  policy digest, agent, consumer, revision, attempt, prior history digest.
- Prompt-injection boundary: policy/action text is labeled untrusted
  contractual data. It cannot redefine role authority, output schema, allowed
  enums, replay target set, payee, amount, budget, destination, or consequence.
- Private/unverifiable evidence excluded: private logs, screenshots,
  claimant-hosted JSON, receipts, and external execution assertions.

### Evidence Authority Matrix

| Consequential claim/fact | Evidence/artifact | Data controller | Authoritative source/issuer | Deterministic verification | Canonical objective/entity/actor binding | Freshness/anti-replay | Semantic role after verification | Non-penalizing failure state | Consequence blocked | Required negative test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| One policy, agent, consumer, expiry, two-unit budget, and 2 GEN purse govern a lease | Stored lease from principal transaction | Principal controls initial bytes only | Principal wallet transaction plus immutable state | Sender; valid roles; bounded policy; future/max expiry; exact 2 GEN | Network, contract, lease, principal, agent, consumer, policy revision/digest | Unique lease; immutable; fixed expiry | Canonical authority and settlement identities only | Revert before record/value move | All submission, review, tickets, budget, credits, refund | Valid bytes/digest from wrong sender/lease/role/value/expiry leaves state/accounting unchanged |
| Candidate action belongs to the named agent under the exact lease | Stored action from agent transaction | Named agent controls action bytes | Exact sender role | Sender, lease/action/revision, size/digest, active state, current history digest | Contract, lease, action, agent, policy digest, revision | Unique action/revision; before expiry; no replayed ID | Bounded action meaning only | Revert with no hard-state/value change | Review and every consequence | Hash-valid bytes from wrong actor/lease/revision/history cannot create action or affect accounting |
| Prior actions are the complete authorized semantic history | Append-only authorized actions and ticket state | Contract code only after consensus | Canonical contract state | Exact count/IDs/digests/decisions/ticket states and recomputed history digest | Same lease/policy/agent; exact prior IDs | Append-only; bound to current attempt | Only allowed replay target set | Revert or `RETRYABLE` | Budget, ticket, agent credit | Missing/extra/foreign/duplicate prior ID or bad history digest leaves hard state/accounting unchanged |
| Verdict covers scope, novelty, and replay target meaning | Leader output plus validator replay | Leader proposes; validators independently re-evaluate | GenLayer validator consensus | Enums; exact IDs/digests; NOVEL target empty; REPLAY target exactly one prior authorized ID; OUT_OF_SCOPE target empty; code derives consequence | Lease, policy, action, agent, attempt, history digest | Current submitted/retryable attempt only; max two | Semantic classification only; no payee/amount authority | Revert or `RETRYABLE` with no consequence | Ticket, budget decrement, credit, settlement | Shape-valid wrong ID/digest/coverage/target, semantic disagreement, or invented payee/amount leaves accounting unchanged |

## Consensus design

### Leader task

- Inputs: immutable policy; candidate ID/text/digest; exact ordered list of up
  to two prior authorized action IDs/texts/digests; lease/action/history
  digests; locked enum/schema instructions.
- Fetch: none. All inputs are captured from storage before the no-argument
  nondeterministic function.
- Extraction: model identifies authorized objective/target/effect boundaries
  and compares the candidate's primary intended effect to prior effects.
- Normalization: strip unsupported keys; uppercase allowed enum fields; reject
  unknown IDs; deterministic code validates complete cross-field invariants.
- Structured output: `lease_id`, `action_id`, `policy_digest`,
  `history_digest`, `coverage`, `scope`, `novelty`, `replay_of`, and bounded
  `reason`.

### Consensus-critical fields

| Field | Type/bounds | Comparison rule | Why critical |
| --- | --- | --- | --- |
| `lease_id`, `action_id` | Exact existing IDs | Exact equality and contract-state match | Prevent cross-entity replay |
| `policy_digest`, `history_digest` | 64-char lowercase hex | Exact equality and deterministic recomputation | Bind exact authority and prior set |
| `coverage` | `COMPLETE` or `INSUFFICIENT` | Exact enum equality | Hard consequence requires complete source coverage |
| `scope` | `IN_SCOPE`, `OUT_OF_SCOPE`, `UNVERIFIABLE` | Independent validators must agree exactly | Controls whether authorization may be consumed |
| `novelty` | `NOVEL`, `REPLAY`, `NOT_APPLICABLE`, `UNVERIFIABLE` | Independent validators must agree exactly | Controls budget/ticket/payment |
| `replay_of` | Empty or one exact prior authorized action ID | Exact equality plus cross-field invariant | Prevent invented/ambiguous replay target |

### Validator

- Independent evidence/replay: validator reruns the same bounded semantic task
  over the exact canonical policy, candidate, and authorized history captured
  outside the nondeterministic block.
- Semantic rule: return true only when leader and validator agree on every
  critical field above. Different scope, novelty, coverage, or replay target
  decisions must return false; reason wording may differ.
- Rejection conditions: leader is not `gl.vm.Return`; parse/type failure;
  unknown enum/ID; wrong digest; extra/missing/duplicate target; incomplete
  coverage for a hard consequence; invalid cross-field combination; model
  attempts to choose payee, amount, budget, consumer, or destination.
- `UNDETERMINED` handling: no canonical mutation is claimed. Tooling reads the
  current action/attempt state before any retry. An explicit accepted
  `UNVERIFIABLE/INSUFFICIENT` result records `RETRYABLE` and moves no value.

### Rationale policy

Rationale is bounded explanatory metadata, never an authority source or
equivalence field. It may vary between validators and cannot change enums,
IDs, accounting, payees, or destinations.

## Consequence and accounting

| Verdict | Canonical state change | Consumer action | Value movement |
| --- | --- | --- | --- |
| `COMPLETE + IN_SCOPE + NOVEL` | Action `AUTHORIZED`; ticket `OPEN`; remaining budget decremented; lease becomes `EXHAUSTED` at zero | Named consumer may consume once before expiry | Exactly 1 GEN moves from locked lease liability to named agent credit |
| `COMPLETE + IN_SCOPE + REPLAY` | Action `REPLAY_DENIED`; prior ID recorded | No ticket | None |
| `COMPLETE + OUT_OF_SCOPE + NOT_APPLICABLE` | Action `OUT_OF_SCOPE` | No ticket | None |
| `INSUFFICIENT` or `UNVERIFIABLE` | Action `RETRYABLE`; attempt appended | May review once more before expiry | None |
| Expiry while lease `ACTIVE` | Lease `EXPIRED_CLOSED`; open tickets marked expired | No further consume/review/submit | Remaining 0-2 GEN becomes principal credit |

- Accepted/finalized boundary: state changes are usable only from a successful
  finalized Studio Dev transaction and fresh canonical reads; `FINALIZED`
  without successful execution is not evidence.
- Ledger invariant: `total_received = total_locked + total_credits +
  total_withdrawn`, all nonnegative. Per lease: `received = locked_remaining +
  agent_credits_created + principal_refund_created`.
- Child-message/transfer evidence: withdrawal debits ledger first, emits the
  exact EOA transfer, and requires receipt plus recipient balance evidence.
- Withdrawal/settlement: only caller-owned pull credit; zero credit rejects;
  no arbitrary amount or recipient input.
- Cure/appeal/restore: no appeal in v1. One retry is allowed only after an
  explicit non-penalizing `RETRYABLE` result and before expiry.

### Value-destination matrix

| Value item | Payer/source | Locked state | Release destination | Refund destination | Forfeit destination | Terminal states covered | Duplicate/late/retry behavior | Canonical proof view |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Two-unit lease purse (2 GEN) | Principal via payable `create_lease` | Per-lease `locked=2 GEN`; global `total_locked += 2 GEN` while `ACTIVE` | Exactly 1 GEN becomes named-agent credit for each accepted `IN_SCOPE/NOVEL` action; no model-selected amount or payee | Every unused GEN becomes principal credit through `close_expired` at/after expiry | None | `EXHAUSTED` after two novel actions; `EXPIRED_CLOSED` after refund; withdrawn credits reach zero liability | Duplicate lease rejects before accounting; denied/retryable reviews move zero; late submit/review/consume rejects; close credits once | `get_lease`, `get_credit`, `get_accounting` |
| Agent action credit (fixed 1 GEN each, max 2) | Reclassification of the lease purse after valid consensus | Pull-credit ledger under exact named agent; included in `total_credits` | Exact credited owner through `withdraw_credit`; ledger debited before EOA transfer | N/A: this is an earned credit after accepted semantic consequence and is not reclaimable by principal | None | Credit outstanding, then withdrawn; lease may be `ACTIVE` or `EXHAUSTED` | Replay/out-of-scope/retry creates no credit; duplicate terminal review rejects; zero-credit/double withdrawal rejects | `get_credit(agent)`, `get_accounting`, finalized transfer/balance evidence |
| Principal expiry refund credit (0-2 GEN) | Remaining lease purse | Pull-credit ledger under exact principal after `close_expired`; included in `total_credits` | Exact principal through `withdraw_credit`; ledger debited before EOA transfer | Same destination: principal owns the refund credit | None | `EXPIRED_CLOSED`, then withdrawn or still claimable | Pre-expiry/wrong-caller/duplicate close rejects; pending and retryable actions receive no credit; close can credit only remaining locked value once | `get_lease`, `get_credit(principal)`, `get_accounting`, finalized transfer/balance evidence |
| Transaction and message execution fees | Transaction sender, outside the contract purse/accounting | Network fee deposit, not SemanticNonce storage | Studio Dev fee mechanism and the explicitly budgeted EOA transfer message | Network-defined unused fee handling | Network-defined; never a contract payout | Every submitted transaction receipt | Not part of the 2 GEN lease purse; scripts estimate/budget messages and never label fees as contract credits | Sanitized transaction status/result plus sender balance evidence |

No value item has a claimant-selected destination, arbitrary payout amount, or
orphan-by-design terminal state. The archived broken Studio Dev revision is the
explicit broken-contract replacement exception and receives no further value.

## Reusable interface

### Write methods

- `create_lease(lease_id, agent, consumer, policy, expires_at)` payable exactly
  2 GEN.
- `submit_action(lease_id, action_id, action_text)` named agent only.
- `review_action(lease_id, action_id)` permissionless liveness trigger.
- `consume_ticket(lease_id, action_id)` named consumer only.
- `close_expired(lease_id)` principal-only expiry recovery.
- `withdraw_credit()` caller-owned pull payment.

### View methods

- `get_lease(lease_id)`
- `get_action(lease_id, action_id)`
- `get_attempt(lease_id, action_id, attempt_number)`
- `get_action_ids(lease_id)`
- `get_ticket(lease_id, action_id)`
- `can_consume(lease_id, action_id)`
- `get_credit(address)`
- `get_accounting()`

### Consumer/callback

- Authentication: no callback in v1. The locked consumer address calls
  `consume_ticket` directly.
- Idempotency key: `lease_id:action_id`; ticket state is one-way.
- Failure/retry: failed downstream execution is outside v1; consuming a ticket
  certifies only that the right was used. A later milestone may add an
  authenticated receipt without claiming it now.
- Authorized cancellation: no pre-expiry cancellation. Principal-only expiry
  close protects agent interests and refunds unused purse.

## Threat model

| Threat | Attack | Mitigation | Test |
| --- | --- | --- | --- |
| Fresh-ID semantic replay | Agent paraphrases an authorized transfer/action | Independent meaning comparison against full authorized history; exact replay target | Paraphrased transfer returns `REPLAY` and leaves budget/GEN/ticket unchanged |
| Principal censorship | Principal wants a distinct action labeled replay | Permissionless review and independent validator replay | Distinct effect returns `NOVEL` under swapped wording/order |
| Malicious leader | Valid-shape output invents ID, digest, payee, amount, or target | Exact IDs/digests/enums/cross-field settlement invariants; code derives value destinations | Each malicious shape reverts before mutation; accounting snapshot unchanged |
| Prompt injection | Policy/action tells model to pay attacker or redefine rules | Data delimiters, locked schema, authority statement, deterministic rejection | Injection text cannot alter critical fields or accounting |
| Cross-lease history | Leader cites a prior action from another lease | Replay target allowlist and history digest | Foreign replay target rejected |
| Stale phase/time | Late submit/review/consume while lease still `ACTIVE` | Entrypoint-local `now < expiry` guard | boundary -1/exact/+1 with stale phase; exact/+1 reject unchanged |
| Premature/duplicate recovery | Principal or stranger closes early/twice | Caller/state/time guard; zero-before-credit | wrong caller, early, exact, duplicate, zero-liability assertions |
| Double settlement | Review terminal action again or withdraw twice | Terminal-state guard; ledger debit before transfer | duplicate review/withdraw reject |
| Hidden orphaned value | No action or one action before expiry | Exact remaining purse refund | 0/1 authorized action expiry paths end with zero locked liability |

## Test plan

- Happy path: create 2 GEN lease, authorize two distinct actions, consume both
  tickets, withdraw 2 GEN, assert zero liability.
- Unauthorized: wrong principal assumptions, non-agent submit, non-consumer
  consume, non-principal close, credit isolation.
- Isolation: same action ID in different leases is isolated; foreign history
  cannot influence replay target.
- Evidence failure: missing/bad IDs, digest/history mismatch, incomplete
  coverage, malformed/unknown enums, attempt cap.
- Malicious leader: wrong lease/action/policy/history digest; extra/missing
  replay ID; invented amount/payee; valid shape with invalid meaning.
- Prompt injection: policy/action attempts to redefine authority, replay
  history, success, payee, amount, or destination.
- Semantic mismatch: leader `NOVEL` versus validator `REPLAY` returns false;
  different replay targets return false; rationale-only difference passes.
- Verdict classes: novel, replay, out-of-scope, retryable.
- Duplicate: lease, action, terminal review, ticket consume, close, withdrawal.
- Recovery/value safety: wrong caller/state, premature/exact/late expiry, open
  and retryable action, no double refund, unchanged rejected snapshots.
- Accounting/value: exact 2 GEN payability, 1 GEN fixed credits, one-action
  expiry refund, no-action expiry refund, debit-before-transfer, invariant
  after every transition.
- Cure/restore: N/A; one bounded retry test covers retryable review.
- Consumer enforcement: only named consumer, only open authorized ticket,
  before expiry, one time.
- Undetermined/retry: explicit retryable output moves no budget/GEN/ticket;
  second review allowed, third rejected.
- Deployment parser: raw Studio and normalized SDK success/failure fixtures.
- Metadata/AST: current header/API family, ASCII source, exactly one contract
  class, every `gl.message.value` use payable, custom validator compares
  meaning, and each temporal write references the clock guard.

## Claim-to-code matrix

| Product claim | Contract method/state | View/read | Direct test | Network evidence |
| --- | --- | --- | --- | --- |
| Principal funds exactly two semantic actions with 2 GEN | `create_lease`, lease purse/budget | `get_lease`, `get_accounting` | exact-value/payability/accounting tests | Successful deploy + 2 GEN create receipt + canonical lease/accounting read |
| Paraphrased prior effect is denied | `review_action` -> `REPLAY_DENIED` | `get_action`, `get_ticket`, `get_accounting` | semantic replay + malicious leader tests | Successful finalized replay review; no ticket/budget/credit delta reads |
| Distinct in-scope effect receives one ticket and 1 GEN credit | `review_action` -> `AUTHORIZED` | action/ticket/credit/accounting views | novel settlement and invariant tests | Successful finalized review + fresh views |
| Ticket is consumable once by the named consumer | `consume_ticket` | `get_ticket` (`OPEN`, `CONSUMED`, or `EXPIRED`) | caller/duplicate/time boundary tests | Finalized consume receipt + ticket read |
| Unused value cannot be orphaned | `close_expired` -> `EXPIRED_CLOSED` | lease/credit/accounting views | no-action and one-action refund tests | Required only if lifecycle leaves unused value; otherwise zero locked after two authorizations proves no remainder |
| Credits withdraw exactly once | `withdraw_credit` | `get_credit`, `get_accounting` | double-withdraw/debit-first tests | Finalized transfer, recipient balance delta, zero credit/liability |
| Validator checks meaning, not JSON shape | custom `run_nondet_default` validator | attempt/action views and source | pure semantic comparator, malicious valid-shape mismatch tests | Bounded Studio Dev consensus smoke with paraphrase and distinct effect |
| Contract is reusable without an app | public lease/action/ticket/credit API | all canonical views | interface/schema tests | Explorer schema/code plus documented script lifecycle |

No README/submission claim becomes complete until its network-evidence cell is
backed by the deployed revision.

## Analogue and differentiation matrix

| Analogue/prior idea | Similar dimensions | Structural difference | Collision decision |
| --- | --- | --- | --- |
| GrantLattice | Agent authority, canonical policy, access consequence | Parent-child attenuation graph versus sequential consumption of one meaning-level execution budget | Not duplicate (3/7 or fewer material matches) |
| ConcordBatch | Agent intents, canonical bytes, tickets/credits | One-shot three-intent conflict/order clearing versus candidate-to-history replay prevention across fresh IDs | Not duplicate (3/7 or fewer) |
| Disclosure Dividend | Semantic overlap and GEN consequence | Multi-report role clusters/reward apportionment versus pre-execution replay denial and fixed per-action lease consumption | Not duplicate (2/7 or fewer) |
| SkillSlot Clearing | Agent access and payment | Offer/request capacity market plus delivery settlement versus no market and no delivery claim | Not duplicate (2/7 or fewer) |
| CapLease / stateful server ledger | Durable authorization budget and replay resistance | Centralized canonicalizer/issuer assumptions versus opposed principal-agent incentives and replicated semantic judgment before onchain access/payment | Related prior art, not a registry duplicate; novelty claim limited to the decentralized semantic-consensus primitive |

## Deployment and evidence plan

- Network: Studio Dev only, chain ID 61997, locked RPC identity from `docs/09`;
  never label it testnet or mix Studionet evidence.
- Actors/wallet separation: reuse authorized existing EOAs from ignored config;
  principal and agent must differ; consumer may use the existing third
  authorized EOA. Never print keys. Funding is a separate idempotent step only
  if public balance reads show it is required.
- Deploy steps: lint/test exact source; estimate v0.6 fees; deploy; wait for
  finalization; verify successful execution, schema, code, source identity,
  address, and Explorer URL.
- Consequential lifecycle: create with 2 GEN; submit/review novel A; submit/
  review paraphrased A and prove no delta; consume A; submit/review novel B;
  consume B; withdraw 2 GEN; read zero locked/credit liability.
- Canonical reads: lease, all actions/attempts, tickets, credits, global
  accounting, deployed schema/code.
- Balance/receipt proof: safe allowlist of tx ID/status/result/timestamp,
  public addresses, value in human-facing GEN, and before/after balance delta;
  never full receipts/stdout/stderr/node config.
- Evidence path: `docs/evidence/studio-dev/`; one active deployment identity and
  archived superseded revisions.
- Resume/idempotency: inspect first; bind network/source commit/API family/
  address/lease/action IDs; never replay a finalized value step or hardcode the
  first attempt.

## Definition of Done

### Intelligent Contracts

- [ ] Reusable primitive.
- [ ] Semantic validator judgment.
- [ ] Direct consequence.
- [ ] Reuse proof through documented views and scripts.
- [ ] Adversarial tests.
- [ ] Real Studio Dev lifecycle.
- [ ] Canonical evidence.
- [ ] Public contract-focused repository and successful CI.
- [ ] Objective precheck reports `NO BLOCKER`.

### Projects

Not selected. No frontend, browser-wallet, live-app, or Vercel evidence is
required or allowed for this contribution.

## Honest limitations

- A ticket proves only the contract-granted right was consumed; it does not
  prove the external effect occurred or succeeded.
- Downstream consumers must enforce their own exact idempotency key and refuse
  actions without a fresh ticket.
- V1 supports one principal, one agent, one consumer, two funded novel actions,
  six total candidate submissions, and two review attempts per action.
- Semantic consensus can remain undetermined; that cannot create a ticket or
  move GEN.
- This is technical authorization infrastructure, not legal advice, an
  identity oracle, or production/adoption evidence.

## Kill criteria

- Current v0.3 runtime/linter cannot recognize the coherent official
  header/API unit.
- Independent validators cannot reliably distinguish the replay and distinct
  cases at the locked critical fields.
- Any valid-shape malicious result can move value or grant a ticket with a
  wrong ID/digest/replay target.
- Temporal/recovery tests reveal late admission, duplicate credit, orphaned
  value, or a nonzero terminal liability.
- Studio Dev cannot complete a bounded successful consensus smoke using the
  exact deployed source.
