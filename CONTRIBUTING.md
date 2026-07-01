# Contributing to SafeTrust ZK

Thank you for contributing to the SafeTrust zero-knowledge privacy layer.

## Development Setup

1. Install prerequisites (see [README.md](./README.md#prerequisites)).
2. Clone the repo and run `pnpm install` at the root.
3. Install Noir: `noirup` (requires Nargo >= 0.30).
4. Compile circuits: `make compile-all`.

## Issue Labels

| Label | Layer |
|---|---|
| `circuit` | Noir circuits in `circuits/` |
| `sdk` | TypeScript SDK in `sdk/` |
| `contracts` | Soroban verifier in `contracts/` |
| `demo` | Next.js demo app in `demo/` |
| `chore` | Tooling, CI, docs |

## Branch & Commit Style

Follow the SafeTrust [Git Guidelines](https://github.com/safetrustcr/dApp-SafeTrust/issues/35):

- Branch: `feat/zk-005-proof-of-funds` or `chore/zk-001-workspace-bootstrap`
- Commits reference roadmap tickets where applicable: `feat(circuit): proof_of_funds range proof (#ZK-005)`

## Pull Request Checklist

- [ ] Circuits compile: `make compile-all`
- [ ] SDK builds: `pnpm --filter @safetrust/zk-sdk build`
- [ ] Soroban contract builds: `cd contracts/escrow_verifier && cargo build`
- [ ] Tests pass for changed packages
