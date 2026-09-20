// src/app/api/reports/[reportId]/archive/route.ts

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
    archiveExpertReport,
} from "@/lib/reports/expert-report-lifecycle.service";
import {
    ExpertReportServiceError,
} from "@/lib/reports/expert-report.service";

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
            await archiveExpertReport({
                userId:
                    authenticatedUser.user.id,

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

        return NextResponse.json({
            message:
                "Laudo arquivado com sucesso.",

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
            "Erro ao arquivar laudo:",
            error,
        );

        return NextResponse.json(
            {
                message:
                    "Não foi possível arquivar o laudo.",
            },
            {
                status: 500,
            },
        );
    }
}