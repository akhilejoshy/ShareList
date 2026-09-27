import { NextRequest, NextResponse } from "next/server";

// Meta requires this endpoint for apps using Instagram/Facebook Login.
// It must respond with a confirmation URL + code the user can check later.
// Full data-deletion logic (wiping ig_links/users rows) lands in M4.
export async function POST(req: NextRequest) {
  const body = await req.text();
  console.log("[instagram] data deletion request received", body);

  const confirmationCode = crypto.randomUUID();
  const origin = req.nextUrl.origin;

  return NextResponse.json({
    url: `${origin}/data-deletion-status?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
