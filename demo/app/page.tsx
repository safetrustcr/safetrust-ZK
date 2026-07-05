"use client";

import { useCallback, useState } from "react";
import { FreighterConnectButton } from "./components/FreighterConnectButton";
import logoSafetrust from '../app/img/logo-safetrust.png'; 
import Image from "next/image";
import { PollarWalletBar } from "./components/PollarWalletBar";
import {
  SEED_APARTMENTS,
  SEED_GUEST_BALANCE_STROOPS,
  SeedApartment,
  formatUsdc,
  shortAddress,
} from "../lib/seeds";

/**
 * @file demo/app/page.tsx
 *
 * SafeTrust ZK — End-to-end booking demo.
 *
 * Flow:
 *  1. Guest browses seeded apartments and selects one
 *  2. Guest connects Freighter wallet (Mode A) or Pollar (Mode B)
 *  3. ZK pipeline runs: prove funds → private escrow → initialize on TrustlessWork
 *  4. Milestone releases: 70% check-in, 30% checkout
 *  5. Receipt modal shows what IS stored vs what is ZK-protected
 */

const hasPollar = Boolean(process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY);

// ── Types ──────────────────────────────────────────────────────────────────

type StepStatus = "idle" | "loading" | "done" | "error";

interface ZKState {
  fundsProofHash:    string | null;
  commitment:        string | null;
  randomness:        string | null;
  encryptedAmountHex: string | null;
  contractId:        string | null;
  isMockEscrow:      boolean;
  checkinProofHash:  string | null;
  checkoutProofHash: string | null;
}

