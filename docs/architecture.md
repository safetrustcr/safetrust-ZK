# SafeTrust ZK — System Architecture

> Full design doc (ZK-022). Expanded in Phase 5.

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (dApp-SafeTrust / demo)                           │
│  Freighter wallet · SafeTrustZK SDK · TrustlessWork hooks   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  ZK Layer (safetrust-zk) ★ THIS REPO                      │
│  Noir circuits · proof generation · view keys · Soroban   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Stellar / TrustlessWork (backend-SafeTrust)                │
│  Smart contracts · webhook callbacks · Hasura/PG            │
└─────────────────────────────────────────────────────────────┘
```

## ZK Pipeline

| Step | Circuit | Trigger | Writes to |
|------|---------|---------|-----------|
| 1 | `proof_of_funds` | Guest creates booking | `escrow_metadata.zk_proof_hash` |
| 2 | `private_escrow` | TrustlessWork callback | `escrow_metadata.zk_amount_commitment` |
| 3 | `milestone_release` | Host triggers 70%/30% release | `escrow_milestones.metadata.zk_release_proof` |

## View Key Pattern

Booking amounts are encrypted with a ChaCha20 key derived via ECDH between guest and host. The guest, host, and designated auditor can reconstruct amounts — the public chain sees only Pedersen commitments.

See [integration-guide.md](./integration-guide.md) for drop-in dApp instructions.
