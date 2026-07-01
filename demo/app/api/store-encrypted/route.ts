import { NextResponse } from "next/server";

const store = new Map<string, { encryptedAmount: string; viewKeyHash: string }>();

/** ZK-019: off-chain encrypted amount storage (in-memory for demo). */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    contractId?: string;
    encryptedAmount?: string;
    viewKeyHash?: string;
  };

  const { contractId, encryptedAmount, viewKeyHash } = body;
  if (!contractId || !encryptedAmount || !viewKeyHash) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const token = crypto.randomUUID();
  store.set(token, { encryptedAmount, viewKeyHash });

  return NextResponse.json({ token, contractId });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || !store.has(token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(store.get(token));
}
