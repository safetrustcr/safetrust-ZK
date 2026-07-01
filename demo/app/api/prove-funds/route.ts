import { NextResponse } from "next/server";
import { SafeTrustZK } from "@safetrust/zk-sdk";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      balance?: string;
      threshold?: string;
    };
    if (!body.balance || !body.threshold) {
      return NextResponse.json({ error: "balance and threshold required" }, { status: 400 });
    }

    const zk = new SafeTrustZK();
    const result = await zk.proveOfFunds({
      balance: BigInt(body.balance),
      threshold: BigInt(body.threshold),
    });

    return NextResponse.json({
      valid: result.valid,
      commitment: result.commitment,
      proofHex: Buffer.from(result.proof).toString("hex"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "prove failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
