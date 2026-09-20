import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppSession } from "@/lib/auth/session";
import { panelValidate } from "@/lib/panel-api";

export async function POST() {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ allowed: false }, { status: 401 });

  const store = await cookies();
  const deviceId = store.get("pericia_device")?.value;
  if (!deviceId) return NextResponse.json({ allowed: false }, { status: 401 });

  const result = await panelValidate({ userId: session.panelUserId, deviceId });
  if (!result.ok) {
    const response = NextResponse.json({ allowed: false, error: result.data.error }, { status: result.status });
    response.cookies.set({ name: "pericia_session", value: "", path: "/", maxAge: 0 });
    return response;
  }

  return NextResponse.json({ allowed: true, user: result.data.user });
}
