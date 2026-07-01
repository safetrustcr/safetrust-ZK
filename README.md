# SafeTrust ZK

> **Zero-knowledge privacy layer for the SafeTrust escrow lifecycle on Stellar.**

Every escrow on [SafeTrust](https://github.com/safetrustcr) is currently fully transparent on the Stellar blockchain — booking amounts, milestone releases, and counterparty addresses are all visible on-chain. `safetrust-zk` adds a three-circuit ZK pipeline that hides amounts while keeping the system auditable and compliant.

Built for the **Stellar Hacks ZK Hackathon** on DoraHacks. Designed to merge into `dApp-SafeTrust` post-hackathon as a first-class privacy layer.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Circuit Design](#circuit-design)
- [Repo Structure](#repo-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Running the Circuits](#running-the-circuits)
- [Running the SDK](#running-the-sdk)
- [Running the Demo](#running-the-demo)
- [Integration with dApp-SafeTrust](#integration-with-dapp-safetrust)
- [Compliance by Design](#compliance-by-design)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)

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

No raw booking amounts ever appear on-chain. All three proofs are generated client-side in the browser using `@noir-lang/noir_js`.

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
│   │   ├── src/main.nr          # Circuit 1
│   │   └── Nargo.toml
│   ├── private_escrow/
│   │   ├── src/main.nr          # Circuit 2
│   │   └── Nargo.toml
│   └── milestone_release/
│       ├── src/main.nr          # Circuit 3
│       └── Nargo.toml
│
├── contracts/
│   └── escrow_verifier/         # Soroban on-chain verifier (Rust)
│       ├── src/lib.rs
│       └── Cargo.toml
│
├── sdk/                         # TypeScript SDK — drop-in for dApp-SafeTrust
│   ├── src/
│   │   ├── provers/
│   │   │   ├── proofOfFunds.ts
│   │   │   ├── privateEscrow.ts
│   │   │   └── milestoneRelease.ts
│   │   ├── viewKey.ts           # ECDH key derivation + ChaCha20 encryption
│   │   ├── stellar.ts           # Proof hash → Stellar tx memo
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── demo/                        # Minimal Next.js 14 demo app
│   ├── app/
│   │   ├── page.tsx             # Three-step pipeline UI
│   │   └── api/
│   │       └── store-encrypted/
│   │           └── route.ts     # Store encrypted amount off-chain
│   └── package.json
│
├── docs/
│   ├── architecture.md
│   ├── circuit-design.md
│   └── integration-guide.md
│
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
| Barretenberg (`bb`) | matches nargo | `bbup` (after `noirup`) — [Barretenberg docs](https://barretenberg.aztec.network/docs/getting_started/) |
| Rust + Cargo | stable | [rustup.rs](https://rustup.rs) |
| Stellar CLI | latest | [stellar.org/docs](https://developers.stellar.org/docs/tools/stellar-cli) |

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/safetrustcr/safetrust-zk.git
cd safetrust-zk

# Install all workspace dependencies
pnpm install
```

---

## Running the Circuits

Each circuit lives in `circuits/<name>/`. You need [Nargo](https://noir-lang.org/docs/getting_started/installation) installed.

```bash
# Compile all circuits
cd circuits/proof_of_funds && nargo compile
cd ../private_escrow      && nargo compile
cd ../milestone_release   && nargo compile
```

### Generate a test proof locally

Noir 1.0 uses `nargo execute` for witnesses and `bb` for proving/verification:

```bash
# Circuit 1 — Proof of Funds (or: make prove-proof-of-funds)
cd circuits/proof_of_funds
nargo compile && nargo execute
bb prove --oracle_hash keccak \
  -b ./target/proof_of_funds.json -w ./target/proof_of_funds.gz --write_vk -o ./target
bb verify --oracle_hash keccak -p ./target/proof -k ./target/vk
```

Test inputs for each circuit live in `circuits/<name>/Prover.toml`.

---

## Running the SDK

```bash
cd sdk
pnpm install
pnpm build

# Run the full pipeline test
pnpm test
```

The SDK exposes a single `SafeTrustZK` class that chains all three provers:

```ts
import { SafeTrustZK } from '@safetrust/zk-sdk';

const zk = new SafeTrustZK();

// Step 1 — prove funds
const fundsProof = await zk.proveOfFunds({
  balance: 1500_0000000n,   // 1500 USDC in stroops
  threshold: 1000_0000000n, // booking amount
});

// Step 2 — commit escrow amount privately
const { commitment, encryptedAmount, viewKey } = await zk.commitEscrowAmount({
  amount: 1000_0000000n,
  guestAddress: 'G...',
  hostAddress: 'G...',
});

// Step 3 — prove milestone release (70% check-in)
const releaseProof = await zk.proveMilestoneRelease({
  amountCommitment: commitment,
  totalAmount: 1000_0000000n,
  milestonePct: 70,
});
```

---

## Running the Demo

The demo is a minimal Next.js 14 app that walks through the full pipeline visually.

```bash
cd demo
cp .env.example .env.local
# Fill in NEXT_PUBLIC_TRUSTLESS_API_URL and NEXT_PUBLIC_STELLAR_NETWORK

pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The demo shows three steps:

1. **Prove Funds** — connect Freighter wallet, generate range proof
2. **Create Private Escrow** — commit booking amount, generate view key
3. **Release Milestone** — prove 70%/30% release is correct

---

## Integration with dApp-SafeTrust

This repo is standalone for the hackathon. Post-hackathon, the SDK drops into `dApp-SafeTrust/apps/frontend/` as a wrapper around the existing TrustlessWork hooks:

```ts
// Before (current dApp-SafeTrust)
const { initializeEscrow } = useSingleRelease();
await initializeEscrow(escrowParams); // amount is public

// After (with ZK layer)
import { SafeTrustZK } from '@safetrust/zk-sdk';

const zk = new SafeTrustZK();
const { proof, commitment } = await zk.proveAndCommitEscrow({
  balance: userUSDCBalance,
  amount: bookingAmount,
  guestAddress: walletPublicKey,
  hostAddress: propertyOwnerKey,
});

if (proof.valid) {
  // amount on-chain is now a Pedersen commitment, not a raw number
  await initializeEscrow({ ...escrowParams, amountCommitment: commitment });
}
```

See [`docs/integration-guide.md`](./docs/integration-guide.md) for the full migration path.

---

## Compliance by Design

`safetrust-zk` is not a mixer or anonymity tool. The **view key pattern** ensures:

- Booking amounts are **private from the public** — no competitor or observer can see hotel pricing on-chain
- The **guest, host, and any designated auditor/regulator** can always reconstruct full transaction details using the view key
- ZK proofs **guarantee correctness** without requiring trust in any intermediary

This is confidentiality, not opacity — exactly what hospitality businesses need for real-world adoption.

---

## Tech Stack

| Layer | Technology |
|---|---|
| ZK Circuits | [Noir](https://noir-lang.org) (Barretenberg / UltraPlonk) |
| Proof verification | UltraHonk via Barretenberg (`bb`), Stellar BN254 precompiles |
| On-chain verifier | Soroban UltraHonk verifier ([rs-soroban-ultrahonk](https://github.com/yugocabrio/rs-soroban-ultrahonk)) |
| SDK | TypeScript — `@noir-lang/noir_js`, `@aztec/bb.js` |
| Demo frontend | Next.js 14 |
| Blockchain | Stellar Testnet |
| Escrow infrastructure | [TrustlessWork API](https://docs.trustlesswork.com) |
| Encryption | ECDH key derivation + ChaCha20 |
| Wallet | Freighter (via `@creit.tech/stellar-wallets-kit`) |

---

## Contributing

This project follows the SafeTrust contributor workflow. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and the [Git Guidelines](https://github.com/safetrustcr/dApp-SafeTrust/issues/35).

Issues are tagged `circuit`, `sdk`, `demo`, or `contracts` depending on the layer.

---

## License

MIT © [SafeTrust](https://github.com/safetrustcr)
