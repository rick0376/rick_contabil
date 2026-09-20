//src/app/api/processes/[processId]/delete/route.ts

import {
    AuditAction,
    LegalProcessStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth/current-user";
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
        const legalProcess = await prisma.legalProcess.findFirst({
            where: {
                id: processId,
                userId: authenticatedUser.user.id,
                deletedAt: null,
            },
        });

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

        await prisma.$transaction(async (transaction) => {
            await transaction.legalProcess.update({
                where: {
                    id: legalProcess.id,
                },

                data: {
                    status: LegalProcessStatus.ARCHIVED,
                    deletedAt: new Date(),
                },
            });

            await transaction.auditEvent.create({
                data: {
                    user: {
                        connect: {
                            id: authenticatedUser.user.id,
                        },
                    },

                    entityType: "LegalProcess",
                    entityId: legalProcess.id,
                    action: AuditAction.DELETE,
                    description: `Processo ${legalProcess.title ?? legalProcess.caseNumber ?? legalProcess.id} excluído.`,

                    previousData: {
                        id: legalProcess.id,
                        caseNumber: legalProcess.caseNumber,
                        title: legalProcess.title,
                        court: legalProcess.court,
                        courtDivision: legalProcess.courtDivision,
                        status: legalProcess.status,
                    },

                    newData: {
                        status: LegalProcessStatus.ARCHIVED,
                        deletedAt: new Date().toISOString(),
                    },

                    userAgent: request.headers.get("user-agent"),
                    ipAddress: getRequestIp(request),
                },
            });
        });

        return NextResponse.json({
            message: "Processo excluído com sucesso.",
        });
    } catch (error) {
        console.error("Erro ao excluir processo:", error);

        return NextResponse.json(
            {
                message: "Não foi possível excluir o processo.",
            },
            {
                status: 500,
            },
        );
    }
}