#!/usr/bin/env bash
# Build UltraHonk artifacts compatible with rs-soroban-ultrahonk (bb v0.87.0, keccak).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CIRCUIT_DIR="$ROOT/circuits/verifier_fixture"
FIXTURE_DIR="$ROOT/contracts/escrow_verifier/test_fixtures"
TOOLCHAIN_DIR="$ROOT/.toolchain"
BB_VERSION="v0.87.0"
NOIR_VERSION="1.0.0-beta.9"

if [[ "${FORCE:-0}" != "1" && -f "$FIXTURE_DIR/vk.bin" && -f "$FIXTURE_DIR/proof.bin" && -f "$FIXTURE_DIR/public_inputs.bin" ]]; then
  vk_size=$(wc -c < "$FIXTURE_DIR/vk.bin" | tr -d ' ')
  proof_size=$(wc -c < "$FIXTURE_DIR/proof.bin" | tr -d ' ')
  if [[ "$vk_size" == "1760" && "$proof_size" == "14592" ]]; then
    echo "==> Stellar fixtures already present (${FIXTURE_DIR})"
    exit 0
  fi
fi

uname_s=$(uname -s | tr '[:upper:]' '[:lower:]')
uname_m=$(uname -m)
case "${uname_s}_${uname_m}" in
  linux_x86_64)  bb_archive="barretenberg-amd64-linux.tar.gz" ;;
  darwin_arm64)  bb_archive="barretenberg-arm64-darwin.tar.gz" ;;
  darwin_x86_64) bb_archive="barretenberg-amd64-darwin.tar.gz" ;;
  *) echo "unsupported platform: ${uname_s}_${uname_m}"; exit 1 ;;
esac

BB_BIN="$TOOLCHAIN_DIR/bb-${BB_VERSION}/bb"
if [[ ! -x "$BB_BIN" ]]; then
  echo "==> Installing Barretenberg ${BB_VERSION} to ${TOOLCHAIN_DIR}"
  mkdir -p "$TOOLCHAIN_DIR/bb-${BB_VERSION}"
  curl -fsSL \
    "https://github.com/AztecProtocol/aztec-packages/releases/download/${BB_VERSION}/${bb_archive}" \
    -o "$TOOLCHAIN_DIR/bb.tar.gz"
  tar -xzf "$TOOLCHAIN_DIR/bb.tar.gz" -C "$TOOLCHAIN_DIR/bb-${BB_VERSION}"
  rm -f "$TOOLCHAIN_DIR/bb.tar.gz"
fi

if ! command -v nargo >/dev/null 2>&1; then
  echo "Error: nargo not found. Install noirup and run: noirup -v ${NOIR_VERSION}"
  exit 1
fi

nargo_version="$(nargo --version 2>&1 | head -1)"
if [[ "$nargo_version" != *"beta.9"* ]]; then
  echo "Warning: Stellar fixtures require Noir ${NOIR_VERSION} (found: ${nargo_version})"
  echo "Run: noirup -v ${NOIR_VERSION}"
  exit 1
fi

echo "==> Compile verifier_fixture + generate bb ${BB_VERSION} keccak proof"
cd "$CIRCUIT_DIR"
nargo compile
nargo execute

"$BB_BIN" prove \
  --scheme ultra_honk \
  --oracle_hash keccak \
  --bytecode_path ./target/verifier_fixture.json \
  --witness_path ./target/verifier_fixture.gz \
  --output_path ./target \
  --output_format bytes_and_fields

"$BB_BIN" write_vk \
  --scheme ultra_honk \
  --oracle_hash keccak \
  --bytecode_path ./target/verifier_fixture.json \
  --output_path ./target \
  --output_format bytes_and_fields

if [[ -d ./target/vk && -f ./target/vk/vk ]]; then
  mv ./target/vk/vk ./target/vk.tmp
  rmdir ./target/vk
  mv ./target/vk.tmp ./target/vk
fi

vk_size=$(wc -c < ./target/vk | tr -d ' ')
proof_size=$(wc -c < ./target/proof | tr -d ' ')
if [[ "$vk_size" != "1760" || "$proof_size" != "14592" ]]; then
  echo "Error: unexpected artifact sizes (vk=${vk_size}, proof=${proof_size})"
  echo "Expected vk=1760 proof=14592 for rs-soroban-ultrahonk"
  exit 1
fi

mkdir -p "$FIXTURE_DIR"
cp ./target/vk "$FIXTURE_DIR/vk.bin"
cp ./target/proof "$FIXTURE_DIR/proof.bin"
cp ./target/public_inputs "$FIXTURE_DIR/public_inputs.bin"

echo "==> Stellar fixtures written to ${FIXTURE_DIR}"
wc -c "$FIXTURE_DIR"/*
