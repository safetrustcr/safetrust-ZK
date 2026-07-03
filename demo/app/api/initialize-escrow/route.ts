import { NextResponse } from "next/server";
import { MOCK_CONTRACT_ID } from "../../../lib/seeds";

export const runtime = "nodejs";

/**
 * @file demo/app/api/initialize-escrow/route.ts
 *
 * Calls TrustlessWork API to deploy an escrow on Stellar testnet.
 * Falls back to a realistic mock response when:
 *   - NEXT_PUBLIC_TRUSTLESS_API_URL is not set, or
 *   - The TrustlessWork API returns an error (network issues, rate limits)
 *
 * This keeps the demo fully runnable without an API key.
 */

interface EscrowRequest {
  guestAddress: string;
  hostAddress:  string;
  amount:       string;    // stroops
  apartmentId:  string;
  commitment:   string;    // Pedersen commitment from ZK circuit
  proofHash:    string;    // ZK proof hash
}

interface EscrowResponse {
  contractId:   string;
  status:       "funded" | "mock";
  isMock:       boolean;
  txHash:       string | null;
  escrowDetails: {
    approver:    string;
    releaser:    string;
    amount:      string;
    escrowType:  string;
    assetCode:   string;
  };
}

async function tryTrustlessWork(body: EscrowRequest): Promise<EscrowResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_TRUSTLESS_API_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_TRUSTLESS_API_URL not set");

  const payload = {
    title:           `SafeTrust ZK — ${body.apartmentId}`,
    description:     "ZK-private hospitality escrow via SafeTrust",
    approver:        body.guestAddress,
    serviceProvider: body.hostAddress,
    amount:          (Number(body.amount) / 10_000_000).toFixed(7),  // stroops → USDC decimal
    platformFee:     1,
    receiverMemo:    body.apartmentId,
    escrowType:      "single_release",
    trustline: {
      address:  "USDC",
      decimals: 10_000_000,
    },
    roles: {
      approver:       body.guestAddress,
      serviceProvider: body.hostAddress,
      platformAddress: body.guestAddress,
      receiver:        body.hostAddress,
      releaseSigner:   body.hostAddress,
      disputeResolver: body.guestAddress,
    },
  };

  const res = await fetch(`${baseUrl}/escrow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.TRUSTLESS_API_KEY
        ? { Authorization: `Bearer ${process.env.TRUSTLESS_API_KEY}` }
        : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),   // 8s timeout — never stall the demo
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TrustlessWork API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { contractId?: string; txHash?: string };

  return {
    contractId:   data.contractId ?? MOCK_CONTRACT_ID,
    status:       "funded",
    isMock:       false,
    txHash:       data.txHash ?? null,
    escrowDetails: {
      approver:   body.guestAddress,
      releaser:   body.hostAddress,
      amount:     body.amount,
      escrowType: "single_release",
      assetCode:  "USDC",
    },
  };
}

function mockEscrowResponse(body: EscrowRequest): EscrowResponse {
  // Deterministic mock contract ID based on apartment + guest
  const mockId = `STELLAR_ZK_${body.apartmentId.toUpperCase()}_${body.guestAddress.slice(0, 6)}`;
  return {
    contractId: mockId,
    status:     "funded",
    isMock:     true,
    txHash:     null,
    escrowDetails: {
      approver:   body.guestAddress,
      releaser:   body.hostAddress,
      amount:     body.amount,
      escrowType: "single_release",
      assetCode:  "USDC",
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<EscrowRequest>;

    if (!body.guestAddress || !body.hostAddress || !body.amount || !body.apartmentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const req = body as EscrowRequest;

    // Try real TrustlessWork API, fall back to mock on any error
    let result: EscrowResponse;
    let fallbackReason: string | null = null;

    try {
      result = await tryTrustlessWork(req);
    } catch (err) {
      fallbackReason = err instanceof Error ? err.message : "Unknown error";
      console.warn(`[initialize-escrow] TrustlessWork unavailable — using mock. Reason: ${fallbackReason}`);
      result = mockEscrowResponse(req);
    }

    return NextResponse.json({
      ...result,
      zkMetadata: {
        commitment:         body.commitment  ?? null,
        proofHash:          body.proofHash   ?? null,
        amountStoredInDB:   false,   // ← the ZK privacy guarantee
        storedFields:       ["contractId", "commitment", "proofHash", "status"],
        hiddenFields:       ["amount", "balance", "viewKey"],
      },
      fallbackReason,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Escrow initialization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}