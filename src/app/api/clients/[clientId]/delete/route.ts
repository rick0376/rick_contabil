//src/app/api/clients/[clientId]/delete/route.ts

import {
    AuditAction,
    RecordStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        clientId: string;
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

    const { clientId } = await context.params;

    try {
        const client = await prisma.client.findFirst({
            where: {
                id: clientId,
                userId: authenticatedUser.user.id,
                deletedAt: null,
            },
        });

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

        await prisma.$transaction(async (transaction) => {
            await transaction.client.update({
                where: {
                    id: client.id,
                },

                data: {
                    status: RecordStatus.ARCHIVED,
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

                    entityType: "Client",
                    entityId: client.id,
                    action: AuditAction.DELETE,
                    description: `Cliente ${client.name} excluído.`,

                    previousData: {
                        id: client.id,
                        type: client.type,
                        status: client.status,
                        name: client.name,
                        tradeName: client.tradeName,
                        documentNumber: client.documentNumber,
                        email: client.email,
                        phone: client.phone,
                        mobile: client.mobile,
                    },

                    newData: {
                        status: RecordStatus.ARCHIVED,
                        deletedAt: new Date().toISOString(),
                    },

                    userAgent: request.headers.get("user-agent"),
                    ipAddress: getRequestIp(request),
                },
            });
        });

        return NextResponse.json({
            message: "Cliente excluído com sucesso.",
        });
    } catch (error) {
        console.error("Erro ao excluir cliente:", error);

        return NextResponse.json(
            {
                message: "Não foi possível excluir o cliente.",
            },
            {
                status: 500,
            },
        );
    }
}