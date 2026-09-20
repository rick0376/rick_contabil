//src/app/api/processes/[processId]/route.ts

import { AuditAction, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth/current-user";
import { legalProcessCreateSchema } from "@/lib/processes/process.schema";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        processId: string;
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

    const { processId } = await context.params;

    const legalProcess = await prisma.legalProcess.findFirst({
        where: {
            id: processId,
            userId: authenticatedUser.user.id,
            deletedAt: null,
        },

        include: {
            parties: {
                orderBy: [
                    {
                        isPrimary: "desc",
                    },
                    {
                        createdAt: "asc",
                    },
                ],

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
            },

            _count: {
                select: {
                    calculations: true,
                    expertReports: true,
                    documents: true,
                },
            },
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

    return NextResponse.json({
        process: legalProcess,
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

    const { processId } = await context.params;

    try {
        const body: unknown = await request.json();

        const parsed = legalProcessCreateSchema.safeParse(body);

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

        const currentProcess = await prisma.legalProcess.findFirst({
            where: {
                id: processId,
                userId: authenticatedUser.user.id,
                deletedAt: null,
            },
        });

        if (!currentProcess) {
            return NextResponse.json(
                {
                    message: "Processo não encontrado.",
                },
                {
                    status: 404,
                },
            );
        }

        const input = parsed.data;

        const updatedProcess = await prisma.$transaction(
            async (transaction) => {
                const legalProcess =
                    await transaction.legalProcess.update({
                        where: {
                            id: currentProcess.id,
                        },

                        data: {
                            caseNumber: input.caseNumber ?? null,
                            title: input.title,
                            court: input.court ?? null,
                            courtDivision: input.courtDivision ?? null,
                            district: input.district ?? null,
                            city: input.city ?? null,
                            state: input.state ?? null,
                            actionClass: input.actionClass ?? null,
                            subject: input.subject ?? null,
                            expertiseObject: input.expertiseObject ?? null,
                            appointmentDate: parseDate(input.appointmentDate),
                            deadlineDate: parseDate(input.deadlineDate),
                            referenceDate: parseDate(input.referenceDate),
                            status: input.status,
                            notes: input.notes ?? null,
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
                        action: AuditAction.UPDATE,
                        description: `Processo ${legalProcess.title} atualizado.`,

                        previousData: {
                            caseNumber: currentProcess.caseNumber,
                            title: currentProcess.title,
                            court: currentProcess.court,
                            courtDivision: currentProcess.courtDivision,
                            district: currentProcess.district,
                            city: currentProcess.city,
                            state: currentProcess.state,
                            actionClass: currentProcess.actionClass,
                            subject: currentProcess.subject,
                            expertiseObject: currentProcess.expertiseObject,
                            appointmentDate:
                                currentProcess.appointmentDate?.toISOString() ??
                                null,
                            deadlineDate:
                                currentProcess.deadlineDate?.toISOString() ?? null,
                            referenceDate:
                                currentProcess.referenceDate?.toISOString() ?? null,
                            status: currentProcess.status,
                            notes: currentProcess.notes,
                        },

                        newData: {
                            caseNumber: legalProcess.caseNumber,
                            title: legalProcess.title,
                            court: legalProcess.court,
                            courtDivision: legalProcess.courtDivision,
                            district: legalProcess.district,
                            city: legalProcess.city,
                            state: legalProcess.state,
                            actionClass: legalProcess.actionClass,
                            subject: legalProcess.subject,
                            expertiseObject: legalProcess.expertiseObject,
                            appointmentDate:
                                legalProcess.appointmentDate?.toISOString() ?? null,
                            deadlineDate:
                                legalProcess.deadlineDate?.toISOString() ?? null,
                            referenceDate:
                                legalProcess.referenceDate?.toISOString() ?? null,
                            status: legalProcess.status,
                            notes: legalProcess.notes,
                        },

                        userAgent: request.headers.get("user-agent"),
                        ipAddress: getRequestIp(request),
                    },
                });

                return legalProcess;
            },
        );

        return NextResponse.json({
            message: "Processo atualizado com sucesso.",
            process: updatedProcess,
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                {
                    message:
                        "Já existe outro processo cadastrado com esse número.",
                },
                {
                    status: 409,
                },
            );
        }

        console.error("Erro ao atualizar processo:", error);

        return NextResponse.json(
            {
                message: "Não foi possível atualizar o processo.",
            },
            {
                status: 500,
            },
        );
    }
}