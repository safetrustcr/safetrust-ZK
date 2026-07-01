# 1. Start Docker (pull image if missing, start or reuse container, fund alice)
./scripts/start-stellar-local.sh
# or: make start-stellar-local

# 2. Build fixtures (beta.9 only for this step)
noirup -v 1.0.0-beta.9
make prepare-verifier-fixtures
noirup -v 1.0.0-beta.22

# 3. Deploy + verify (assumes quickstart is already up)
./scripts/verify-on-chain.sh
# or: make verify-on-chain

# Stop when done
./scripts/stop-stellar-local.sh





########################################################


pnpm install
make test-all                    # circuits + SDK + contract tests

pnpm --filter safetrust-zk-demo dev   # demo UI (no wallet yet)

# Optional on-chain path
make start-stellar-local
noirup -v 1.0.0-beta.9 && make prepare-verifier-fixtures && noirup -v 1.0.0-beta.22
make verify-on-chain