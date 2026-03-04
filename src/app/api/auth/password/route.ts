import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password === process.env.BEE_ACCESS_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set("bee_auth", process.env.BEE_AUTH_SECRET!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