interface ReceiptData {
  apartment:   SeedApartment;
  guestAddress: string;
  zk:          ZKState;
  checkinDone: boolean;
  checkoutDone: boolean;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ApartmentCard({
  apt,
  selected,
  onSelect,
}: {
  apt: SeedApartment;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`apt-card ${selected ? "apt-card-selected" : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      <div className="apt-image">{apt.image}</div>
      <div className="apt-info">
        <div className="apt-header">
          <div>
            <h3 className="apt-name">{apt.name}</h3>
            <p className="apt-location">📍 {apt.location}</p>
          </div>
          <div className="apt-price">
            <span className="apt-price-amount">{apt.pricePerNight} USDC</span>
            <span className="apt-price-unit">/ night</span>
          </div>
        </div>
        <p className="apt-desc">{apt.description}</p>
        <div className="apt-meta">
          <span>🗓️ {apt.checkIn} → {apt.checkOut} ({apt.nights} nights)</span>
          <span className="apt-total">Total: <b>{apt.totalUsdc} USDC</b></span>
        </div>
        <div className="apt-amenities">
          {apt.amenities.map((a) => (
            <span key={a} className="amenity-tag">{a}</span>
          ))}
        </div>
        <div className="apt-host">
          <span className="host-label">Host:</span>
          <span className="host-name">{apt.hostName}</span>
          <span className="host-address">{shortAddress(apt.hostAddress)}</span>
        </div>
      </div>
    </div>
  );
}

function StepRow({
  num,
  title,
  description,
  status,
  children,
}: {
  num: number;
  title: string;
  description: string;
  status: StepStatus;
  children?: React.ReactNode;
}) {
  const cls = status === "done" ? "step-done"
    : status === "loading" ? "step-active"
    : status === "error" ? "step-error"
    : "";

  return (
    <article className={`step ${cls}`}>
      <span className="step-num">
        {status === "done" ? "✓" : status === "error" ? "✕" : num}
      </span>
      <div className="step-body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="step-actions">{children}</div>
    </article>
  );
}

function ReceiptModal({
  data,
  onClose,
}: {
  data: ReceiptData;
  onClose: () => void;
}) {
  const { apartment: apt, guestAddress, zk, checkinDone, checkoutDone } = data;
  const allDone   = checkinDone && checkoutDone;
  const invoiceNo = `INV${apt.id.toUpperCase().replace("APT-", "")}-ZK`;
  const today     = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// Process steps matching SafeTrust original flow
function truncateHash(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}  

const processSteps = [
    { label: "Property selected",      detail: apt.name,         done: true  },
    { label: "ZK proof of funds",      detail: "Range proof ✓",  done: Boolean(zk.fundsProofHash) },
    { label: "Escrow funded",          detail: zk.contractId ? truncateHash(zk.contractId) : "—", done: Boolean(zk.contractId) },
    { label: "Deposit released",       detail: allDone ? "Both milestones released" : checkinDone ? "Check-in released" : "Pending", done: allDone },
  ];


  return (
    <div className="invoice-modal-backdrop" onClick={onClose}>
      <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div className="inv-topbar">
          <div className="inv-logo">
            
              {/* 2. Replace the text 'S' and 'SafeTrust' with the image */}
              <Image
                  src={logoSafetrust.src}
                  alt="SafeTrust"
                  width={28}
                  height={28}
                  priority
                />
  
            
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="inv-status-badge badge-zk">🔐 ZK-Private</span>
            <button className="inv-close-btn" onClick={onClose}>✕ Close</button>
          </div>
        </div>

        {/* ── Invoice number + status ──────────────────────────────── */}
        <div className="inv-title-row">
          <div className="inv-number-row">
            <span className="inv-number">{invoiceNo}</span>
            <span className={`inv-status-badge ${allDone ? "badge-released" : "badge-funded"}`}>
              {allDone ? "Deposit released" : "Deposit blocked"}
            </span>
            {zk.isMockEscrow && (
              <span className="inv-status-badge badge-mock">testnet mock</span>
            )}
          </div>
          <p className="inv-paid-date">Created {today} · Stellar testnet · Powered by TrustlessWork</p>
        </div>

        {/* ── Body: main + sidebar ─────────────────────────────────── */}
        <div className="inv-body">

          {/* ── Main content ──────────────────────────────────────── */}
          <div className="inv-main">

            {/* Invoice header */}
            <h3 className="inv-section-title">Payment batch — Escrow Status</h3>

            {/* Billing details */}
            <div className="inv-billing-grid">
              <span className="inv-billing-label">Billed to</span>
              <span className="inv-billing-value">{shortAddress(guestAddress)}</span>

              <span className="inv-billing-label">Invoice Number</span>
              <span className="inv-billing-value">{invoiceNo}</span>

              <span className="inv-billing-label">Billing details</span>
              <span className="inv-billing-value">Guest · Freighter Wallet</span>

              <span className="inv-billing-label">Subject</span>
              <span className="inv-billing-value">Rental service — {apt.nights} nights</span>

              <span className="inv-billing-label">Currency</span>
              <span className="inv-billing-value">USDC · Stellar</span>

              <span className="inv-billing-label">Check-in</span>
              <span className="inv-billing-value">{apt.checkIn}</span>

              <span className="inv-billing-label">Check-out</span>
              <span className="inv-billing-value">{apt.checkOut}</span>

              <span className="inv-billing-label">Contract ID</span>
              <span className="inv-billing-value">{zk.contractId ? truncateHash(zk.contractId) : "—"}</span>
            </div>

            {/* Product table */}
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Price / night</th>
                  <th>Nights</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="inv-apt-cell">
                      <span className="inv-apt-thumb">{apt.image}</span>
                      <div>
                        <div className="inv-apt-name">{apt.name}</div>
                        <div className="inv-apt-loc">{apt.location}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="inv-amount-hidden">
                      🔒 <span>ZK-private</span>
                    </div>
                  </td>
                  <td>{apt.nights}</td>
                  <td>
                    <div className="inv-amount-hidden">
                      🔒 <span>ZK-private</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Totals */}
            <div className="inv-totals">
              <div className="inv-total-item">
                <span className="inv-total-label">Subtotal</span>
                <span className="inv-total-value-hidden">🔒 Hidden</span>
              </div>
              <div className="inv-total-item">
                <span className="inv-total-label">Total</span>
                <span className="inv-total-value-hidden">🔒 Hidden</span>
              </div>
            </div>

            {/* ── ZK Privacy section ──────────────────────────────── */}
            <div className="inv-zk-section">
              <div className="inv-zk-title">
                🔐 Zero-Knowledge Privacy Layer
              </div>
              <div className="inv-zk-grid">
                <div className="inv-zk-row">
                  <span className="inv-zk-label">Funds proof</span>
                  <span className="inv-zk-value">
                    {zk.fundsProofHash ? truncateHash(zk.fundsProofHash) : "—"}
                  </span>
                </div>
                <div className="inv-zk-row">
                  <span className="inv-zk-label">Commitment</span>
                  <span className="inv-zk-value">
                    {zk.commitment ? truncateHash(zk.commitment) : "—"}
                  </span>
                </div>
                {zk.checkinProofHash && (
                  <div className="inv-zk-row">
                    <span className="inv-zk-label">Check-in proof</span>
                    <span className="inv-zk-value">{truncateHash(zk.checkinProofHash)}</span>
                  </div>
                )}
                {zk.checkoutProofHash && (
                  <div className="inv-zk-row">
                    <span className="inv-zk-label">Checkout proof</span>
                    <span className="inv-zk-value">{truncateHash(zk.checkoutProofHash)}</span>
                  </div>
                )}
              </div>
              <div className="inv-zk-hidden-row">
                🔒 Not stored in DB:
                <b>booking amount</b> ·
                <b>wallet balance</b> ·
                <b>view key</b> ·
                <b>IP address</b>
              </div>
            </div>

            {/* ── Tenant / Owner info ─────────────────────────────── */}
            <div className="inv-parties">
              <div className="inv-party-box">
                <p className="inv-party-title">Tenant information</p>
                <div className="inv-party-row">
                  <span className="inv-party-key">Tenant name</span>
                  <span className="inv-party-val">Guest</span>
                </div>
                <div className="inv-party-row">
                  <span className="inv-party-key">Wallet address</span>
                  <span className="inv-party-val">{shortAddress(guestAddress)}</span>
                </div>
                <div className="inv-party-row">
                  <span className="inv-party-key">Check-in date</span>
                  <span className="inv-party-val">{apt.checkIn}</span>
                </div>
                <div className="inv-party-row">
                  <span className="inv-party-key">Deposit amount</span>
                  <span className="inv-party-val" style={{ color: "#7c3aed" }}>🔒 ZK-private</span>
                </div>
              </div>

              <div className="inv-party-box">
                <p className="inv-party-title">Owner information</p>
                <div className="inv-party-row">
                  <span className="inv-party-key">Owner name</span>
                  <span className="inv-party-val">{apt.hostName}</span>
                </div>
                <div className="inv-party-row">
                  <span className="inv-party-key">Wallet address</span>
                  <span className="inv-party-val">{shortAddress(apt.hostAddress)}</span>
                </div>
                <div className="inv-party-row">
                  <span className="inv-party-key">Check-out date</span>
                  <span className="inv-party-val">{apt.checkOut}</span>
                </div>
                <div className="inv-party-row">
                  <span className="inv-party-key">Deposit amount</span>
                  <span className="inv-party-val" style={{ color: "#7c3aed" }}>🔒 ZK-private</span>
                </div>
              </div>
            </div>

            {/* ── Milestone releases ──────────────────────────────── */}
            <p className="inv-section-title" style={{ fontSize: "0.85rem" }}>Milestone releases</p>
            <div className="inv-milestones">
              <div className="inv-milestone-row">
                <div className={`inv-milestone-dot ${checkinDone ? "dot-done" : "dot-pending"}`}>
                  {checkinDone ? "✓" : "1"}
                </div>
                <div className="inv-milestone-body">
                  <div className="inv-milestone-label">70% Check-in release</div>
                  <div className="inv-milestone-detail">
                    {checkinDone ? `Released on ${today}` : "Pending guest check-in"}
                  </div>
                  {zk.checkinProofHash && (
                    <div className="inv-milestone-proof">
                      Proof: {truncateHash(zk.checkinProofHash)}
                    </div>
                  )}
                </div>
              </div>
              <div className="inv-milestone-row">
                <div className={`inv-milestone-dot ${checkoutDone ? "dot-done" : "dot-pending"}`}>
                  {checkoutDone ? "✓" : "2"}
                </div>
                <div className="inv-milestone-body">
                  <div className="inv-milestone-label">30% Checkout release</div>
                  <div className="inv-milestone-detail">
                    {checkoutDone ? `Released on ${today}` : "Pending guest checkout"}
                  </div>
                  {zk.checkoutProofHash && (
                    <div className="inv-milestone-proof">
                      Proof: {truncateHash(zk.checkoutProofHash)}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* ── Sidebar ───────────────────────────────────────────── */}
          <div className="inv-sidebar">

            <div>
              <p className="inv-sidebar-section-title">Notes</p>
              <div className="inv-notes-box">
                This escrow is ZK-private. The booking amount is protected
                by a Noir zero-knowledge circuit. Only Pedersen commitments
                and proof hashes are visible on-chain.
              </div>
            </div>

            <div>
              <p className="inv-sidebar-section-title">Process</p>
              <div className="inv-process-list">
                {processSteps.map((step, i) => (
                  <div key={i} className="inv-process-item">
                    <div className={`inv-process-dot ${step.done ? "process-done" : i === processSteps.findIndex(s => !s.done) ? "process-active" : "process-pending"}`}>
                      {step.done ? "✓" : i + 1}
                    </div>
                    <div className="inv-process-text">
                      <strong>{step.label}</strong>
                      {step.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="inv-footer">
          <p className="inv-footer-note">
            Proofs generated via <b>Noir (UltraHonk)</b> · Stellar testnet ·
            TrustlessWork escrow infrastructure. Raw amounts never leave the ZK circuit.
          </p>
          <div className="inv-footer-actions">
            <button className="btn-invoice-close" onClick={onClose}>Close receipt</button>
          </div>
        </div>

      </div>
    </div>
  );
}


// ── Main Page ──────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [selectedApt, setSelectedApt] = useState<SeedApartment | null>(null);
  const [guest,       setGuest]       = useState("");
  const [error,       setError]       = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const [stepStatus, setStepStatus] = useState<Record<string, StepStatus>>({});
  const [zk, setZk] = useState<ZKState>({
    fundsProofHash:     null,
    commitment:         null,
    randomness:         null,
    encryptedAmountHex: null,
    contractId:         null,
    isMockEscrow:       false,
    checkinProofHash:   null,
    checkoutProofHash:  null,
  });

  const onGuestAddress = useCallback((addr: string | null) => {
    if (addr) setGuest(addr);
  }, []);

  const walletConnected = Boolean(guest);
  const aptSelected     = Boolean(selectedApt);
  const escrowFunded    = Boolean(zk.contractId);
  const loading         = Object.values(stepStatus).includes("loading");

  function setStep(key: string, status: StepStatus) {
    setStepStatus((prev) => ({ ...prev, [key]: status }));
  }

  async function apiPost<T>(url: string, body: Record<string, unknown>): Promise<T | null> {
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as T & { error?: string };
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Request failed");
        return null;
      }
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      return null;
    }
  }

  async function runProveFunds() {
    if (!selectedApt || !walletConnected) return;
    setStep("funds", "loading");
    const data = await apiPost<{ valid: boolean; commitment: string; proofHex: string }>(
      "/api/prove-funds",
      {
        balance:   SEED_GUEST_BALANCE_STROOPS,
        threshold: selectedApt.totalStroops,
      }
    );
    if (!data) { setStep("funds", "error"); return; }
    setZk((prev) => ({ ...prev, fundsProofHash: data.proofHex.slice(0, 40) }));
    setStep("funds", "done");
  }

  async function runCommitEscrow() {
    if (!selectedApt || !guest) return;
    setStep("commit", "loading");
    const data = await apiPost<{
      commitment: string; randomness: string;
      encryptedAmountHex: string; proofHex: string;
    }>(
      "/api/commit-escrow",
      {
        amount:       selectedApt.totalStroops,
        guestAddress: guest,
        hostAddress:  selectedApt.hostAddress,
      }
    );
    if (!data) { setStep("commit", "error"); return; }
    setZk((prev) => ({
      ...prev,
      commitment:         data.commitment,
      randomness:         data.randomness,
      encryptedAmountHex: data.encryptedAmountHex,
    }));
    setStep("commit", "done");
  }

  async function runInitializeEscrow() {
    if (!selectedApt || !guest || !zk.commitment) return;
    setStep("escrow", "loading");
    const data = await apiPost<{
      contractId: string; isMock: boolean; status: string;
    }>(
      "/api/initialize-escrow",
      {
        guestAddress: guest,
        hostAddress:  selectedApt.hostAddress,
        amount:       selectedApt.totalStroops,
        apartmentId:  selectedApt.id,
        commitment:   zk.commitment,
        proofHash:    zk.fundsProofHash,
      }
    );
    if (!data) { setStep("escrow", "error"); return; }
    setZk((prev) => ({
      ...prev,
      contractId:   data.contractId,
      isMockEscrow: data.isMock,
    }));
    setStep("escrow", "done");
  }

  async function runMilestone(pct: 70 | 30) {
    if (!selectedApt || !zk.commitment || !zk.randomness) return;
    const key = pct === 70 ? "checkin" : "checkout";
    setStep(key, "loading");
    const data = await apiPost<{
      valid: boolean; releaseCommitment: string; proofHex: string;
    }>(
      "/api/prove-milestone",
      {
        amountCommitment: zk.commitment,
        totalAmount:      selectedApt.totalStroops,
        milestonePct:     pct,
        randomness:       zk.randomness,
      }
    );
    if (!data) { setStep(key, "error"); return; }
    setZk((prev) => ({
      ...prev,
      checkinProofHash:  pct === 70 ? data.proofHex.slice(0, 40) : prev.checkinProofHash,
      checkoutProofHash: pct === 30 ? data.proofHex.slice(0, 40) : prev.checkoutProofHash,
    }));
    setStep(key, "done");
  }

  const checkinDone  = stepStatus["checkin"]  === "done";
  const checkoutDone = stepStatus["checkout"] === "done";
  const allDone      = checkinDone && checkoutDone;

  return (
    <main className="page">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <header className="hero">
        <span className="hero-badge">Stellar · UltraHonk · Noir</span>
        <h1>SafeTrust ZK</h1>
        <p>
          Book a property and pay with a privacy-preserving escrow on Stellar.
          Booking amounts stay hidden — only ZK proofs and Pedersen commitments
          are stored on-chain.
        </p>
      </header>

      {/* ── Step 1: Pick apartment ───────────────────────────────── */}
      <section className="card">
        <h2 className="card-title">① Choose a property</h2>
        <div className="apt-list">
          {SEED_APARTMENTS.map((apt) => (
            <ApartmentCard
              key={apt.id}
              apt={apt}
              selected={selectedApt?.id === apt.id}
              onSelect={() => {
                setSelectedApt(apt);
                setZk({ fundsProofHash: null, commitment: null, randomness: null,
                        encryptedAmountHex: null, contractId: null, isMockEscrow: false,
                        checkinProofHash: null, checkoutProofHash: null });
                setStepStatus({});
                setError(null);
              }}
            />
          ))}
        </div>
      </section>

      {/* ── Step 2: Connect wallet ───────────────────────────────── */}
      <section className="card">
        <h2 className="card-title">② Connect wallet</h2>
        {!hasPollar && <FreighterConnectButton onAddress={onGuestAddress} />}
        {hasPollar  && <PollarWalletBar onGuestAddress={onGuestAddress} />}
        {walletConnected && (
          <p className="wallet-confirmed">
            ✅ Connected as guest: <span className="mono">{shortAddress(guest)}</span>
            {selectedApt && (
              <span className="seeded-balance">
                &nbsp;· Seeded balance: 2,000 USDC (proves ≥ {selectedApt.totalUsdc} USDC)
              </span>
            )}
          </p>
        )}
      </section>

      {/* ── Step 3: ZK Escrow Pipeline ───────────────────────────── */}
      {aptSelected && walletConnected && (
        <section className="card">
          <h2 className="card-title">③ ZK escrow pipeline</h2>

          {selectedApt && (
            <div className="booking-summary">
              <span>{selectedApt.image} <b>{selectedApt.name}</b></span>
              <span>{selectedApt.nights} nights · {selectedApt.checkIn} → {selectedApt.checkOut}</span>
              <span className="booking-amount">
                Amount: <span className="zk-hidden" title="Hidden by ZK">🔒 ZK-private</span>
              </span>
            </div>
          )}

          <div className="pipeline">

            <StepRow
              num={1} title="Prove funds"
              description="Range proof — guest balance ≥ booking amount, balance never revealed"
              status={stepStatus["funds"] ?? "idle"}
            >
              <button
                className="btn btn-primary"
                disabled={loading || stepStatus["funds"] === "done"}
                onClick={() => void runProveFunds()}
              >
                {stepStatus["funds"] === "loading" ? <><span className="spinner" />Proving…</> :
                 stepStatus["funds"] === "done"    ? "✓ Proved" : "Prove"}
              </button>
            </StepRow>

            <StepRow
              num={2} title="Commit escrow amount"
              description="Pedersen commitment + encrypted amount — raw value stays in circuit"
              status={stepStatus["commit"] ?? "idle"}
            >
              <button
                className="btn btn-primary"
                disabled={loading || stepStatus["funds"] !== "done" || stepStatus["commit"] === "done"}
                onClick={() => void runCommitEscrow()}
              >
                {stepStatus["commit"] === "loading" ? <><span className="spinner" />Committing…</> :
                 stepStatus["commit"] === "done"    ? "✓ Committed" : "Commit"}
              </button>
            </StepRow>

            <StepRow
              num={3} title="Initialize escrow on Stellar"
              description="Deploy via TrustlessWork — only commitment hash goes on-chain, not the amount"
              status={stepStatus["escrow"] ?? "idle"}
            >
              <button
                className="btn btn-primary"
                disabled={loading || stepStatus["commit"] !== "done" || stepStatus["escrow"] === "done"}
                onClick={() => void runInitializeEscrow()}
              >
                {stepStatus["escrow"] === "loading" ? <><span className="spinner" />Funding…</> :
                 stepStatus["escrow"] === "done"    ? "✓ Funded" :
                 zk.isMockEscrow                   ? "Fund (mock)" : "Fund escrow"}
              </button>
            </StepRow>

            {escrowFunded && (
              <>
                <div className="milestone-divider">
                  <span>Milestone releases</span>
                </div>

                <StepRow
                  num={4} title="Check-in release · 70%"
                  description="Prove 70% release is correct against the committed total"
                  status={stepStatus["checkin"] ?? "idle"}
                >
                  <button
                    className="btn btn-primary"
                    disabled={loading || checkinDone}
                    onClick={() => void runMilestone(70)}
                  >
                    {stepStatus["checkin"] === "loading" ? <><span className="spinner" />Proving…</> :
                     checkinDone ? "✓ Released" : "Release 70%"}
                  </button>
                </StepRow>

                <StepRow
                  num={5} title="Checkout release · 30%"
                  description="Prove 30% release is correct against the committed total"
                  status={stepStatus["checkout"] ?? "idle"}
                >
                  <button
                    className="btn btn-secondary"
                    disabled={loading || !checkinDone || checkoutDone}
                    onClick={() => void runMilestone(30)}
                  >
                    {stepStatus["checkout"] === "loading" ? <><span className="spinner" />Proving…</> :
                     checkoutDone ? "✓ Released" : "Release 30%"}
                  </button>
                </StepRow>
              </>
            )}
          </div>

          {error && (
            <div className="alert-error" role="alert">{error}</div>
          )}

          {/* CTA to open receipt */}
          {escrowFunded && (
            <div className="receipt-cta">
              <button
                className={`btn btn-receipt ${allDone ? "btn-receipt-complete" : ""}`}
                onClick={() => setShowReceipt(true)}
              >
                {allDone ? "🎉 View Full Receipt" : "📄 View Escrow Receipt"}
              </button>
              {zk.isMockEscrow && (
                <p className="mock-note">
                  ℹ️ TrustlessWork API unreachable — showing testnet mock escrow.
                  ZK proofs are real.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Locked state hint */}
      {(!aptSelected || !walletConnected) && (
        <div className="banner banner-info">
          {!aptSelected
            ? "Select a property above to begin the booking flow."
            : "Connect your Freighter wallet to unlock the ZK pipeline."}
        </div>
      )}

      <footer className="footer-note">
        <p>
          Proofs are generated server-side via <b>Noir (UltraHonk)</b>.
          Raw booking amounts never leave the ZK circuit — only Pedersen
          commitments and proof hashes are stored on-chain.
        </p>
      </footer>

      {/* ── Receipt Modal ─────────────────────────────────────────── */}
      {showReceipt && selectedApt && (
        <ReceiptModal
          data={{ apartment: selectedApt, guestAddress: guest, zk,
                  checkinDone, checkoutDone }}
          onClose={() => setShowReceipt(false)}
        />
      )}

    </main>
  );
}







