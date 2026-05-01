import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "../../../../src/lib/auth-utils";
import * as ActivityDAL from "../../../../src/lib/dal/activity";
import { z } from "zod";

const querySchema = z.object({
  userId: z.string(),
  limit: z.string().transform(Number).catch(50),
});

/**
 * GET /api/admin/activity
 * Retrieves the clinical search and view history for a specific user.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const { searchParams } = new URL(req.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    const logs = await ActivityDAL.getUserActivity(params.userId, { limit: params.limit });
    return NextResponse.json(logs);
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return new NextResponse("Unauthorized", { status: 401 });
    if (error.message === "FORBIDDEN") return new NextResponse("Forbidden", { status: 403 });
    return new NextResponse(error.message, { status: 400 });
  }
}
