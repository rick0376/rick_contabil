// src/app/api/reports/route.ts

import {
    ExpertReportStatus,
    Prisma,
} from "@prisma/client";
import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    getCurrentAppUser,
} from "@/lib/auth/current-user";
import {
    toCanonicalJson,
} from "@/lib/reports/expert-report-hash";
import {
    expertReportCreateSchema,
} from "@/lib/reports/expert-report.schema";
import {
    createExpertReportFromCalculation,
    ExpertReportServiceError,
} from "@/lib/reports/expert-report.service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getRequestIp(
    request: NextRequest,
) {
    return (
        request.headers
            .get("x-forwarded-for")
            ?.split(",")[0]
            ?.trim() ??
        request.headers.get(
            "x-real-ip",
        )
    );
}

function parseStatus(
    value: string | null,
) {
    if (!value) {
        return null;
    }

    const normalized =
        value.trim().toUpperCase();

    return Object.values(
        ExpertReportStatus,
    ).includes(
        normalized as ExpertReportStatus,
    )
        ? (normalized as ExpertReportStatus)
        : null;
}

export async function GET(
    request: NextRequest,
) {
    const authenticatedUser =
        await getCurrentAppUser();

    if (!authenticatedUser) {
        return NextResponse.json(
            {
                message:
                    "Sessão inválida ou expirada.",
            },
            {
                status: 401,
            },
        );
    }

    const search =
        request.nextUrl.searchParams
            .get("search")
            ?.trim() ?? "";

    const requestedStatus =
        request.nextUrl.searchParams.get(
            "status",
        );

    const status = parseStatus(
        requestedStatus,
    );

    if (
        requestedStatus &&
        !status
    ) {
        return NextResponse.json(
            {
                message:
                    "Situação de laudo inválida.",
            },
            {
                status: 400,
            },
        );
    }

    try {
        const reports =
            await prisma.expertReport.findMany({
                where: {
                    userId:
                        authenticatedUser.user.id,

                    deletedAt: null,

                    ...(status
                        ? {
                            status,
                        }
                        : {}),

                    ...(search
                        ? {
                            OR: [
                                {
                                    title: {
                                        contains:
                                            search,

                                        mode: "insensitive",
                                    },
                                },

                                {
                                    reportNumber:
                                    {
                                        contains:
                                            search,

                                        mode: "insensitive",
                                    },
                                },

                                {
                                    client: {
                                        name: {
                                            contains:
                                                search,

                                            mode: "insensitive",
                                        },
                                    },
                                },

                                {
                                    legalProcess:
                                    {
                                        title: {
                                            contains:
                                                search,

                                            mode: "insensitive",
                                        },
                                    },
                                },

                                {
                                    legalProcess:
                                    {
                                        caseNumber:
                                        {
                                            contains:
                                                search,

                                            mode: "insensitive",
                                        },
                                    },
                                },
                            ],
                        }
                        : {}),
                },

                orderBy: {
                    updatedAt: "desc",
                },

                include: {
                    client: {
                        select: {
                            id: true,
                            type: true,
                            name: true,
                            tradeName: true,
                            documentNumber:
                                true,
                        },
                    },

                    legalProcess: {
                        select: {
                            id: true,
                            caseNumber: true,
                            title: true,
                            court: true,
                            courtDivision:
                                true,
                            status: true,
                        },
                    },

                    revisions: {
                        orderBy: {
                            version: "desc",
                        },

                        take: 1,

                        select: {
                            id: true,
                            version: true,
                            status: true,
                            templateVersion:
                                true,
                            integrityHash:
                                true,
                            createdAt: true,
                            updatedAt: true,

                            _count: {
                                select: {
                                    sections:
                                        true,

                                    calculationLinks:
                                        true,

                                    generatedDocuments:
                                        true,
                                },
                            },
                        },
                    },

                    _count: {
                        select: {
                            revisions: true,
                            generatedDocuments:
                                true,
                        },
                    },
                },
            });

        return NextResponse.json({
            reports:
                toCanonicalJson(
                    reports,
                ),
        });
    } catch (error) {
        console.error(
            "Erro ao listar laudos:",
            error,
        );

        return NextResponse.json(
            {
                message:
                    "Não foi possível carregar os laudos.",
            },
            {
                status: 500,
            },
        );
    }
}

export async function POST(
    request: NextRequest,
) {
    const authenticatedUser =
        await getCurrentAppUser();

    if (!authenticatedUser) {
        return NextResponse.json(
            {
                message:
                    "Sessão inválida ou expirada.",
            },
            {
                status: 401,
            },
        );
    }

    try {
        const body: unknown =
            await request.json();

        const parsed =
            expertReportCreateSchema.safeParse(
                body,
            );

        if (!parsed.success) {
            return NextResponse.json(
                {
                    message:
                        "Verifique os dados informados.",

                    errors:
                        parsed.error.flatten(),
                },
                {
                    status: 400,
                },
            );
        }

        const report =
            await createExpertReportFromCalculation(
                {
                    userId:
                        authenticatedUser.user
                            .id,

                    input:
                        parsed.data,

                    requestMetadata: {
                        ipAddress:
                            getRequestIp(
                                request,
                            ),

                        userAgent:
                            request.headers.get(
                                "user-agent",
                            ),
                    },
                },
            );

        return NextResponse.json(
            {
                message:
                    "Laudo criado com sucesso.",

                report:
                    toCanonicalJson(
                        report,
                    ),
            },
            {
                status: 201,
            },
        );
    } catch (error) {
        if (
            error instanceof
            ExpertReportServiceError
        ) {
            return NextResponse.json(
                {
                    message:
                        error.message,

                    code: error.code,
                },
                {
                    status:
                        error.status,
                },
            );
        }

        if (
            error instanceof
            Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                {
                    message:
                        "Já existe um laudo com esse número.",
                },
                {
                    status: 409,
                },
            );
        }

        console.error(
            "Erro ao criar laudo:",
            error,
        );

        return NextResponse.json(
            {
                message:
                    "Não foi possível criar o laudo.",
            },
            {
                status: 500,
            },
        );
    }
}