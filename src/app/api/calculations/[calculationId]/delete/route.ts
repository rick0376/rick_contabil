//src/app/api/calculations/[calculationId]/delete/route.ts

import {
    AuditAction,
    CalculationStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        calculationId: string;
    }>;
};

function getRequestIp(request: NextRequest) {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip")
    );
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

    const { calculationId } = await context.params;

    try {
        const calculation = await prisma.calculation.findFirst({
            where: {
                id: calculationId,
                userId: authenticatedUser.user.id,
                deletedAt: null,
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

        const deletedAt = new Date();

        await prisma.$transaction(async (transaction) => {
            await transaction.calculation.update({
                where: {
                    id: calculation.id,
                },

                data: {
                    status: CalculationStatus.ARCHIVED,
                    deletedAt,
                },
            });

            await transaction.auditEvent.create({
                data: {
                    user: {
                        connect: {
                            id: authenticatedUser.user.id,
                        },
                    },

                    entityType: "Calculation",
                    entityId: calculation.id,
                    action: AuditAction.DELETE,
                    description: `Cálculo ${calculation.title ?? calculation.type
                        } excluído.`,

                    previousData: {
                        id: calculation.id,
                        type: calculation.type,
                        title: calculation.title,
                        status: calculation.status,
                        clientId: calculation.clientId,
                        legalProcessId: calculation.legalProcessId,
                        currentVersion: calculation.currentVersion,
                    },

                    newData: {
                        status: CalculationStatus.ARCHIVED,
                        deletedAt: deletedAt.toISOString(),
                    },

                    userAgent: request.headers.get("user-agent"),
                    ipAddress: getRequestIp(request),
                },
            });
        });

        return NextResponse.json({
            message: "Cálculo excluído com sucesso.",
        });
    } catch (error) {
        console.error("Erro ao excluir cálculo:", error);

        return NextResponse.json(
            {
                message: "Não foi possível excluir o cálculo.",
            },
            {
                status: 500,
            },
        );
    }
}