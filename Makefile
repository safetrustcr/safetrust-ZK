.PHONY: compile-all compile-proof-of-funds compile-private-escrow compile-milestone-release \
	check-nargo check-bb execute-all prove-proof-of-funds prove-private-escrow \
	prove-milestone-release prepare-verifier-fixtures test-circuits test-all

NARGO_MIN_VERSION := 0.30.0
CIRCUITS := proof_of_funds private_escrow milestone_release
BB := bb
# bb 5.0 uses --verifier_target evm (keccak) for local prove/verify
BB_TARGET := evm

check-nargo:
	@command -v nargo >/dev/null 2>&1 || { \
		echo "Error: nargo not found. Install Noir >= $(NARGO_MIN_VERSION):"; \
		echo "  curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash"; \
		echo "  noirup"; \
		exit 1; \
	}
	@echo "Using $$(nargo --version)"

check-bb:
	@command -v $(BB) >/dev/null 2>&1 || { \
		echo "Error: bb not found. Install Barretenberg (after nargo):"; \
		echo "  curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/refs/heads/next/barretenberg/bbup/install | bash"; \
		echo "  bbup"; \
		exit 1; \
	}
	@echo "Using $$($(BB) --version)"

compile-all: check-nargo compile-proof-of-funds compile-private-escrow compile-milestone-release
	@echo "All circuits compiled successfully."

compile-proof-of-funds: check-nargo
	cd circuits/proof_of_funds && nargo compile

compile-private-escrow: check-nargo
	cd circuits/private_escrow && nargo compile

compile-milestone-release: check-nargo
	cd circuits/milestone_release && nargo compile

test-circuits: check-nargo
	@for circuit in $(CIRCUITS); do \
		echo "Testing $$circuit..."; \
		cd circuits/$$circuit && nargo test && cd ../..; \
	done

execute-all: check-nargo
	@for circuit in $(CIRCUITS); do \
		echo "Executing $$circuit..."; \
		cd circuits/$$circuit && nargo compile && nargo execute && cd ../..; \
	done

prove-proof-of-funds: check-nargo check-bb
	cd circuits/proof_of_funds && nargo compile && nargo execute
	cd circuits/proof_of_funds && $(BB) prove --verifier_target $(BB_TARGET) \
		-b ./target/proof_of_funds.json -w ./target/proof_of_funds.gz --write_vk -o ./target
	cd circuits/proof_of_funds && $(BB) verify --verifier_target $(BB_TARGET) \
		-p ./target/proof -k ./target/vk
	@echo "proof_of_funds: prove + verify OK"

prove-private-escrow: check-nargo check-bb
	cd circuits/private_escrow && nargo compile && nargo execute
	cd circuits/private_escrow && $(BB) prove --verifier_target $(BB_TARGET) \
		-b ./target/private_escrow.json -w ./target/private_escrow.gz --write_vk -o ./target
	cd circuits/private_escrow && $(BB) verify --verifier_target $(BB_TARGET) \
		-p ./target/proof -k ./target/vk
	@echo "private_escrow: prove + verify OK"

prove-milestone-release: check-nargo check-bb
	cd circuits/milestone_release && nargo compile && nargo execute
	cd circuits/milestone_release && $(BB) prove --verifier_target $(BB_TARGET) \
		-b ./target/milestone_release.json -w ./target/milestone_release.gz --write_vk -o ./target
	cd circuits/milestone_release && $(BB) verify --verifier_target $(BB_TARGET) \
		-p ./target/proof -k ./target/vk
	@echo "milestone_release: prove + verify OK"

prepare-verifier-fixtures:
	@bash scripts/build-stellar-fixtures.sh

start-stellar-local:
	@bash scripts/start-stellar-local.sh

stop-stellar-local:
	@bash scripts/stop-stellar-local.sh

verify-on-chain:
	@bash scripts/verify-on-chain.sh

test-all: compile-all test-circuits prove-proof-of-funds prepare-verifier-fixtures
	@echo "Running SDK tests..."
	pnpm --filter @safetrust/zk-sdk test
	@echo "Running Soroban contract tests..."
	cd contracts/escrow_verifier && cargo test
	@echo "All tests passed."
