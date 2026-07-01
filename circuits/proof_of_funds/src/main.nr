// Circuit 1 — Proof of Funds (ZK-005)
// Range proof: balance >= threshold with Pedersen commitment.
// Private: balance (u64), randomness (Field)
// Public input: threshold (u64)
// Public output: balance_commitment (Field)

use std::hash::pedersen_hash;

/// Pedersen commitment: H(balance, randomness) as a single field element.
pub fn compute_balance_commitment(balance: u64, randomness: Field) -> Field {
    let balance_field = balance as Field;
    pedersen_hash([balance_field, randomness])
}

fn main(balance: u64, randomness: Field, threshold: pub u64) -> pub Field {
    assert(balance >= threshold);
    compute_balance_commitment(balance, randomness)
}

#[test]
fn test_valid_above_threshold() {
    let balance: u64 = 15_000_000_000;
    let randomness: Field = 12_345;
    let threshold: u64 = 10_000_000_000;
    let commitment = main(balance, randomness, threshold);
    assert(commitment == compute_balance_commitment(balance, randomness));
}

#[test]
fn test_valid_exact_threshold() {
    let balance: u64 = 10_000_000_000;
    let randomness: Field = 99;
    let threshold: u64 = 10_000_000_000;
    let commitment = main(balance, randomness, threshold);
    assert(commitment == compute_balance_commitment(balance, randomness));
}

#[test]
fn test_valid_large_balance() {
    let balance: u64 = 9_999_999_999_999_999;
    let randomness: Field = 0xdeadbeef;
    let threshold: u64 = 1;
    let commitment = main(balance, randomness, threshold);
    assert(commitment == compute_balance_commitment(balance, randomness));
}

#[test(should_fail)]
fn test_rejects_balance_below_threshold() {
    let _ = main(5_000_000_000, 12_345, 10_000_000_000);
}

#[test(should_fail)]
fn test_rejects_balance_one_below_threshold() {
    let _ = main(9_999_999_999, 12_345, 10_000_000_000);
}
