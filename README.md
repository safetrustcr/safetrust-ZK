# SafeTrust ZK

> Zero-knowledge privacy layer for hospitality escrows on Stellar.

Booking amounts, wallet balances, and milestone releases are hidden inside Noir circuits. Only Pedersen commitments and proof hashes go on-chain — never raw numbers.

**[Stellar Hacks ZK Hackathon](https://dorahacks.io/hackathon/stellar-hacks-zk/detail) · Built on TrustlessWork · Powered by Noir / UltraHonk**

---

## The Problem

Every SafeTrust escrow today is fully transparent on Stellar:
- Competitors can see hotel pricing on-chain
- Guests expose travel spending patterns publicly
- Milestone amounts (70% check-in, 30% checkout) are visible to anyone

## The Solution

```
┌─────────────────────────────────────────────────────┐
│  🏠 Casa Stellar, San José CR · 150 USDC/night     │
│                                                     │
│  ① Prove Funds    → ✅ proof hash: 0xab12…         │
│     balance ≥ 450 USDC — balance never revealed     │
│  ② Private Escrow → ✅ commitment: 0xfe34…         │
│     amount = Pedersen(450 USDC) — amount hidden     │
│  ③ Check-in (70%) → ✅ release proof: 0xcd56…      │
│  ④ Checkout (30%) → ✅ release proof: 0xef78…      │
│                                                     │
│  📄 Receipt: Amount [HIDDEN 🔒] · Raw DB: ❌        │
└─────────────────────────────────────────────────────┘
```

---

## Three Circuits

| Circuit | Private inputs | Public inputs | Proves |
|---|---|---|---|
| `proof_of_funds.nr` | `balance`, `randomness` | `commitment`, `threshold` | balance ≥ threshold |
| `private_escrow.nr` | `amount`, `view_key`, addresses | `commitment`, `encrypted_amount` | amount committed + encrypted |
| `milestone_release.nr` | `total_amount`, `randomness` | `commitment`, `release_commitment`, `pct` | pct ∈ {70, 30} is correct |

---

## What Is / Is Not Stored

| | Stored | ZK treatment |
|---|---|---|
| Wallet address, contract ID, escrow status | ✅ plaintext | Public by design |
| Proof hash, Pedersen commitment | ✅ plaintext | Hash is safe; source stays private |
| Encrypted amount (ChaCha20) | ✅ JSONB | Ciphertext only — view key required |
| **Booking amount (raw USDC)** | ❌ never | Noir circuit private input only |
| **Guest wallet balance** | ❌ never | Range proof only |
| **ECDH view key** | ❌ never | On-device — guest + host + auditor |
| **IP address** | ❌ not collected | ZK privacy principle |

---

## Prerequisites

```
Node.js ≥ 18    pnpm ≥ 9
Nargo ≥ 0.30    noirup → noirup
bb (matches)    bbup  → bbup
Freighter ext   freighter.app
Docker v2       full-stack only
```

---

## Quick Start — Demo Only

```bash
git clone https://github.com/safetrustcr/safetrust-ZK.git
cd safetrust-ZK
pnpm install

cp demo/.env.example demo/.env.local
# No keys needed — Freighter works out of the box
# TrustlessWork falls back to mock if unreachable

pnpm --filter safetrust-zk-demo dev
```

Open [http://localhost:3000](http://localhost:3000) → pick an apartment → connect Freighter → run all 5 pipeline steps → open **Escrow Receipt**.

---

## Full Stack — Demo + Backend

```bash
# Terminal 1 — backend
git clone https://github.com/safetrustcr/backend-SafeTrust.git
cd backend-SafeTrust
cp .env.example .env            # fill POSTGRES_PASSWORD, JWT_SECRET, EVENT_SECRET
echo "ZK_ENABLED=true" >> .env  # activates proof hash storage
docker compose up --build
# Webhook → :3001  |  Hasura → :8080  |  Postgres → :5433

# Terminal 2 — demo
cd safetrust-ZK
cp demo/.env.example demo/.env.local
echo "NEXT_PUBLIC_TRUSTLESS_API_URL=http://localhost:3001" >> demo/.env.local
pnpm --filter safetrust-zk-demo dev
```

**Verify proof hashes landed in Hasura:**

```graphql
query {
  trustless_work_escrows(
    where: { escrow_metadata: { _has_key: "zk_proof_hash" } }
  ) {
    contract_id
    escrow_metadata
  }
}
```

---

## Running the Circuits

```bash
make compile-all          # compile all three circuits
make prove-proof-of-funds # compile → execute → prove → verify
make prove-private-escrow
make prove-milestone-release
make test-circuits        # run nargo test suites
```

Edit `circuits/<name>/Prover.toml` to test different amounts:

```toml
# proof_of_funds/Prover.toml
balance   = "20000000000"  # 2000 USDC (private)
threshold = "4500000000"   # 450 USDC  (public)
randomness = "12345"
```

---

## Running the SDK

```bash
cd sdk && pnpm install && pnpm build && pnpm test
```

```ts
import { SafeTrustZK } from '@safetrust/zk-sdk';
const zk = new SafeTrustZK();

// 1. Prove solvency — balance never leaves the circuit
const { commitment } = await zk.proveOfFunds({
  balance:   20_000_000_000n,  // stroops
  threshold:  4_500_000_000n,
});

// 2. Commit amount privately
const { commitment: escrowCommitment } = await zk.commitEscrowAmount({
  amount: 4_500_000_000n, guestAddress: 'G...', hostAddress: 'G...',
});

// 3. Prove milestone release
await zk.proveMilestoneRelease({
  amountCommitment: escrowCommitment,
  totalAmount: 4_500_000_000n,
  milestonePct: 70,
});
```

---

## dApp-SafeTrust Integration (post-hackathon)

```ts
// Before — amount public on-chain
await initializeEscrow(escrowParams);

// After — only Pedersen commitment on-chain
const { proof, commitment } = await zk.proveAndCommitEscrow({
  balance, amount, guestAddress, hostAddress,
});
if (proof.valid) {
  await initializeEscrow({ ...escrowParams, amountCommitment: commitment });
}
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| ZK circuits | Noir / Barretenberg UltraHonk |
| On-chain verifier | Soroban ([rs-soroban-ultrahonk](https://github.com/yugocabrio/rs-soroban-ultrahonk)) |
| SDK | TypeScript — `@noir-lang/noir_js`, `@aztec/bb.js` |
| Demo | Next.js 14 App Router |
| Backend | Node.js + Hasura GraphQL + PostgreSQL |
| Blockchain | Stellar Testnet · TrustlessWork API |
| Wallet | Freighter — `@creit.tech/stellar-wallets-kit` v2.5.0 |

---

## Compliance

Not a mixer. The **view key pattern** means the guest, host, and any designated auditor can always reconstruct full transaction details. Everything else is confidential — not opaque.

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [Git Guidelines](https://github.com/safetrustcr/frontend-SafeTrust/issues/35). Issues tagged `circuit` · `sdk` · `demo` · `contracts`.

MIT © [SafeTrust](https://github.com/safetrustcr)
