// src/app/api/auth/login/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { panelLogin } from "@/lib/panel-api";
import { createAppToken } from "@/lib/auth/token";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  deviceId: z.string().min(1),
  deviceName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const result = await panelLogin(input);

    if (!result.ok || !result.data.user) {
      return NextResponse.json(
        {
          error: result.data.error || "Acesso negado.",
          support: result.data.support || null,
        },
        { status: result.status },
      );
    }

    const user = result.data.user;

    await prisma.appUserProfile.upsert({
      where: { panelUserId: user.id },
      update: {
        name: user.name,
        username: user.username,
      },
      create: {
        panelUserId: user.id,
        name: user.name,
        username: user.username,
      },
    });

    const token = await createAppToken({
      panelUserId: user.id,
      name: user.name,
      username: user.username,
      expiresAt: user.expiresAt ?? null,
    });

    const response = NextResponse.json({ user });

    response.cookies.set({
      name: "pericia_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set({
      name: "pericia_device",
      value: input.deviceId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    console.error("ERRO LOGIN:", error);

    return NextResponse.json(
      { error: "Não foi possível entrar." },
      { status: 400 },
    );
  }
}