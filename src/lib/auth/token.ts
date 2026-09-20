import { SignJWT, jwtVerify } from "jose";

const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error("SESSION_SECRET não configurada");
const key = new TextEncoder().encode(secret);

export type AppSessionPayload = {
  panelUserId: string;
  name: string;
  username: string;
  expiresAt: string | null;
};

export async function createAppToken(payload: AppSessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(key);
}

export async function verifyAppToken(token: string) {
  const { payload } = await jwtVerify(token, key);
  return payload as unknown as AppSessionPayload;
}
