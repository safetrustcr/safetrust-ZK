import { NextRequest, NextResponse } from "next/server";

const POLLAR_API = process.env.POLLAR_API_BASE_URL ?? "https://sdk.api.pollar.xyz";

/** Simulates backend KYC approval for deferred wallet activation (Pollar funding mode). */
export async function POST(req: NextRequest) {
  const secret = process.env.POLLAR_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "POLLAR_SECRET_KEY is not configured on the server" },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { walletId?: string };
  if (!body.walletId) {
    return NextResponse.json({ error: "walletId is required" }, { status: 400 });
  }

  const response = await fetch(`${POLLAR_API}/v1/wallets/activate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ walletId: body.walletId }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status });
  }

  return NextResponse.json({ activated: true, ...payload });
}
