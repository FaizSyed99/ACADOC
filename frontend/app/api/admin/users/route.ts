import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "../../../../src/lib/auth-utils";
import * as UserDAL from "../../../../src/lib/dal/users";
import { z } from "zod";

const querySchema = z.object({
  page: z.string().transform(Number).catch(1),
  limit: z.string().transform(Number).catch(10),
  search: z.string().optional(),
  role: z.string().optional(),
});

/**
 * GET /api/admin/users
 * Lists users with search and pagination for the admin interface.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const { searchParams } = new URL(req.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    const users = await UserDAL.list(params);
    return NextResponse.json(users);
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return new NextResponse("Unauthorized", { status: 401 });
    if (error.message === "FORBIDDEN") return new NextResponse("Forbidden", { status: 403 });
    return new NextResponse(error.message, { status: 400 });
  }
}
