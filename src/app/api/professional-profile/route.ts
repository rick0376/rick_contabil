//src/app/api/professional-profile/route.ts

import { AuditAction } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth/current-user";
import { professionalProfileSchema } from "@/lib/profile/professional-profile.schema";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalizeDigits(value?: string) {
    const normalized = value?.replace(/\D/g, "") ?? "";

    return normalized || null;
}

function getRequestIp(request: NextRequest) {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip")
    );
}

export async function GET() {
    const authenticatedUser = await getCurrentAppUser();

    if (!authenticatedUser) {
        return NextResponse.json(
            {
                message: "Sessão inválida ou expirada.",
            },
            {
                status: 401,
            },
        );
    }

    const profile = await prisma.professionalProfile.findUnique({
        where: {
            userId: authenticatedUser.user.id,
        },
    });

    return NextResponse.json({
        profile,
        user: {
            name: authenticatedUser.user.name,
            username: authenticatedUser.user.username,
        },
    });
}

export async function PUT(request: NextRequest) {
    const authenticatedUser = await getCurrentAppUser();

    if (!authenticatedUser) {
        return NextResponse.json(
            {
                message: "Sessão inválida ou expirada.",
            },
            {
                status: 401,
            },
        );
    }

    try {
        const body: unknown = await request.json();

        const parsed = professionalProfileSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    message: "Verifique os dados informados.",
                    errors: parsed.error.flatten(),
                },
                {
                    status: 400,
                },
            );
        }

        const input = parsed.data;

        const currentProfile =
            await prisma.professionalProfile.findUnique({
                where: {
                    userId: authenticatedUser.user.id,
                },
            });

        const profileData = {
            fullName: input.fullName,
            cpf: normalizeDigits(input.cpf),
            crcNumber: input.crcNumber ?? null,
            crcState: input.crcState ?? null,
            crcCategory: input.crcCategory ?? null,
            businessName: input.businessName ?? null,
            email: input.email ?? null,
            phone: input.phone ?? null,
            whatsapp: input.whatsapp ?? null,
            addressLine: input.addressLine ?? null,
            addressNumber: input.addressNumber ?? null,
            addressComplement: input.addressComplement ?? null,
            district: input.district ?? null,
            city: input.city ?? null,
            state: input.state ?? null,
            zipCode: normalizeDigits(input.zipCode),
            reportClosingText: input.reportClosingText ?? null,
            signatureName: input.signatureName ?? null,
            signatureTitle: input.signatureTitle ?? null,
        };

        const savedProfile = await prisma.$transaction(
            async (transaction) => {
                const profile = currentProfile
                    ? await transaction.professionalProfile.update({
                        where: {
                            id: currentProfile.id,
                        },

                        data: profileData,
                    })
                    : await transaction.professionalProfile.create({
                        data: {
                            user: {
                                connect: {
                                    id: authenticatedUser.user.id,
                                },
                            },

                            ...profileData,
                        },
                    });

                await transaction.auditEvent.create({
                    data: {
                        user: {
                            connect: {
                                id: authenticatedUser.user.id,
                            },
                        },

                        entityType: "ProfessionalProfile",
                        entityId: profile.id,

                        action: currentProfile
                            ? AuditAction.UPDATE
                            : AuditAction.CREATE,

                        description: currentProfile
                            ? "Perfil profissional atualizado."
                            : "Perfil profissional cadastrado.",

                        ...(currentProfile
                            ? {
                                previousData: {
                                    fullName: currentProfile.fullName,
                                    cpf: currentProfile.cpf,
                                    crcNumber: currentProfile.crcNumber,
                                    crcState: currentProfile.crcState,
                                    crcCategory: currentProfile.crcCategory,
                                    businessName: currentProfile.businessName,
                                    email: currentProfile.email,
                                    phone: currentProfile.phone,
                                    whatsapp: currentProfile.whatsapp,
                                    addressLine: currentProfile.addressLine,
                                    addressNumber: currentProfile.addressNumber,
                                    addressComplement:
                                        currentProfile.addressComplement,
                                    district: currentProfile.district,
                                    city: currentProfile.city,
                                    state: currentProfile.state,
                                    zipCode: currentProfile.zipCode,
                                    reportClosingText:
                                        currentProfile.reportClosingText,
                                    signatureName:
                                        currentProfile.signatureName,
                                    signatureTitle:
                                        currentProfile.signatureTitle,
                                },
                            }
                            : {}),

                        newData: {
                            fullName: profile.fullName,
                            cpf: profile.cpf,
                            crcNumber: profile.crcNumber,
                            crcState: profile.crcState,
                            crcCategory: profile.crcCategory,
                            businessName: profile.businessName,
                            email: profile.email,
                            phone: profile.phone,
                            whatsapp: profile.whatsapp,
                            addressLine: profile.addressLine,
                            addressNumber: profile.addressNumber,
                            addressComplement: profile.addressComplement,
                            district: profile.district,
                            city: profile.city,
                            state: profile.state,
                            zipCode: profile.zipCode,
                            reportClosingText: profile.reportClosingText,
                            signatureName: profile.signatureName,
                            signatureTitle: profile.signatureTitle,
                        },

                        userAgent: request.headers.get("user-agent"),
                        ipAddress: getRequestIp(request),
                    },
                });

                return profile;
            },
        );

        return NextResponse.json({
            message: currentProfile
                ? "Perfil profissional atualizado com sucesso."
                : "Perfil profissional cadastrado com sucesso.",

            profile: savedProfile,
        });
    } catch (error) {
        console.error("Erro ao salvar perfil profissional:", error);

        return NextResponse.json(
            {
                message:
                    "Não foi possível salvar o perfil profissional.",
            },
            {
                status: 500,
            },
        );
    }
}