//src/app/api/calculations/[calculationId]/route.ts

import {
    AuditAction,
    CalculationRevisionStatus,
    CalculationStatus,
    Prisma,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth/current-user";
import { calculationUpdateSchema } from "@/lib/calculations/calculation.schema";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        calculationId: string;
    }>;
};

function parseDate(value?: string) {
    if (!value) {
        return null;
    }

    return new Date(`${value}T12:00:00.000Z`);
}

function getRequestIp(request: NextRequest) {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip")
    );
}

export async function GET(
    _request: NextRequest,
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

    const { calculationId } = await context.params;

    const calculation = await prisma.calculation.findFirst({
        where: {
            id: calculationId,
            userId: authenticatedUser.user.id,
            deletedAt: null,
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

            legalProcess: {
                select: {
                    id: true,
                    caseNumber: true,
                    title: true,
                    court: true,
                    courtDivision: true,
                    status: true,
                },
            },

            revisions: {
                orderBy: {
                    version: "desc",
                },

                include: {
                    lines: {
                        orderBy: {
                            sequence: "asc",
                        },
                    },
                },
            },
        },
    });

    if (!calculation) {
        return NextResponse.json(
            {
                message: "Cálculo não encontrado.",
            },
            {
                status: 404,
            },
        );
    }

    return NextResponse.json({
        calculation: {
            ...calculation,
            notes: calculation.revisions[0]?.notes ?? null,
        },
    });
}

export async function PATCH(
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

    const { calculationId } = await context.params;

    try {
        const body: unknown = await request.json();

        const parsed = calculationUpdateSchema.safeParse(body);

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

        const currentCalculation =
            await prisma.calculation.findFirst({
                where: {
                    id: calculationId,
                    userId: authenticatedUser.user.id,
                    deletedAt: null,
                },

                include: {
                    revisions: {
                        orderBy: {
                            version: "desc",
                        },

                        take: 1,
                    },
                },
            });

        if (!currentCalculation) {
            return NextResponse.json(
                {
                    message: "Cálculo não encontrado.",
                },
                {
                    status: 404,
                },
            );
        }

        const input = parsed.data;

        const [client, legalProcess] = await Promise.all([
            input.clientId
                ? prisma.client.findFirst({
                    where: {
                        id: input.clientId,
                        userId: authenticatedUser.user.id,
                        deletedAt: null,
                    },
                })
                : Promise.resolve(null),

            input.legalProcessId
                ? prisma.legalProcess.findFirst({
                    where: {
                        id: input.legalProcessId,
                        userId: authenticatedUser.user.id,
                        deletedAt: null,
                    },
                })
                : Promise.resolve(null),
        ]);

        if (input.clientId && !client) {
            return NextResponse.json(
                {
                    message: "Cliente não encontrado.",
                },
                {
                    status: 404,
                },
            );
        }

        if (input.legalProcessId && !legalProcess) {
            return NextResponse.json(
                {
                    message: "Processo não encontrado.",
                },
                {
                    status: 404,
                },
            );
        }

        const latestRevision = currentCalculation.revisions[0];
        const referenceDate = parseDate(input.referenceDate);

        const updatedCalculation = await prisma.$transaction(
            async (transaction) => {
                const calculation = await transaction.calculation.update({
                    where: {
                        id: currentCalculation.id,
                    },

                    data: {
                        title: input.title,
                        description: input.description ?? null,
                        referenceDate,
                        status: input.status,

                        client: client
                            ? {
                                connect: {
                                    id: client.id,
                                },
                            }
                            : {
                                disconnect: true,
                            },

                        legalProcess: legalProcess
                            ? {
                                connect: {
                                    id: legalProcess.id,
                                },
                            }
                            : {
                                disconnect: true,
                            },
                    },

                    include: {
                        client: {
                            select: {
                                id: true,
                                type: true,
                                name: true,
                                tradeName: true,
                                documentNumber: true,
                            },
                        },

                        legalProcess: {
                            select: {
                                id: true,
                                caseNumber: true,
                                title: true,
                                status: true,
                            },
                        },

                        _count: {
                            select: {
                                revisions: true,
                            },
                        },
                    },
                });

                if (latestRevision) {
                    await transaction.calculationRevision.update({
                        where: {
                            id: latestRevision.id,
                        },

                        data: {
                            referenceDate,
                            notes: input.notes ?? null,

                            status:
                                input.status === CalculationStatus.FINALIZED
                                    ? CalculationRevisionStatus.FINALIZED
                                    : CalculationRevisionStatus.DRAFT,

                            finalizedAt:
                                input.status === CalculationStatus.FINALIZED
                                    ? latestRevision.finalizedAt ?? new Date()
                                    : null,
                        },
                    });
                }

                await transaction.auditEvent.create({
                    data: {
                        user: {
                            connect: {
                                id: authenticatedUser.user.id,
                            },
                        },

                        entityType: "Calculation",
                        entityId: calculation.id,
                        action: AuditAction.UPDATE,
                        description: `Cálculo ${calculation.title} atualizado.`,

                        previousData: {
                            title: currentCalculation.title,
                            description: currentCalculation.description,
                            clientId: currentCalculation.clientId,
                            legalProcessId:
                                currentCalculation.legalProcessId,
                            referenceDate:
                                currentCalculation.referenceDate?.toISOString() ??
                                null,
                            status: currentCalculation.status,
                            notes: latestRevision?.notes ?? null,
                        },

                        newData: {
                            title: calculation.title,
                            description: calculation.description,
                            clientId: calculation.clientId,
                            legalProcessId: calculation.legalProcessId,
                            referenceDate:
                                calculation.referenceDate?.toISOString() ?? null,
                            status: calculation.status,
                            notes: input.notes ?? null,
                        },

                        userAgent: request.headers.get("user-agent"),
                        ipAddress: getRequestIp(request),
                    },
                });

                return calculation;
            },
        );

        return NextResponse.json({
            message: "Cálculo atualizado com sucesso.",
            calculation: updatedCalculation,
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
        ) {
            return NextResponse.json(
                {
                    message: "Cálculo não encontrado.",
                },
                {
                    status: 404,
                },
            );
        }

        console.error("Erro ao atualizar cálculo:", error);

        return NextResponse.json(
            {
                message: "Não foi possível atualizar o cálculo.",
            },
            {
                status: 500,
            },
        );
    }
}