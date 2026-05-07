import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../src/lib/auth";
import { submitReview } from "../../../src/lib/dal/reviews";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rating, comment, answerId } = await req.json();

    if (!rating) {
      return NextResponse.json({ error: "Rating is required" }, { status: 400 });
    }

    const newReview = await submitReview({
      userId: session.user.id,
      contentId: answerId || "chat-response", // Generic fallback if no specific ID
      rating,
      comment: comment || "",
    });

    return NextResponse.json({ success: true, review: newReview }, { status: 201 });
  } catch (error: any) {
    console.error("Feedback API Error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback", details: error.message },
      { status: 500 }
    );
  }
}
