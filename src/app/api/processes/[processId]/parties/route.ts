//src/app/api/processes/[processId]/parties/route.ts

import { AuditAction, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth/current-user";
import {
    processPartyCreateSchema,
    processPartyDeleteSchema,
} from "@/lib/processes/process-party.schema";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        processId: string;
    }>;
};

function getRequestIp(request: NextRequest) {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip")
    );
}

export async function POST(
    request: NextRequest,
    context: RouteContext,
) {
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

    const { processId } = await context.params;

    try {
        const body: unknown = await request.json();

        const parsed = processPartyCreateSchema.safeParse(body);

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

        const [legalProcess, client] = await Promise.all([
            prisma.legalProcess.findFirst({
                where: {
                    id: processId,
                    userId: authenticatedUser.user.id,
                    deletedAt: null,
                },
            }),

            prisma.client.findFirst({
                where: {
                    id: input.clientId,
                    userId: authenticatedUser.user.id,
                    deletedAt: null,
                },
            }),
        ]);

        if (!legalProcess) {
            return NextResponse.json(
                {
                    message: "Processo não encontrado.",
                },
                {
                    status: 404,
                },
            );
        }

        if (!client) {
            return NextResponse.json(
                {
                    message: "Cliente não encontrado.",
                },
                {
                    status: 404,
                },
            );
        }

        const party = await prisma.$transaction(
            async (transaction) => {
                if (input.isPrimary) {
                    await transaction.processParty.updateMany({
                        where: {
                            legalProcessId: legalProcess.id,
                            role: input.role,
                        },

                        data: {
                            isPrimary: false,
                        },
                    });
                }

                const createdParty = await transaction.processParty.create({
                    data: {
                        legalProcess: {
                            connect: {
                                id: legalProcess.id,
                            },
                        },

                        client: {
                            connect: {
                                id: client.id,
                            },
                        },

                        role: input.role,
                        isPrimary: input.isPrimary,
                        notes: input.notes ?? null,
                    },

                    include: {
                        client: {
                            select: {
                                id: true,
                                type: true,
                                name: true,
                                tradeName: true,
                                documentNumber: true,
                                email: true,
                                phone: true,
                                mobile: true,
                            },
                        },
                    },
                });

                await transaction.auditEvent.create({
                    data: {
                        user: {
                            connect: {
                                id: authenticatedUser.user.id,
                            },
                        },

                        entityType: "ProcessParty",
                        entityId: createdParty.id,
                        action: AuditAction.CREATE,
                        description: `${client.name} vinculado ao processo ${legalProcess.title}.`,

                        newData: {
                            legalProcessId: legalProcess.id,
                            clientId: client.id,
                            clientName: client.name,
                            role: createdParty.role,
                            isPrimary: createdParty.isPrimary,
                            notes: createdParty.notes,
                        },

                        userAgent: request.headers.get("user-agent"),
                        ipAddress: getRequestIp(request),
                    },
                });

                return createdParty;
            },
        );

        return NextResponse.json(
            {
                message: "Parte vinculada ao processo com sucesso.",
                party,
            },
            {
                status: 201,
            },
        );
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                {
                    message:
                        "Este cliente já está vinculado ao processo com essa função.",
                },
                {
                    status: 409,
                },
            );
        }

        console.error("Erro ao vincular parte ao processo:", error);

        return NextResponse.json(
            {
                message: "Não foi possível vincular a parte ao processo.",
            },
            {
                status: 500,
            },
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: RouteContext,
) {
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

    const { processId } = await context.params;

    try {
        const body: unknown = await request.json();

        const parsed = processPartyDeleteSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    message: "Informe a parte que será removida.",
                    errors: parsed.error.flatten(),
                },
                {
                    status: 400,
                },
            );
        }

        const party = await prisma.processParty.findFirst({
            where: {
                id: parsed.data.partyId,
                legalProcessId: processId,

                legalProcess: {
                    userId: authenticatedUser.user.id,
                    deletedAt: null,
                },
            },

            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                    },
                },

                legalProcess: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        if (!party) {
            return NextResponse.json(
                {
                    message: "Parte não encontrada.",
                },
                {
                    status: 404,
                },
            );
        }

        await prisma.$transaction(async (transaction) => {
            await transaction.processParty.delete({
                where: {
                    id: party.id,
                },
            });

            await transaction.auditEvent.create({
                data: {
                    user: {
                        connect: {
                            id: authenticatedUser.user.id,
                        },
                    },

                    entityType: "ProcessParty",
                    entityId: party.id,
                    action: AuditAction.DELETE,
                    description: `${party.client.name} removido do processo ${party.legalProcess.title}.`,

                    previousData: {
                        legalProcessId: party.legalProcess.id,
                        clientId: party.client.id,
                        clientName: party.client.name,
                        role: party.role,
                        isPrimary: party.isPrimary,
                        notes: party.notes,
                    },

                    userAgent: request.headers.get("user-agent"),
                    ipAddress: getRequestIp(request),
                },
            });
        });

        return NextResponse.json({
            message: "Parte removida do processo com sucesso.",
        });
    } catch (error) {
        console.error("Erro ao remover parte do processo:", error);

        return NextResponse.json(
            {
                message: "Não foi possível remover a parte do processo.",
            },
            {
                status: 500,
            },
        );
    }
}