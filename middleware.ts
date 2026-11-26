import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // For debugging purposes, log the request URL
  console.log("Middleware processing URL:", request.nextUrl.pathname)

  return NextResponse.next()
}

