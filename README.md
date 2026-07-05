# SafeTrust ZK

> Zero-knowledge privacy layer for hospitality escrows on Stellar.

Booking amounts, wallet balances, and milestone releases are hidden inside Noir circuits. Only Pedersen commitments and proof hashes go on-chain — never raw numbers.

**[Stellar Hacks ZK Hackathon](https://dorahacks.io/hackathon/stellar-hacks-zk/detail) · Built on TrustlessWork · Powered by Noir / UltraHonk**

---

## Current Status

| Layer | Status | Notes |
|---|---|---|
| `circuits/proof_of_funds` | ✅ Compiles + proves | `make prove-proof-of-funds` |
| `circuits/private_escrow` | ✅ Compiles + proves | `make prove-private-escrow` |
| `circuits/milestone_release` | ✅ Compiles + proves | `make prove-milestone-release` |
| `sdk/` | ✅ Built + tested | `@safetrust/zk-sdk` — all 3 provers wired |
| `contracts/escrow_verifier` | ✅ Soroban UltraHonk verifier | Rust, testnet-ready |
| `demo/` | ✅ Running | Next.js 14 · apartment booking flow · Freighter wallet |
| `docker-compose.yml` | ✅ Monolithic | Postgres + demo in one command |
| `db/init.sql` | ✅ Minimal schema | 3 tables only: escrows, milestones, zk_proof_log |
| `ZK_ENABLED` hook | ✅ Implemented | Writes proof hashes to DB after each booking step |

---

## Run Everything — One Command

```bash
git clone https://github.com/safetrustcr/safetrust-ZK.git
cd safetrust-ZK
docker compose up --build
```

- Demo → [http://localhost:3000](http://localhost:3000)
- PostgreSQL → `localhost:5433` · db: `safetrust_zk` · user: `postgres` · pass: `zkdemo`

No backend-SafeTrust clone. No Hasura. No Firebase. The demo writes ZK proof hashes directly to the 3 tables in `db/init.sql`.

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

## Minimal DB Schema (3 tables)

Only what the ZK pipeline actually reads and writes — defined in `db/init.sql`:

```
trustless_work_escrows   ← ZK writes proof_hash + commitment to escrow_metadata JSONB
escrow_milestones        ← ZK writes release_proof to metadata JSONB
zk_proof_log             ← append-only audit trail of every proof event
```

No users, no apartments, no bids, no roles. Seed data in `demo/lib/seeds.ts` replaces all of that.

**Verify proofs landed after booking:**

```sql
SELECT contract_id,
       escrow_metadata->>'zk_proof_hash'        AS proof_hash,
       escrow_metadata->>'zk_amount_commitment'  AS commitment
FROM   public.trustless_work_escrows
WHERE  escrow_metadata ? 'zk_proof_hash';

-- Full audit trail
SELECT circuit, proof_hash, commitment, created_at
FROM   public.zk_proof_log
ORDER  BY created_at DESC;
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
Nargo ≥ 0.30    curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash && noirup
bb (matches)    curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/refs/heads/next/barretenberg/bbup/install | bash && bbup
Freighter ext   freighter.app  (browser extension — for demo wallet)
Docker v2       full-stack only
```

---

## Local Dev (without Docker)

```bash
pnpm install

# 1. Build the SDK first (required by demo API routes)
pnpm --filter @safetrust/zk-sdk build

# 2. Configure and start demo
cp demo/.env.example demo/.env.local
# Delete demo/.env if it exists — it overrides .env.local
pnpm --filter safetrust-zk-demo dev   # → localhost:3000
```

**Important:** Delete `demo/.env` if it exists. Next.js reads both files and `.env` takes priority, which can activate Pollar mode unintentionally.

---

## Running the Circuits

Requires `nargo` and `bb` installed (see Prerequisites above).

```bash
make compile-all             # compile all three circuits

make prove-proof-of-funds    # compile → execute → prove → verify (Circuit 1)
make prove-private-escrow    # compile → execute → prove → verify (Circuit 2)
make prove-milestone-release # compile → execute → prove → verify (Circuit 3)

make test-circuits           # run nargo test suites
make test-all                # circuits + SDK + Soroban contract tests
```

Edit `circuits/<name>/Prover.toml` to test different amounts:

```toml
# circuits/proof_of_funds/Prover.toml
balance    = "20000000000"  # 2000 USDC — guest balance (private)
threshold  = "4500000000"   # 450 USDC  — booking amount (public threshold)
randomness = "12345"        # blinding factor (private)
```

---

## SDK

```bash
cd sdk
pnpm install
pnpm build   # required before running demo
pnpm test
```

```ts
import { SafeTrustZK } from '@safetrust/zk-sdk';
const zk = new SafeTrustZK();

// 1. Prove solvency — balance never leaves the circuit
const { commitment } = await zk.proveOfFunds({
  balance:   20_000_000_000n,  // stroops (private)
  threshold:  4_500_000_000n,  // stroops (public threshold)
});

// 2. Commit booking amount privately
const { commitment: escrowCommitment } = await zk.commitEscrowAmount({
  amount:       4_500_000_000n,
  guestAddress: 'G...',
  hostAddress:  'G...',
});

// 3. Prove milestone release (70% check-in)
await zk.proveMilestoneRelease({
  amountCommitment: escrowCommitment,
  totalAmount:      4_500_000_000n,
  milestonePct:     70,
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
| Demo | Next.js 14 App Router · Freighter wallet |
| Database | PostgreSQL 15 — 3 tables only (`db/init.sql`) |
| Blockchain | Stellar Testnet · TrustlessWork API |
| Wallet | Freighter — `@stellar/freighter-api` |

---

## Compliance

Not a mixer. The **view key pattern** means the guest, host, and any designated auditor can always reconstruct full transaction details. Everything else is confidential — not opaque.

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [Git Guidelines](https://github.com/safetrustcr/frontend-SafeTrust/issues/35). Issues tagged `circuit` · `sdk` · `demo` · `contracts`.

MIT © [SafeTrust](https://github.com/safetrustcr)
