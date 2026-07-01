// Circuit 3 — Milestone Release (ZK-007)
// Proves 70%/30% split against committed total.
// Private: total_amount, randomness
// Public inputs: milestone_pct, amount_commitment
// Public output: release_commitment

use std::hash::pedersen_hash;

/// Pedersen commitment to an amount (matches private_escrow).
pub fn compute_amount_commitment(amount: u64, randomness: Field) -> Field {
    pedersen_hash([(amount as Field), randomness])
}

/// Integer milestone release: total * pct / 100.
pub fn compute_release_amount(total_amount: u64, milestone_pct: u64) -> u64 {
    (total_amount * milestone_pct) / 100
}

/// Commitment to the release slice, bound with the same randomness as the total.
pub fn compute_release_commitment(
    total_amount: u64,
    randomness: Field,
    milestone_pct: u64,
) -> Field {
    let release_amount = compute_release_amount(total_amount, milestone_pct);
    compute_amount_commitment(release_amount, randomness)
}

fn main(
    total_amount: u64,
    randomness: Field,
    milestone_pct: pub u64,
    amount_commitment: pub Field,
) -> pub Field {
    assert((milestone_pct == 70) | (milestone_pct == 30));

    let expected_total_commitment = compute_amount_commitment(total_amount, randomness);
    assert(amount_commitment == expected_total_commitment);

    compute_release_commitment(total_amount, randomness, milestone_pct)
}

#[test]
fn test_seventy_percent_release() {
    let total: u64 = 10_000_000_000;
    let randomness: Field = 99;
    let commitment = compute_amount_commitment(total, randomness);
    let release = main(total, randomness, 70, commitment);

    assert(release == compute_release_commitment(total, randomness, 70));
    assert(compute_release_amount(total, 70) == 7_000_000_000);
}

#[test]
fn test_thirty_percent_release() {
    let total: u64 = 10_000_000_000;
    let randomness: Field = 99;
    let commitment = compute_amount_commitment(total, randomness);
    let release = main(total, randomness, 30, commitment);

    assert(release == compute_release_commitment(total, randomness, 30));
    assert(compute_release_amount(total, 30) == 3_000_000_000);
}

#[test]
fn test_large_total_amount() {
    let total: u64 = 9_999_999_999_999;
    let randomness: Field = 7;
    let commitment = compute_amount_commitment(total, randomness);
    let release = main(total, randomness, 70, commitment);
    assert(release == compute_release_commitment(total, randomness, 70));
}

#[test(should_fail)]
fn test_rejects_invalid_milestone_pct() {
    let total: u64 = 10_000_000_000;
    let commitment = compute_amount_commitment(total, 99);
    let _ = main(total, 99, 50, commitment);
}

#[test(should_fail)]
fn test_rejects_wrong_amount_commitment() {
    let total: u64 = 10_000_000_000;
    let _ = main(total, 99, 70, 0);
}

#[test(should_fail)]
fn test_rejects_wrong_randomness() {
    let total: u64 = 10_000_000_000;
    let commitment = compute_amount_commitment(total, 99);
    let _ = main(total, 1, 70, commitment);
}
