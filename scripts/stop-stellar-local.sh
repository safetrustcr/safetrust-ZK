#!/usr/bin/env bash
set -euo pipefail
CONTAINER_NAME="${STELLAR_CONTAINER_NAME:-safetrust-stellar}"
if docker ps -aq -f "name=^${CONTAINER_NAME}$" | grep -q .; then
  docker stop "${CONTAINER_NAME}" >/dev/null
  echo "Stopped ${CONTAINER_NAME}"
else
  echo "No container named ${CONTAINER_NAME}"
fi
