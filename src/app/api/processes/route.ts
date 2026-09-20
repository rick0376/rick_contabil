//src/app/api/processes/route.ts

import {
    AuditAction,
    LegalProcessStatus,
    Prisma,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth/current-user";
import { legalProcessCreateSchema } from "@/lib/processes/process.schema";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;

    const search = searchParams.get("search")?.trim() ?? "";
    const statusParam = searchParams.get("status");

    const status = Object.values(LegalProcessStatus).includes(
        statusParam as LegalProcessStatus,
    )
        ? (statusParam as LegalProcessStatus)
        : undefined;

    const searchFilters: Prisma.LegalProcessWhereInput[] = search
        ? [
            {
                caseNumber: {
                    contains: search,
                    mode: "insensitive",
                },
            },
            {
                title: {
                    contains: search,
                    mode: "insensitive",
                },
            },
            {
                court: {
                    contains: search,
                    mode: "insensitive",
                },
            },
            {
                courtDivision: {
                    contains: search,
                    mode: "insensitive",
                },
            },
            {
                actionClass: {
                    contains: search,
                    mode: "insensitive",
                },
            },
            {
                subject: {
                    contains: search,
                    mode: "insensitive",
                },
            },
        ]
        : [];

    const processes = await prisma.legalProcess.findMany({
        where: {
            userId: authenticatedUser.user.id,
            deletedAt: null,
            status,

            ...(searchFilters.length > 0
                ? {
                    OR: searchFilters,
                }
                : {}),
        },

        select: {
            id: true,
            caseNumber: true,
            title: true,
            court: true,
            courtDivision: true,
            district: true,
            city: true,
            state: true,
            actionClass: true,
            subject: true,
            expertiseObject: true,
            appointmentDate: true,
            deadlineDate: true,
            referenceDate: true,
            status: true,
            notes: true,
            createdAt: true,
            updatedAt: true,

            _count: {
                select: {
                    parties: true,
                    calculations: true,
                    expertReports: true,
                    documents: true,
                },
            },
        },

        orderBy: [
            {
                updatedAt: "desc",
            },
            {
                createdAt: "desc",
            },
        ],

        take: 200,
    });

    return NextResponse.json({
        processes,
        total: processes.length,
    });
}

export async function POST(request: NextRequest) {
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

        const input = parsed.data;

        const legalProcess = await prisma.$transaction(
            async (transaction) => {
                const createdProcess =
                    await transaction.legalProcess.create({
                        data: {
                            user: {
                                connect: {
                                    id: authenticatedUser.user.id,
                                },
                            },

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

                        select: {
                            id: true,
                            caseNumber: true,
                            title: true,
                            court: true,
                            courtDivision: true,
                            district: true,
                            city: true,
                            state: true,
                            actionClass: true,
                            subject: true,
                            expertiseObject: true,
                            appointmentDate: true,
                            deadlineDate: true,
                            referenceDate: true,
                            status: true,
                            notes: true,
                            createdAt: true,
                            updatedAt: true,
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
                        entityId: createdProcess.id,
                        action: AuditAction.CREATE,
                        description: `Processo ${createdProcess.title} cadastrado.`,

                        newData: {
                            id: createdProcess.id,
                            caseNumber: createdProcess.caseNumber,
                            title: createdProcess.title,
                            court: createdProcess.court,
                            courtDivision: createdProcess.courtDivision,
                            district: createdProcess.district,
                            city: createdProcess.city,
                            state: createdProcess.state,
                            actionClass: createdProcess.actionClass,
                            subject: createdProcess.subject,
                            expertiseObject: createdProcess.expertiseObject,
                            appointmentDate:
                                createdProcess.appointmentDate?.toISOString() ??
                                null,
                            deadlineDate:
                                createdProcess.deadlineDate?.toISOString() ?? null,
                            referenceDate:
                                createdProcess.referenceDate?.toISOString() ?? null,
                            status: createdProcess.status,
                            notes: createdProcess.notes,
                        },

                        userAgent: request.headers.get("user-agent"),
                        ipAddress: getRequestIp(request),
                    },
                });

                return createdProcess;
            },
        );

        return NextResponse.json(
            {
                message: "Processo cadastrado com sucesso.",
                process: legalProcess,
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
                        "Já existe um processo cadastrado com esse número.",
                },
                {
                    status: 409,
                },
            );
        }

        console.error("Erro ao cadastrar processo:", error);

        return NextResponse.json(
            {
                message: "Não foi possível cadastrar o processo.",
            },
            {
                status: 500,
            },
        );
    }
}