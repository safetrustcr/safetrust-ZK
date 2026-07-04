-- ============================================================
-- SafeTrust ZK — Minimal DB for MVP demo
-- Only the tables the ZK pipeline actually reads/writes.
-- No users, no apartments, no bids, no roles.
-- Seeded data replaces all of that for the demo.
-- ============================================================

-- ① Escrow record — TrustlessWork mirror
--   ZK reads:  contract_id, approver, marker, amount
--   ZK writes: escrow_metadata JSONB (proof hash + commitment)
CREATE TABLE IF NOT EXISTS public.trustless_work_escrows (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  VARCHAR(255) UNIQUE NOT NULL,
  marker       VARCHAR(255) NOT NULL,  -- host wallet
  approver     VARCHAR(255) NOT NULL,  -- guest wallet
  releaser     VARCHAR(255) NOT NULL,  -- platform wallet
  escrow_type  VARCHAR(50)  NOT NULL DEFAULT 'single_release',
  status       VARCHAR(50)  NOT NULL DEFAULT 'created',
  asset_code   VARCHAR(10)  NOT NULL DEFAULT 'USDC',
  amount       DECIMAL(20,7) NOT NULL,
  escrow_metadata JSONB,               -- zk_proof_hash, zk_amount_commitment
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  tenant_id    VARCHAR(255) NOT NULL DEFAULT 'safetrust'
);

-- ② Milestone record — per booking (check_in 70%, check_out 30%)
--   ZK writes: metadata JSONB (zk_release_proof_hash, zk_milestone_pct)
CREATE TABLE IF NOT EXISTS public.escrow_milestones (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id    UUID         NOT NULL REFERENCES public.trustless_work_escrows(id) ON DELETE CASCADE,
  milestone_id VARCHAR(255) NOT NULL,  -- 'check_in' | 'check_out'
  description  TEXT         NOT NULL,
  status       VARCHAR(50)  NOT NULL DEFAULT 'pending',
  metadata     JSONB,                  -- zk_release_proof_hash, zk_milestone_pct
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  tenant_id    VARCHAR(255) NOT NULL DEFAULT 'safetrust',
  CONSTRAINT unique_escrow_milestone UNIQUE(escrow_id, milestone_id)
);

-- ③ ZK proof audit log — append-only, never updated
--   Written by generateAndStoreProofAsync() after each proof
CREATE TABLE IF NOT EXISTS public.zk_proof_log (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id    VARCHAR(255) NOT NULL,
  circuit        VARCHAR(50)  NOT NULL
                 CHECK (circuit IN ('proof_of_funds','private_escrow','milestone_release')),
  proof_hash     TEXT         NOT NULL,
  commitment     TEXT         NOT NULL,
  milestone_pct  INTEGER      CHECK (milestone_pct IN (70, 30)),
  circuit_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  tenant_id      VARCHAR(255) NOT NULL DEFAULT 'safetrust'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_escrows_contract_id  ON public.trustless_work_escrows(contract_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status        ON public.trustless_work_escrows(status);
CREATE INDEX IF NOT EXISTS idx_milestones_escrow_id  ON public.escrow_milestones(escrow_id);
CREATE INDEX IF NOT EXISTS idx_zk_log_contract_id    ON public.zk_proof_log(contract_id);
CREATE INDEX IF NOT EXISTS idx_zk_log_circuit        ON public.zk_proof_log(circuit);
CREATE INDEX IF NOT EXISTS idx_zk_log_created_at     ON public.zk_proof_log(created_at);

-- Comments
COMMENT ON TABLE public.trustless_work_escrows IS 'TrustlessWork escrow mirror — ZK writes proof hashes to escrow_metadata';
COMMENT ON TABLE public.escrow_milestones      IS 'Milestone releases — ZK writes release proofs to metadata';
COMMENT ON TABLE public.zk_proof_log           IS 'Append-only audit log of all ZK proof events';

-- Seed data — matches demo/lib/seeds.ts apartments
-- Allows the demo to run fully without a real TrustlessWork call
INSERT INTO public.trustless_work_escrows
  (contract_id, marker, approver, releaser, amount, status)
VALUES
  ('STELLAR_ZK_APT-STELLAR-001_DEMO',
   'GBVUDZKUNVHBHGFHWP3QZLXFZSQPFBEZOVQHP5DWVVMJZE5TSTV7VAD',
   'GUEST_WALLET_PLACEHOLDER',
   'GUEST_WALLET_PLACEHOLDER',
   450.0000000, 'created'),
  ('STELLAR_ZK_APT-STELLAR-002_DEMO',
   'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3RTLMQPD8',
   'GUEST_WALLET_PLACEHOLDER',
   'GUEST_WALLET_PLACEHOLDER',
   1100.0000000, 'created'),
  ('STELLAR_ZK_APT-STELLAR-003_DEMO',
   'GDMXNQBJMS3FYI4PJTZZVFY4ZXZQSZ3IOMKJMZF6ZCQZXE7I7XDOIK',
   'GUEST_WALLET_PLACEHOLDER',
   'GUEST_WALLET_PLACEHOLDER',
   720.0000000, 'created')
ON CONFLICT (contract_id) DO NOTHING;