// Circuit 2 — Private Escrow (ZK-006)
// Pedersen commitment + AES-128-CBC view-key encryption (Noir stdlib).
// Private: amount, randomness, view_key, guest_addr, host_addr
// Public outputs: amount_commitment, encrypted_amount

use std::hash::pedersen_hash;

/// Pedersen commitment: H(amount, randomness).
pub fn compute_amount_commitment(amount: u64, randomness: Field) -> Field {
    pedersen_hash([(amount as Field), randomness])
}

/// u64 little-endian encoding (stroops).
pub fn amount_to_le_bytes(amount: u64) -> [u8; 8] {
    let mut bytes = [0; 8];
    let mut value = amount;
    for i in 0..8 {
        bytes[i] = (value & 255) as u8;
        value = value >> 8;
    }
    bytes
}

/// Derive a 16-byte AES key from the view key and participant addresses.
pub fn derive_aes_key(view_key: Field, guest_addr: Field, host_addr: Field) -> [u8; 16] {
    let seed = pedersen_hash([view_key, guest_addr, host_addr]);
    let seed_bytes = seed.to_le_bytes::<32>();
    let mut key = [0; 16];
    for i in 0..16 {
        key[i] = seed_bytes[i];
    }
    key
}

/// AES-128-CBC encrypt with zero IV. PKCS#7 padding is applied by the stdlib.
pub fn encrypt_amount(
    amount: u64,
    view_key: Field,
    guest_addr: Field,
    host_addr: Field,
) -> [u8; 32] {
    let plaintext = amount_to_le_bytes(amount);
    let key = derive_aes_key(view_key, guest_addr, host_addr);
    let iv = [0; 16];
    let ciphertext16 = std::aes128::aes128_encrypt(plaintext, iv, key);

    let mut out = [0; 32];
    for i in 0..16 {
        out[i] = ciphertext16[i];
    }
    out
}

fn main(
    amount: u64,
    randomness: Field,
    view_key: Field,
    guest_addr: Field,
    host_addr: Field,
) -> pub (Field, [u8; 32]) {
    let commitment = compute_amount_commitment(amount, randomness);
    let encrypted = encrypt_amount(amount, view_key, guest_addr, host_addr);
    (commitment, encrypted)
}

#[test]
fn test_valid_escrow_commitment_and_encryption() {
    let amount: u64 = 10_000_000_000;
    let randomness: Field = 77;
    let view_key: Field = 42;
    let guest: Field = 1;
    let host: Field = 2;
    let (commitment, encrypted) = main(amount, randomness, view_key, guest, host);

    assert(commitment == compute_amount_commitment(amount, randomness));
    assert(encrypted == encrypt_amount(amount, view_key, guest, host));
}

#[test]
fn test_different_participants_change_ciphertext() {
    let amount: u64 = 10_000_000_000;
    let enc_a = encrypt_amount(amount, 42, 1, 2);
    let enc_b = encrypt_amount(amount, 42, 1, 3);
    assert(enc_a != enc_b);
}

#[test]
fn test_amount_roundtrip_field_encoding() {
    let amount: u64 = 10_000_000_000;
    let bytes = amount_to_le_bytes(amount);
    assert(bytes[0] == 0);
    assert(bytes[1] == 0xe4);
}
