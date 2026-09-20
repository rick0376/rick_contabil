// src/app/api/reports/[reportId]/route.ts

import {
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
    expertReportRevisionUpdateSchema,
} from "@/lib/reports/expert-report.schema";
import {
    ExpertReportServiceError,
} from "@/lib/reports/expert-report.service";
import {
    updateCurrentExpertReportRevision,
} from "@/lib/reports/expert-report-update.service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        reportId: string;
    }>;
};

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

export async function GET(
    _request: NextRequest,
    context: RouteContext,
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

    const { reportId } =
        await context.params;

    try {
        const report =
            await prisma.expertReport.findFirst({
                where: {
                    id: reportId,

                    userId:
                        authenticatedUser.user.id,

                    deletedAt: null,
                },

                include: {
                    client: {
                        include: {
                            addresses: {
                                orderBy: [
                                    {
                                        isPrimary:
                                            "desc",
                                    },
                                    {
                                        createdAt:
                                            "asc",
                                    },
                                ],
                            },
                        },
                    },

                    legalProcess: {
                        include: {
                            parties: {
                                orderBy: [
                                    {
                                        isPrimary:
                                            "desc",
                                    },
                                    {
                                        createdAt:
                                            "asc",
                                    },
                                ],

                                include: {
                                    client: true,
                                },
                            },
                        },
                    },

                    revisions: {
                        orderBy: {
                            version: "desc",
                        },

                        include: {
                            sections: {
                                orderBy: {
                                    position:
                                        "asc",
                                },
                            },

                            calculationLinks: {
                                orderBy: {
                                    position:
                                        "asc",
                                },

                                include: {
                                    calculation: {
                                        select: {
                                            id: true,
                                            type: true,
                                            title: true,
                                            description:
                                                true,
                                            currency:
                                                true,
                                            currentVersion:
                                                true,
                                        },
                                    },

                                    calculationRevision:
                                    {
                                        include:
                                        {
                                            lines: {
                                                orderBy:
                                                {
                                                    sequence:
                                                        "asc",
                                                },
                                            },
                                        },
                                    },
                                },
                            },

                            generatedDocuments:
                            {
                                orderBy: {
                                    createdAt:
                                        "desc",
                                },
                            },
                        },
                    },

                    generatedDocuments: {
                        orderBy: {
                            createdAt:
                                "desc",
                        },
                    },
                },
            });

        if (!report) {
            return NextResponse.json(
                {
                    message:
                        "Laudo não encontrado.",
                },
                {
                    status: 404,
                },
            );
        }

        return NextResponse.json({
            report:
                toCanonicalJson(
                    report,
                ),
        });
    } catch (error) {
        console.error(
            "Erro ao carregar laudo:",
            error,
        );

        return NextResponse.json(
            {
                message:
                    "Não foi possível carregar o laudo.",
            },
            {
                status: 500,
            },
        );
    }
}

export async function PATCH(
    request: NextRequest,
    context: RouteContext,
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

    const { reportId } =
        await context.params;

    try {
        const body: unknown =
            await request.json();

        const parsed =
            expertReportRevisionUpdateSchema.safeParse(
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
            await updateCurrentExpertReportRevision(
                {
                    userId:
                        authenticatedUser.user
                            .id,

                    reportId,

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

        return NextResponse.json({
            message:
                "Laudo atualizado com sucesso.",

            report:
                toCanonicalJson(
                    report,
                ),
        });
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
                        "Já existe um laudo com esse número ou existem posições de seção repetidas.",
                },
                {
                    status: 409,
                },
            );
        }

        console.error(
            "Erro ao atualizar laudo:",
            error,
        );

        return NextResponse.json(
            {
                message:
                    "Não foi possível atualizar o laudo.",
            },
            {
                status: 500,
            },
        );
    }
}