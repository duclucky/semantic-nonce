# Portal submission

## Title

SemanticNonce - Meaning-Level Replay Protection

## Category

Intelligent Contracts

Description character count: **861** (excluding the trailing file newline).

## Description

SemanticNonce is a reusable two-unit execution lease that stops autonomous agents from earning twice or consuming extra authorization by paraphrasing an already approved action. A principal locks 2 GEN; each in-scope novel action opens a one-time consumer ticket and a fixed 1 GEN agent credit, while semantic replays move no value. GenLayer's custom validator independently re-runs the bounded policy/history review and agrees on the meaning of scope, novelty, coverage, and the exact replay target - not JSON wording or rationale text. Contract code derives every ticket, payee, and amount. Tool gateways, DAO proposal intake, and paid AI/oracle brokers can reuse the same interface. The repository includes a full specification, safety matrices, 50 tests, sanitized Studio Dev lifecycle evidence, and deployment at 0xAEb5A5F4ed4BCFF576D3cDa8e8A3d1d8f0e5E3B4.

## Evidence URL

https://github.com/duclucky/semantic-nonce

## Contract Address

0xAEb5A5F4ed4BCFF576D3cDa8e8A3d1d8f0e5E3B4

## Explorer Deploy Tx URL

https://explorer-studio-dev.genlayer.com/transactions/0xb60ad373b33295163751b294934f0b9c51e48f9a79b733455ef801a439a64281

## Contract Explorer URL

https://explorer-studio-dev.genlayer.com/address/0xAEb5A5F4ed4BCFF576D3cDa8e8A3d1d8f0e5E3B4

## Network

Studio Dev (chain ID 61997)

## Worked lifecycle

A 2 GEN lease authorized `rotate-key`, rejected the differently worded
`replace-key` as a replay of `rotate-key` without moving value, then authorized
`publish-notes`. Both tickets were consumed. The agent withdrew exactly 2 GEN;
final accounting was 2 GEN received, 0 GEN locked, 0 GEN credits, and 2 GEN
withdrawn.

The Evidence field takes the GitHub repository URL. The owner submits this block
at portal.genlayer.foundation under Builder -> Intelligent Contracts and ticks
the reCAPTCHA; this repository does not claim that final submission action.

## Lifecycle evidence and CI

- Lifecycle: https://github.com/duclucky/semantic-nonce/blob/main/docs/evidence/studio-dev/lifecycle.json
- Fresh verification: https://github.com/duclucky/semantic-nonce/blob/main/docs/evidence/studio-dev/reverification.json
- Successful source/evidence CI: https://github.com/duclucky/semantic-nonce/actions/runs/37304031115
- CI workflow: https://github.com/duclucky/semantic-nonce/actions/workflows/check.yml

Only one contract source is submitted. Historical deployment revisions are
archived network evidence, not additional contract primitives.
