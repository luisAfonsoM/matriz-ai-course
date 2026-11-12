import { NextResponse } from "next/server";
import { getClearCookieHeader } from "@/modules/auth/auth.service";

export async function POST() {
  const response = NextResponse.json(
    {
      message: "Sessão terminada com sucesso.",
    },
    { status: 200 }
  );

  response.headers.set("Set-Cookie", getClearCookieHeader());
  return response;
}
