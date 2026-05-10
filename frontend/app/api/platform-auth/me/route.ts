import { NextRequest, NextResponse } from "next/server";
import { getPlatformSession } from "@/lib/platform-session";

export async function GET(req: NextRequest) {
  const session = await getPlatformSession(req.cookies);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user: session });
}
