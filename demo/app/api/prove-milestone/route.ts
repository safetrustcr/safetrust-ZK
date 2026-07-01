import { NextResponse } from "next/server";
import { SafeTrustZK } from "@safetrust/zk-sdk";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      amountCommitment?: string;
      totalAmount?: string;
      milestonePct?: 70 | 30;
      randomness?: string;
    };
    if (!body.totalAmount || !body.milestonePct || !body.randomness || !body.amountCommitment) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const zk = new SafeTrustZK();
    const result = await zk.proveMilestoneRelease({
      amountCommitment: body.amountCommitment,
      totalAmount: BigInt(body.totalAmount),
      milestonePct: body.milestonePct,
      randomness: body.randomness,
    });

    return NextResponse.json({
      valid: result.valid,
      releaseCommitment: result.releaseCommitment,
      proofHex: Buffer.from(result.proof).toString("hex"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "milestone prove failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
