#!/usr/bin/env bash
# Deploy EscrowVerifier with Stellar-compatible VK and verify on local Stellar (ZK-016).
# Requires: stellar CLI, docker quickstart with --limits unlimited, Noir beta.9, bb 0.87.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CIRCUIT_DIR="$ROOT/circuits/verifier_fixture"
CONTRACT_DIR="$ROOT/contracts/escrow_verifier"
WASM_PATH="$CONTRACT_DIR/target/escrow_verifier.wasm"

export PATH="${HOME}/.nargo/bin:${HOME}/.cargo/bin:${PATH}"

echo "==> Build Stellar-compatible proof fixtures (bb v0.87.0)"
bash "$ROOT/scripts/build-stellar-fixtures.sh"

echo "==> Build Soroban contract"
cd "$CONTRACT_DIR"
stellar contract build --out-dir target

if [[ ! -f "$WASM_PATH" ]]; then
  echo "Error: WASM not found at $WASM_PATH after build"
  exit 1
fi

if ! curl -sf "http://localhost:8000/" >/dev/null 2>&1; then
  echo "Error: Stellar quickstart is not reachable on http://localhost:8000"
  echo "Run: ./scripts/start-stellar-local.sh"
  exit 1
fi

echo "==> Deploy with VK (local network, unlimited limits recommended)"
CID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source-account alice \
  --network local \
  -- \
  --vk_bytes-file-path "$CIRCUIT_DIR/target/vk" | tail -n1)
echo "Contract ID: $CID"

echo "==> Verify proof on-chain (simulation)"
stellar contract invoke \
  --source-account alice \
  --id "$CID" \
  --network local \
  --send no \
  -- \
  verify_proof \
  --public_inputs-file-path "$CIRCUIT_DIR/target/public_inputs" \
  --proof_bytes-file-path "$CIRCUIT_DIR/target/proof"

echo "On-chain verification simulation OK"
