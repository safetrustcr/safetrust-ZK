use crate::{Error, EscrowVerifier, EscrowVerifierClient};
use soroban_sdk::{Bytes, Env};
use ultrahonk_soroban_verifier::PROOF_BYTES;

fn setup_client(env: &Env) -> EscrowVerifierClient<'_> {
    let vk = Bytes::from_array(env, include_bytes!("../test_fixtures/vk.bin"));
    let contract_id = env.register(EscrowVerifier, (&vk,));
    EscrowVerifierClient::new(env, &contract_id)
}

#[test]
fn verify_proof_rejects_empty_proof() {
    let env = Env::default();
    let client = setup_client(&env);

    let empty_proof = Bytes::new(&env);
    let public_inputs = Bytes::from_array(&env, &[0u8; 32]);
    assert_eq!(
        client.try_verify_proof(&public_inputs, &empty_proof),
        Err(Ok(Error::ProofParseError))
    );
}

#[test]
fn verify_proof_rejects_invalid_proof_bytes() {
    let env = Env::default();
    let client = setup_client(&env);

    let bad_proof = Bytes::from_array(&env, &[9u8; PROOF_BYTES]);
    let public_inputs = Bytes::from_array(&env, &[0u8; 32]);
    assert_eq!(
        client.try_verify_proof(&public_inputs, &bad_proof),
        Err(Ok(Error::VerificationFailed))
    );
}

#[test]
fn verify_proof_accepts_generated_fixture() {
    let env = Env::default();
    let client = setup_client(&env);

    let public_inputs = Bytes::from_array(&env, include_bytes!("../test_fixtures/public_inputs.bin"));
    let proof = Bytes::from_array(&env, include_bytes!("../test_fixtures/proof.bin"));

    client.verify_proof(&public_inputs, &proof);
}
