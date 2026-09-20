//src/lib/auth/session.ts

import { cookies } from "next/headers";
import { verifyAppToken } from "./token";

export async function getAppSession() {
  try {
    const store = await cookies();
    const token = store.get("pericia_session")?.value;
    if (!token) return null;
    return await verifyAppToken(token);
  } catch {
    return null;
  }
}
