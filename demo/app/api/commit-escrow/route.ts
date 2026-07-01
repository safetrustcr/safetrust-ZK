import { NextResponse } from "next/server";
import { SafeTrustZK } from "@safetrust/zk-sdk";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      amount?: string;
      guestAddress?: string;
      hostAddress?: string;
    };
    if (!body.amount || !body.guestAddress || !body.hostAddress) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const zk = new SafeTrustZK();
    const result = await zk.commitEscrowAmount({
      amount: BigInt(body.amount),
      guestAddress: body.guestAddress,
      hostAddress: body.hostAddress,
    });

    return NextResponse.json({
      commitment: result.commitment,
      randomness: result.randomness,
      encryptedAmountHex: Buffer.from(result.encryptedAmount).toString("hex"),
      viewKeyHex: Buffer.from(result.viewKey).toString("hex"),
      proofHex: Buffer.from(result.proof).toString("hex"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "commit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
