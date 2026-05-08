import { auth } from "./src/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { nextUrl } = req

  // Protect all routes except auth-related ones and assets
  if (!isLoggedIn && nextUrl.pathname !== "/signin") {
    return NextResponse.redirect(new URL("/signin", nextUrl))
  }

  return NextResponse.next()
})

// Specify which routes middleware should run on
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
