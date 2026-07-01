# Circuit Design Reference

Detailed I/O tables for each Noir circuit. See [README](../README.md#circuit-design) for summaries.

## proof_of_funds.nr (ZK-005)

| Direction | Field | Type |
|-----------|-------|------|
| Private | `balance` | u64 |
| Private | `randomness` | Field |
| Public | `balance_commitment` | Field |
| Public | `threshold` | u64 |

**Constraint:** `balance >= threshold` and Pedersen commitment binding.

## private_escrow.nr (ZK-006)

| Direction | Field | Type |
|-----------|-------|------|
| Private | `amount` | u64 |
| Private | `view_key` | Field |
| Private | `guest_addr` | Field |
| Private | `host_addr` | Field |
| Public | `amount_commitment` | Field |
| Public | `encrypted_amount` | [u8; 32] |

## milestone_release.nr (ZK-007)

| Direction | Field | Type |
|-----------|-------|------|
| Private | `total_amount` | u64 |
| Private | `randomness` | Field |
| Public | `amount_commitment` | Field |
| Public | `release_commitment` | Field |
| Public | `milestone_pct` | u64 |

**Constraint:** `milestone_pct ∈ {70, 30}`.
