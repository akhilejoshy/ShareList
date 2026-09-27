import { NextRequest, NextResponse } from "next/server";

// Called by Meta when a user removes Sharelist's access from their Instagram
// account settings. Full ig_links cleanup lands in M4; for now just ack.
export async function POST(req: NextRequest) {
  const body = await req.text();
  console.log("[instagram] deauthorize callback received", body);
  return NextResponse.json({ ok: true });
}
