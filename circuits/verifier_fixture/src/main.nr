// Minimal circuit for Stellar UltraHonk verifier integration tests (ZK-016).
// Matches NethermindEth/rs-soroban-ultrahonk simple_circuit (bb v0.87.0).
fn main(x: Field, y: pub Field) {
    assert(x != y);
}

#[test]
fn test_main() {
    main(1, 2);
}
