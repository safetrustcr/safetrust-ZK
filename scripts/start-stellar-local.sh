#!/usr/bin/env bash
# Start Stellar quickstart in Docker (pull image if missing) and configure stellar CLI.
set -euo pipefail

CONTAINER_NAME="${STELLAR_CONTAINER_NAME:-safetrust-stellar}"
IMAGE="stellar/quickstart"
PORT="${STELLAR_PORT:-8000}"
RPC_URL="http://localhost:${PORT}/soroban/rpc"
PASSPHRASE="Standalone Network ; February 2017"

export PATH="${HOME}/.cargo/bin:${PATH}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker not found. Install Docker Desktop and ensure it is running."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker daemon is not running."
  echo "Start Docker Desktop, wait until it is ready, then re-run:"
  echo "  ./scripts/start-stellar-local.sh"
  exit 1
fi

echo "==> Ensure ${IMAGE} image is available"
if ! docker image inspect "${IMAGE}" >/dev/null 2>&1; then
  echo "    Pulling ${IMAGE}..."
  docker pull "${IMAGE}"
else
  echo "    Image already present"
fi

existing_id="$(docker ps -aq -f "name=^${CONTAINER_NAME}$" || true)"
if [[ -n "${existing_id}" ]]; then
  running="$(docker inspect -f '{{.State.Running}}' "${CONTAINER_NAME}" 2>/dev/null || echo false)"
  if [[ "${running}" == "true" ]]; then
    echo "==> Container ${CONTAINER_NAME} already running"
  else
    echo "==> Starting existing container ${CONTAINER_NAME}"
    docker start "${CONTAINER_NAME}" >/dev/null
  fi
else
  echo "==> Creating container ${CONTAINER_NAME} on port ${PORT}"
  docker run -d \
    --name "${CONTAINER_NAME}" \
    -p "${PORT}:8000" \
    "${IMAGE}" \
    --local \
    --limits unlimited \
    --enable core,rpc,lab,horizon,friendbot >/dev/null
fi

echo "==> Waiting for quickstart on http://localhost:${PORT}"
for _ in $(seq 1 60); do
  if curl -sf "http://localhost:${PORT}/" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! curl -sf "http://localhost:${PORT}/" >/dev/null 2>&1; then
  echo "Error: quickstart did not become ready on port ${PORT}"
  echo "Check logs: docker logs ${CONTAINER_NAME}"
  exit 1
fi
echo "    Quickstart is up (lab: http://localhost:${PORT}/lab)"

if ! command -v stellar >/dev/null 2>&1; then
  echo "Warning: stellar CLI not found — container is running but network setup skipped."
  echo "Install: cargo install --locked stellar-cli"
  exit 0
fi

echo "==> Configure stellar CLI (local network)"
if ! stellar network ls 2>/dev/null | grep -q '^local$'; then
  stellar network add local \
    --rpc-url "${RPC_URL}" \
    --network-passphrase "${PASSPHRASE}"
fi
stellar network use local

if ! stellar keys address alice --network local >/dev/null 2>&1; then
  echo "==> Generate test key alice"
  stellar keys generate --global alice
fi

echo "==> Fund alice via friendbot"
stellar keys fund alice --network local

echo "==> Local Stellar ready"
echo "    RPC:        ${RPC_URL}"
echo "    Container:  ${CONTAINER_NAME}"
echo "    Next:       ./scripts/verify-on-chain.sh"
