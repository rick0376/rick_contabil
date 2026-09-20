// src/app/api/reports/[reportId]/revisions/route.ts

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
    ExpertReportServiceError,
} from "@/lib/reports/expert-report.service";
import {
    createNewExpertReportRevision,
} from "@/lib/reports/expert-report-workflow.service";

export const runtime = "nodejs";
export const dynamic =
    "force-dynamic";

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

export async function POST(
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
        const report =
            await createNewExpertReportRevision({
                userId:
                    authenticatedUser.user
                        .id,

                reportId,

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
            });

        return NextResponse.json(
            {
                message:
                    "Nova revisão criada com sucesso.",

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

                    code:
                        error.code,
                },
                {
                    status:
                        error.status,
                },
            );
        }

        console.error(
            "Erro ao criar revisão do laudo:",
            error,
        );

        return NextResponse.json(
            {
                message:
                    "Não foi possível criar uma nova revisão.",
            },
            {
                status: 500,
            },
        );
    }
}