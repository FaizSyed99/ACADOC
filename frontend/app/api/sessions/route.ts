import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../src/lib/auth";
import { getUserSessions, createSession } from "../../../src/lib/dal/sessions";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await getUserSessions(session.user.email);
    return NextResponse.json(sessions);
  } catch (error: any) {
    console.error("Fetch Sessions API Error:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, intent, summary } = await req.json();
    if (!subject || !intent) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newSession = await createSession(session.user.email, subject, intent, summary);
    return NextResponse.json({ success: true, session: newSession }, { status: 201 });
  } catch (error: any) {
    console.error("Create Session API Error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
