# Integration Guide — dApp-SafeTrust

> Drop-in guide (ZK-023). Expanded after SDK implementation.

## Install

```bash
pnpm add @safetrust/zk-sdk
```

## Enable in backend-SafeTrust

Set `ZK_ENABLED=true` in the backend environment. The existing `POST /api/escrows/initialize` handler fires async proof generation after DB INSERT — never blocking the 200 response.

## Frontend Usage

```ts
import { SafeTrustZK } from "@safetrust/zk-sdk";

const zk = new SafeTrustZK();

const { proof, commitment } = await zk.proveAndCommitEscrow({
  balance: userUSDCBalance,
  amount: bookingAmount,
  guestAddress: walletPublicKey,
  hostAddress: propertyOwnerKey,
});

if (proof.valid) {
  await initializeEscrow({ ...escrowParams, amountCommitment: commitment });
}
```

## Error Handling

- Proof generation failures are logged server-side; escrow creation still succeeds.
- UI should surface ZK status from `escrow_metadata` JSONB fields.

## Stellar On-Chain Verification (ZK-016)

The `escrow_verifier` Soroban contract uses [rs-soroban-ultrahonk](https://github.com/NethermindEth/rs-soroban-ultrahonk), which expects **Barretenberg v0.87.0** proof artifacts (VK = 1760 bytes, proof = 14592 bytes, keccak transcript).

SafeTrust circuits are compiled with **Noir 1.0.0-beta.22** and proved with **bb 5.0** in the SDK. Those proofs verify locally but are **not yet compatible** with the on-chain verifier until rs-soroban-ultrahonk is updated for bb 5.0.

### Check compatibility before submitting on-chain

```ts
import { formatProofForStellar, isStellarVerifierCompatible } from "@safetrust/zk-sdk";

const bundle = formatProofForStellar(proofData);
if (!bundle.stellarCompatible) {
  // bb 5.0 proof — store off-chain / wait for verifier upgrade
}
```

### Local on-chain test (verifier_fixture circuit)

```bash
# Noir beta.9 for fixture build only
noirup -v 1.0.0-beta.9
make prepare-verifier-fixtures

# Docker quickstart with unlimited CPU limits (required for UltraHonk verify)
docker run -d -p 8000:8000 stellar/quickstart --local --limits unlimited --enable core,rpc,lab,horizon,friendbot

./scripts/verify-on-chain.sh
```

Restore your main Noir toolchain after fixture generation: `noirup -v 1.0.0-beta.22`

