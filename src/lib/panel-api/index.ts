//src/lib/panel-api/index.ts

import { z } from "zod";

const responseSchema = z.object({
  allowed: z.boolean(),
  error: z.string().optional(),

  support: z
    .object({
      whatsappLabel: z.string().optional(),
      whatsappNumber: z.string().optional(),
      whatsappMessage: z.string().optional(),
      whatsappUrl: z.string().nullable().optional(),
    })
    .optional(),

  user: z
    .object({
      id: z.string(),
      name: z.string(),
      username: z.string(),
      expiresAt: z.string().nullable().optional(),
      maxDevices: z.number(),
    })
    .optional(),

  project: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      appKey: z.string(),
    })
    .optional(),
});

function getConfig() {
  const baseUrl = process.env.PANEL_API_URL;
  const appKey = process.env.PANEL_APP_KEY;
  if (!baseUrl || !appKey) throw new Error("Integração com painel não configurada");
  return { baseUrl: baseUrl.replace(/\/$/, ""), appKey };
}

export async function panelLogin(input: {
  username: string;
  password: string;
  deviceId: string;
  deviceName?: string;
}) {
  const { baseUrl, appKey } = getConfig();
  const response = await fetch(`${baseUrl}/api/apk/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appKey, ...input }),
    cache: "no-store",
  });
  const data = responseSchema.parse(await response.json());
  return { ok: response.ok && data.allowed, status: response.status, data };
}

export async function panelValidate(input: {
  userId: string;
  deviceId: string;
  deviceName?: string;
}) {
  const { baseUrl, appKey } = getConfig();
  const response = await fetch(`${baseUrl}/api/apk/auth/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appKey, ...input }),
    cache: "no-store",
  });
  const data = responseSchema.parse(await response.json());
  return { ok: response.ok && data.allowed, status: response.status, data };
}
