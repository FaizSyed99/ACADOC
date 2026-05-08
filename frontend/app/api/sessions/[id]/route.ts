import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../src/lib/auth";
import { getSessionMessages, saveMessage } from "../../../../src/lib/dal/sessions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const messages = await getSessionMessages(id);
    return NextResponse.json(messages);
  } catch (error: any) {
    console.error("Fetch Session Messages Error:", error);
    return NextResponse.json({ error: "Failed to fetch session messages" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { message } = await req.json();
    
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    await saveMessage(id, message);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("Save Session Message Error:", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
