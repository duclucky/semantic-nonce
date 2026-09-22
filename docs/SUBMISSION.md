# Portal submission

## Title

SemanticNonce - Meaning-Level Replay Protection

## Category

Intelligent Contracts

## Description

SemanticNonce is a reusable two-unit execution lease that stops autonomous agents from earning twice or consuming extra authorization by paraphrasing an already approved action. A principal locks 2 GEN; each in-scope novel action opens a one-time consumer ticket and a fixed 1 GEN agent credit, while semantic replays move no value. GenLayer's custom validator independently re-runs the bounded policy/history review and agrees on the meaning of scope, novelty, coverage, and the exact replay target - not JSON wording or rationale text. Contract code derives every ticket, payee, and amount. Tool gateways, DAO proposal intake, and paid AI/oracle brokers can reuse the same interface. The repository includes a full specification, safety matrices, 28 tests, sanitized Studio Dev lifecycle evidence, and deployment at 0xD7CE68322ba69D2e4629A5F5801E560C34BdDD96.

## Evidence URL

https://github.com/duclucky/semantic-nonce

## Contract Address

0xD7CE68322ba69D2e4629A5F5801E560C34BdDD96

## Explorer Deploy Tx URL

https://explorer-studio-dev.genlayer.com/transactions/0xcf4c56abe790e5de5e62ad1dae7ee370247b2e40d2c876d2d24b61cceea8729f

## Contract Explorer URL

https://explorer-studio-dev.genlayer.com/address/0xD7CE68322ba69D2e4629A5F5801E560C34BdDD96

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
