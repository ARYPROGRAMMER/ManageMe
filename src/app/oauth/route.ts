import { AUTH_COOKIE } from "@/features/auth/constants";
import { createAdminClient } from "@/lib/appwrite";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const secret = request.nextUrl.searchParams.get("secret");

  if (!userId || !secret) {
    return new NextResponse("Missing userId or secret", { status: 400 });
  }

  const { account } = await createAdminClient();
  const session = await account.createSession({
    userId,
    secret,
  });

  const response = NextResponse.redirect(new URL("/", request.url));

  response.cookies.set(AUTH_COOKIE, session.secret, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
