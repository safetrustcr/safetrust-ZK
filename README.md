# SafeTrust ZK

> **Zero-knowledge privacy layer for the SafeTrust escrow lifecycle on Stellar.**

Every escrow on [SafeTrust](https://github.com/safetrustcr) is currently fully transparent on the Stellar blockchain — booking amounts, milestone releases, and counterparty addresses are all visible on-chain. `safetrust-zk` adds a three-circuit ZK pipeline that hides amounts while keeping the system auditable and compliant.

Built for the **Stellar Hacks ZK Hackathon** on DoraHacks. Designed to merge into `dApp-SafeTrust` post-hackathon as a first-class privacy layer.

---

## Table of Contents

- [The Use Case](#the-use-case)
- [How It Works](#how-it-works)
- [Circuit Design](#circuit-design)
- [Repo Structure](#repo-structure)
- [Prerequisites](#prerequisites)
- [Quick Start — Demo Only](#quick-start--demo-only)
- [Full Stack — Demo + Backend](#full-stack--demo--backend)
- [Running the Circuits](#running-the-circuits)
- [Running the SDK](#running-the-sdk)
- [Integration with dApp-SafeTrust](#integration-with-dapp-safetrust)
- [What Is and Is Not Stored](#what-is-and-is-not-stored)
- [Compliance by Design](#compliance-by-design)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)

---

## The Use Case

A guest books **Casa Stellar** — an apartment in San José, Costa Rica — for 3 nights at 150 USDC/night.

**Without ZK (today):** The 450 USDC booking amount, both wallet addresses, and every milestone release are permanently visible on the Stellar blockchain. Hotels can see competitors' pricing. Guests expose their travel spending patterns publicly.

**With SafeTrust ZK:** The guest proves they can afford the booking without revealing their balance. The booking amount is committed via a Pedersen hash — only the commitment goes on-chain, never the raw number. Milestone releases (70% check-in, 30% checkout) are proven correct without revealing what 70% of what amount actually is.

```
┌─────────────────────────────────────────────────────┐
│            SAFETRUST ZK — Booking Flow              │
│                                                     │
│  🏠 Casa Stellar, San José CR  ·  150 USDC/night   │
│     Host: GBVU…VAD                                  │
│                                                     │
│  ① Prove Funds    → ✅ proof hash: 0xab12…         │
│     balance ≥ 450 USDC — balance never revealed     │
│                                                     │
│  ② Private Escrow → ✅ commitment: 0xfe34…         │
│     amount = Pedersen(450 USDC) — amount hidden     │
│                                                     │
│  ③ Check-in (70%) → ✅ release proof: 0xcd56…      │
│     proves 70% of commitment — raw amount hidden    │
│                                                     │
│  ④ Checkout (30%) → ✅ release proof: 0xef78…      │
│     proves 30% of commitment — raw amount hidden    │
│                                                     │
│  📄 ESCROW RECEIPT                                  │
│     Contract ID:  STELLAR_ZK_APT-STELLAR-001        │
│     Amount:       [HIDDEN — ZK PROTECTED] 🔒        │
│     Proof hash:   0xab12…  ✅ stored               │
│     Commitment:   0xfe34…  ✅ stored               │
│     Raw amount in DB: ❌ NOT STORED                  │
└─────────────────────────────────────────────────────┘
```

This same model applies to any service with a payment and a delivery moment: hotel rooms, short-term rentals, shuttle services, SPA treatments, guided tours, meditation retreats.

---

## How It Works

The pipeline maps to the three phases of a SafeTrust escrow booking:

```
[Guest Wallet]
      │
      ▼
① proof_of_funds.nr
   Range proof: balance ≥ booking amount
   → Stellar tx memo: proof_hash_1
      │
      ▼
② private_escrow.nr
   Pedersen commitment to booking amount
   View key (ECDH) for guest + host + auditor
   → On-chain: commitment only
   → Off-chain: encrypted amount (IPFS / backend)
      │
      ▼
③ milestone_release.nr  (×2: check-in 70%, checkout 30%)
   Proves release % is correct without revealing raw amount
   → Stellar tx memo: proof_hash_3
      │
      ▼
[Host receives funds — auditor reconstructs via view key]
```

No raw booking amounts ever appear on-chain. Proofs are generated server-side via `@noir-lang/noir_js`.

---

## Circuit Design

### Circuit 1 — `proof_of_funds.nr`

Before creating an escrow, the guest proves their USDC balance is at least equal to the booking amount without revealing it.

| | |
|---|---|
| **Private inputs** | `balance: u64`, `randomness: Field` |
| **Public inputs** | `balance_commitment: Field`, `threshold: u64` |
| **Constraint** | `balance >= threshold` and `balance_commitment == Pedersen(balance, randomness)` |
| **On-chain** | Proof hash in Stellar transaction memo |

### Circuit 2 — `private_escrow.nr`

The booking amount is committed via Pedersen hash. Only the guest, host, and a designated view-key holder can decrypt the real amount.

| | |
|---|---|
| **Private inputs** | `amount: u64`, `view_key: Field`, `guest_addr`, `host_addr` |
| **Public inputs** | `amount_commitment: Field`, `encrypted_amount: [u8; 32]` |
| **Constraint** | `amount_commitment == Pedersen(amount, randomness)` and `encrypted_amount == ChaCha20(view_key, amount)` |
| **On-chain** | Pedersen commitment only |
| **Off-chain** | Encrypted amount stored in IPFS / SafeTrust backend |

Implements the **selective disclosure / view key pattern** aligned with Stellar's privacy roadmap.

### Circuit 3 — `milestone_release.nr`

SafeTrust milestones release 70% at check-in and 30% at checkout. The host proves the release amount is the correct percentage of the committed total.

| | |
|---|---|
| **Private inputs** | `total_amount: u64`, `randomness: Field` |
| **Public inputs** | `amount_commitment: Field`, `release_commitment: Field`, `milestone_pct: u64` |
| **Constraint** | `milestone_pct ∈ {70, 30}` and `release_commitment == Pedersen(total_amount * milestone_pct / 100)` |
| **On-chain** | Release proof hash in Stellar transaction memo |

---

## Repo Structure

```
safetrust-zk/
├── circuits/
│   ├── proof_of_funds/
│   │   ├── src/main.nr          # Circuit 1 — range proof
│   │   ├── Prover.toml          # Test inputs
│   │   └── Nargo.toml
│   ├── private_escrow/
│   │   ├── src/main.nr          # Circuit 2 — Pedersen commit + view key
│   │   ├── Prover.toml
│   │   └── Nargo.toml
│   ├── milestone_release/
│   │   ├── src/main.nr          # Circuit 3 — percentage proof
│   │   ├── Prover.toml
│   │   └── Nargo.toml
│   └── verifier_fixture/        # Fixture circuit for Soroban verifier tests
│
├── contracts/
│   └── escrow_verifier/         # Soroban UltraHonk verifier (Rust)
│       ├── src/lib.rs
│       ├── src/test.rs
│       └── Cargo.toml
│
├── sdk/                         # TypeScript SDK — drop-in for dApp-SafeTrust
│   ├── src/
│   │   ├── provers/
│   │   │   ├── proofOfFunds.ts
│   │   │   ├── privateEscrow.ts
│   │   │   └── milestoneRelease.ts
│   │   ├── crypto/
│   │   │   ├── aes.ts
│   │   │   ├── pedersen.ts
│   │   │   └── field.ts
│   │   ├── viewKey.ts           # ECDH key derivation + ChaCha20
│   │   ├── stellar.ts           # Proof hash → Stellar tx memo
│   │   └── index.ts             # SafeTrustZK class — public entry point
│   └── package.json
│
├── demo/                        # Next.js 14 booking demo
│   ├── app/
│   │   ├── page.tsx             # Full apartment booking + ZK pipeline UI
│   │   ├── components/
│   │   │   └── FreighterConnectButton.tsx
│   │   └── api/
│   │       ├── prove-funds/route.ts
│   │       ├── commit-escrow/route.ts
│   │       ├── prove-milestone/route.ts
│   │       ├── initialize-escrow/route.ts  # TrustlessWork integration
│   │       └── store-encrypted/route.ts
│   ├── lib/
│   │   └── seeds.ts             # Seeded apartments + hosts (no DB needed)
│   └── .env.example
│
├── docs/
│   ├── architecture.md
│   ├── circuit-design.md
│   └── integration-guide.md
│
├── scripts/
│   ├── build-stellar-fixtures.sh
│   ├── start-stellar-local.sh
│   └── verify-on-chain.sh
│
├── Makefile                     # make compile-all, make prove-proof-of-funds, etc.
├── README.md
└── package.json                 # pnpm workspace root
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 9 | `npm i -g pnpm` |
| Nargo (Noir) | ≥ 0.30 | `noirup` — [noir-lang.org](https://noir-lang.org/docs/getting_started/installation) |
| Barretenberg (`bb`) | matches nargo | `bbup` — [Barretenberg docs](https://barretenberg.aztec.network/docs/getting_started/) |
| Freighter extension | latest | [freighter.app](https://freighter.app) (for demo wallet) |
| Rust + Cargo | stable | [rustup.rs](https://rustup.rs) (for Soroban verifier only) |
| Docker + Compose | v2 | [docker.com](https://docker.com) (for full-stack only) |

---

## Quick Start — Demo Only

The fastest path — runs the booking demo with ZK proofs, no backend required.

```bash
# 1. Clone and install
git clone https://github.com/safetrustcr/safetrust-ZK.git
cd safetrust-ZK
pnpm install

# 2. Configure the demo
cp demo/.env.example demo/.env.local
# No keys needed — Freighter mode works out of the box
# Optionally set NEXT_PUBLIC_TRUSTLESS_API_URL for real TrustlessWork calls
# (falls back to mock automatically if unset or unreachable)

# 3. Run the demo
pnpm --filter safetrust-zk-demo dev
```

Open [http://localhost:3000](http://localhost:3000).

**What you'll see:**
1. Three seeded apartments (Casa Stellar CR, Loft Bocas Panama, Suite Medellín)
2. Select an apartment → Connect Freighter wallet
3. Run the ZK pipeline: Prove Funds → Commit Escrow → Fund on TrustlessWork → Release 70% → Release 30%
4. Open the **Escrow Receipt** modal — shows proof hashes and Pedersen commitments stored, raw booking amount not stored

---

## Full Stack — Demo + Backend

Runs the demo against the real `backend-SafeTrust` webhook service with Hasura + PostgreSQL. This activates the `ZK_ENABLED` hook that writes proof hashes into `escrow_metadata` after each booking.

### Step 1 — Start backend-SafeTrust

```bash
# In a separate terminal — clone backend if needed
git clone https://github.com/safetrustcr/backend-SafeTrust.git
cd backend-SafeTrust

# Copy and fill environment
cp .env.example .env
# Required: POSTGRES_PASSWORD, HASURA_GRAPHQL_JWT_SECRET, HASURA_EVENT_SECRET

# Start Postgres + Hasura + webhook service
docker compose up --build

# Services:
#   Webhook API  → http://localhost:3001
#   Hasura GraphQL → http://localhost:8080
#   PostgreSQL   → localhost:5433
```

### Step 2 — Enable ZK hook in backend

Add to your `backend-SafeTrust/.env`:

```bash
ZK_ENABLED=true
```

Then restart the webhook service:

```bash
docker compose up --build webhook
```

When `ZK_ENABLED=true`, after every `POST /api/escrows/initialize` the handler fires `generateAndStoreProofAsync()` — updates `escrow_metadata` JSONB with:

```json
{
  "zk_proof_hash": "0xab12...",
  "zk_amount_commitment": "0xfe34...",
  "zk_proof_generated_at": "2026-07-03T...",
  "zk_circuit_version": "1.0.0"
}
```

### Step 3 — Start the demo

```bash
# In safetrust-ZK repo
cp demo/.env.example demo/.env.local

# Point to the local backend
echo "NEXT_PUBLIC_TRUSTLESS_API_URL=http://localhost:3001" >> demo/.env.local

pnpm --filter safetrust-zk-demo dev
```

Open [http://localhost:3000](http://localhost:3000) and run the full booking flow. The ZK proof hashes will appear in both the receipt modal and in Hasura at [http://localhost:8080](http://localhost:8080).

### Verify proof hashes in Hasura

```graphql
query EscrowWithZKProof {
  trustless_work_escrows(
    where: { escrow_metadata: { _has_key: "zk_proof_hash" } }
    limit: 5
  ) {
    contract_id
    status
    escrow_metadata
  }
}
```

---

## Running the Circuits

Compile and prove all three circuits locally using `make`:

```bash
# Compile all circuits
make compile-all

# Execute witnesses (generates .gz files for proving)
cd circuits/proof_of_funds && nargo compile && nargo execute

# Prove + verify — Circuit 1 (Proof of Funds)
make prove-proof-of-funds

# Prove + verify — Circuit 2 (Private Escrow)
make prove-private-escrow

# Prove + verify — Circuit 3 (Milestone Release)
make prove-milestone-release

# Run all nargo tests
make test-circuits
```

Test inputs live in `circuits/<name>/Prover.toml`. Edit them to test different amounts:

```toml
# circuits/proof_of_funds/Prover.toml
balance = "20000000000"     # 2000 USDC — guest balance (private)
threshold = "4500000000"    # 450 USDC — booking amount (public)
randomness = "12345"        # blinding factor (private)
```

**Expected output:**

```
Compiling proof_of_funds...
Executing circuit...
Generating proof...
Verifying proof...
proof_of_funds: prove + verify OK ✅
```

---

## Running the SDK

```bash
cd sdk
pnpm install
pnpm build

# Run all SDK tests
pnpm test
```

The SDK exposes a single `SafeTrustZK` class:

```ts
import { SafeTrustZK } from '@safetrust/zk-sdk';

const zk = new SafeTrustZK();

// Step 1 — Prove guest has enough balance (balance never revealed)
const fundsProof = await zk.proveOfFunds({
  balance:   20_000_000_000n,  // 2000 USDC in stroops (private)
  threshold:  4_500_000_000n,  // 450 USDC booking amount (public threshold)
});
// → { valid: true, commitment: "0xfe34...", proof: Uint8Array }

// Step 2 — Commit booking amount privately
const { commitment, encryptedAmount, viewKey } = await zk.commitEscrowAmount({
  amount:       4_500_000_000n,  // 450 USDC (stays in circuit — never stored raw)
  guestAddress: 'GGUEST...',
  hostAddress:  'GHOST...',
});
// → commitment goes on-chain, encryptedAmount stored off-chain
// → viewKey held by guest + host + auditor only

// Step 3 — Prove 70% milestone release
const releaseProof = await zk.proveMilestoneRelease({
  amountCommitment: commitment,
  totalAmount:      4_500_000_000n,
  milestonePct:     70,           // proves 70% is correct without revealing amount
});
// → { valid: true, releaseCommitment: "0xcd56...", proof: Uint8Array }
```

---

## What Is and Is Not Stored

| Data | Stored in DB? | ZK treatment |
|---|---|---|
| Stellar wallet address | ✅ Yes — plaintext | Public by design |
| Escrow status | ✅ Yes — plaintext | Public lifecycle state |
| TrustlessWork contract_id | ✅ Yes — plaintext | Public on-chain identifier |
| ZK proof hash | ✅ Yes — plaintext | Hash is public; source data is private |
| Pedersen commitment | ✅ Yes — plaintext | Hides amount; safe to store |
| Encrypted amount (ChaCha20) | ✅ Yes — JSONB | Ciphertext only; view key required to read |
| **Booking amount (raw USDC)** | ❌ Never | Stays in Noir circuit private inputs only |
| **Guest wallet balance** | ❌ Never | Range proof proves threshold; balance never stored |
| **ECDH view key** | ❌ Never in DB | On-device only — guest + host + auditor |
| **IP address** | ❌ Not collected | ZK privacy principle |

---

## Integration with dApp-SafeTrust

This repo is standalone for the hackathon. Post-hackathon, the SDK drops into `dApp-SafeTrust/apps/frontend/` as a wrapper around the existing TrustlessWork hooks:

```ts
// Before (current dApp-SafeTrust) — amount is public on-chain
const { initializeEscrow } = useSingleRelease();
await initializeEscrow(escrowParams);

// After (with ZK layer) — only Pedersen commitment goes on-chain
import { SafeTrustZK } from '@safetrust/zk-sdk';

const zk = new SafeTrustZK();
const { proof, commitment } = await zk.proveAndCommitEscrow({
  balance:      userUSDCBalance,
  amount:       bookingAmount,
  guestAddress: walletPublicKey,
  hostAddress:  propertyOwnerKey,
});

if (proof.valid) {
  await initializeEscrow({ ...escrowParams, amountCommitment: commitment });
}
```

See [`docs/integration-guide.md`](./docs/integration-guide.md) for the full migration path.

---

## Compliance by Design

`safetrust-zk` is not a mixer or anonymity tool. The **view key pattern** ensures:

- Booking amounts are **private from the public** — no competitor or observer can see hotel pricing on-chain
- The **guest, host, and any designated auditor/regulator** can always reconstruct full transaction details using the ECDH view key
- ZK proofs **guarantee correctness** without requiring trust in any intermediary

This is confidentiality, not opacity — exactly what hospitality and OTA businesses need for real-world adoption.

---

## Tech Stack

| Layer | Technology |
|---|---|
| ZK Circuits | [Noir](https://noir-lang.org) (Barretenberg / UltraHonk) |
| Proof verification | UltraHonk via `bb`, Stellar BN254 precompiles |
| On-chain verifier | Soroban UltraHonk verifier ([rs-soroban-ultrahonk](https://github.com/yugocabrio/rs-soroban-ultrahonk)) |
| SDK | TypeScript — `@noir-lang/noir_js`, `@aztec/bb.js` |
| Demo frontend | Next.js 14 App Router |
| Backend | Node.js webhook service + Hasura GraphQL + PostgreSQL |
| Blockchain | Stellar Testnet |
| Escrow infrastructure | [TrustlessWork API](https://docs.trustlesswork.com) |
| Encryption | ECDH key derivation + ChaCha20 |
| Wallet | Freighter (via `@creit.tech/stellar-wallets-kit` v2.5.0 static API) |

---

## Contributing

This project follows the SafeTrust contributor workflow. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and the [Git Guidelines](https://github.com/safetrustcr/frontend-SafeTrust/issues/35).

Issues are tagged `circuit`, `sdk`, `demo`, or `contracts` depending on the layer.

---

## License

MIT © [SafeTrust](https://github.com/safetrustcr)
