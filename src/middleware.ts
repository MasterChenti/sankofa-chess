import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, the Stockfish engine files and images.
    "/((?!_next/static|_next/image|favicon.ico|icons/|stockfish/|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm)$).*)",
  ],
};
