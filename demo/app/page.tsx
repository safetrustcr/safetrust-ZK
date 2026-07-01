"use client";

import { useCallback, useState } from "react";
import { PollarConfigBanner, PollarWalletBar } from "./components/PollarWalletBar";

type StepResult = {
  label: string;
  data: Record<string, unknown>;
};

const STROOPS = 10_000_000_000n;
const hasPollar = Boolean(process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY);

function formatUsdc(stroops: string): string {
  try {
    const n = BigInt(stroops);
    const whole = n / 10_000_000n;
    const frac = n % 10_000_000n;
    if (frac === 0n) return `${whole} USDC`;
    return `${whole}.${frac.toString().padStart(7, "0").replace(/0+$/, "")} USDC`;
  } catch {
    return "—";
  }
}

function StepButton({
  label,
  loading,
  disabled,
  onClick,
  variant = "primary",
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      className={`btn btn-${variant}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span className="spinner" aria-hidden />}
      {label}
    </button>
  );
}

export default function DemoPage() {
  const [balance, setBalance] = useState("15000000000");
  const [amount, setAmount] = useState(STROOPS.toString());
  const [guest, setGuest] = useState("");
  const [host, setHost] = useState("HOST");
  const [results, setResults] = useState<StepResult[]>([]);
  const [escrow, setEscrow] = useState<{
    commitment: string;
    randomness: string;
  } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onGuestAddress = useCallback((address: string | null) => {
    if (address) setGuest(address);
  }, []);

  const walletRequired = hasPollar && !guest;
  const step1Done = results.some((r) => r.label === "Prove Funds");
  const step2Done = results.some((r) => r.label === "Private Escrow");
  const step3Done = results.some((r) => r.label.startsWith("Milestone"));

  async function runStep(name: string, url: string, body: Record<string, unknown>) {
    setLoading(name);
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      setLoading(null);
      return null;
    }
    setResults((prev) => [...prev.filter((r) => r.label !== name), { label: name, data }]);
    setLoading(null);
    return data;
  }

  return (
    <main className="page">
      <header className="hero">
        <span className="hero-badge">Stellar · UltraHonk · Pollar</span>
        <h1>SafeTrust ZK Pipeline</h1>
        <p>
          Prove solvency, commit a private escrow amount, and verify milestone releases — without
          exposing booking values on-chain.
        </p>
      </header>

      {!hasPollar && <PollarConfigBanner />}
      {hasPollar && (
        <section className="card">
          <h2 className="card-title">Connect</h2>
          <PollarWalletBar onGuestAddress={onGuestAddress} />
        </section>
      )}

      {walletRequired && (
        <div className="banner banner-info" role="status">
          Connect your wallet to unlock the pipeline. Your Stellar address becomes the guest
          identity in the escrow proof.
        </div>
      )}

      <section className="card">
        <h2 className="card-title">Escrow parameters</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="balance">Guest balance</label>
            <input
              id="balance"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              inputMode="numeric"
            />
            <span className="field-hint">{formatUsdc(balance)} (stroops)</span>
          </div>
          <div className="field">
            <label htmlFor="amount">Booking amount</label>
            <input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
            />
            <span className="field-hint">{formatUsdc(amount)} threshold</span>
          </div>
          <div className="field field-full">
            <label htmlFor="guest">Guest address</label>
            <input
              id="guest"
              value={guest}
              readOnly={hasPollar}
              placeholder={hasPollar ? "Connect wallet above" : "G…"}
              onChange={(e) => setGuest(e.target.value)}
            />
          </div>
          <div className="field field-full">
            <label htmlFor="host">Host address</label>
            <input id="host" value={host} onChange={(e) => setHost(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">ZK pipeline</h2>
        <div className="pipeline">
          <article
            className={`step ${step1Done ? "step-done" : loading === "Prove Funds" ? "step-active" : ""}`}
          >
            <span className="step-num">1</span>
            <div className="step-body">
              <h3>Prove funds</h3>
              <p>Range proof — balance ≥ booking amount without revealing balance</p>
            </div>
            <div className="step-actions">
              <StepButton
                label={loading === "Prove Funds" ? "Proving…" : step1Done ? "Re-run" : "Prove"}
                loading={loading === "Prove Funds"}
                disabled={!!loading || walletRequired}
                onClick={() =>
                  void runStep("Prove Funds", "/api/prove-funds", {
                    balance,
                    threshold: amount,
                  })
                }
              />
            </div>
          </article>

          <article
            className={`step ${step2Done ? "step-done" : loading === "Private Escrow" ? "step-active" : ""}`}
          >
            <span className="step-num">2</span>
            <div className="step-body">
              <h3>Private escrow</h3>
              <p>Pedersen commitment + encrypted amount for guest & host</p>
            </div>
            <div className="step-actions">
              <StepButton
                label={loading === "Private Escrow" ? "Committing…" : step2Done ? "Re-commit" : "Commit"}
                loading={loading === "Private Escrow"}
                disabled={!!loading || walletRequired}
                onClick={() =>
                  void (async () => {
                    const data = await runStep("Private Escrow", "/api/commit-escrow", {
                      amount,
                      guestAddress: guest,
                      hostAddress: host,
                    });
                    if (data) {
                      setEscrow({
                        commitment: String(data.commitment),
                        randomness: String(data.randomness),
                      });
                    }
                  })()
                }
              />
            </div>
          </article>

          <article
            className={`step ${step3Done ? "step-done" : loading?.startsWith("Milestone") ? "step-active" : ""}`}
          >
            <span className="step-num">3</span>
            <div className="step-body">
              <h3>Milestone release</h3>
              <p>Prove 70% check-in or 30% checkout against committed total</p>
            </div>
            <div className="step-actions">
              <StepButton
                label={loading === "Milestone 70%" ? "Proving…" : "70%"}
                loading={loading === "Milestone 70%"}
                disabled={!!loading || !escrow || walletRequired}
                onClick={() =>
                  void runStep("Milestone 70%", "/api/prove-milestone", {
                    amountCommitment: escrow?.commitment,
                    totalAmount: amount,
                    milestonePct: 70,
                    randomness: escrow?.randomness,
                  })
                }
              />
              <StepButton
                label={loading === "Milestone 30%" ? "Proving…" : "30%"}
                loading={loading === "Milestone 30%"}
                disabled={!!loading || !escrow || walletRequired}
                variant="secondary"
                onClick={() =>
                  void runStep("Milestone 30%", "/api/prove-milestone", {
                    amountCommitment: escrow?.commitment,
                    totalAmount: amount,
                    milestonePct: 30,
                    randomness: escrow?.randomness,
                  })
                }
              />
            </div>
          </article>
        </div>
      </section>

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <section className="card">
          <h2 className="card-title">Proof output</h2>
          <div className="results-list">
            {results.map((item) => (
              <details key={item.label} className="result-item" open>
                <summary>{item.label}</summary>
                <pre>{JSON.stringify(item.data, null, 2)}</pre>
              </details>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
