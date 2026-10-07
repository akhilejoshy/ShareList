import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { tmdbProvider } from "@/lib/providers/tmdb";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  const results = await tmdbProvider.search(q);
  return NextResponse.json({ results });
}
