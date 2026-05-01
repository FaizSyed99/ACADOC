import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "../../../../src/lib/auth-utils";
import * as ReviewDAL from "../../../../src/lib/dal/reviews";
import { z } from "zod";

/**
 * GET /api/admin/reviews
 * Retrieves reviews that need moderation.
 */
export async function GET() {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const reviews = await ReviewDAL.getPendingReviews();
    return NextResponse.json(reviews);
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return new NextResponse("Unauthorized", { status: 401 });
    if (error.message === "FORBIDDEN") return new NextResponse("Forbidden", { status: 403 });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

const moderateSchema = z.object({
  id: z.string(),
  status: z.enum(["approved", "rejected"]),
});

/**
 * PUT /api/admin/reviews
 * Approves or rejects a specific textbook content review.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const body = await req.json();
    const { id, status } = moderateSchema.parse(body);

    const result = await ReviewDAL.moderateReview(id, status, session.user!.id! as string);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return new NextResponse("Unauthorized", { status: 401 });
    if (error.message === "FORBIDDEN") return new NextResponse("Forbidden", { status: 403 });
    return new NextResponse(error.message, { status: 400 });
  }
}
