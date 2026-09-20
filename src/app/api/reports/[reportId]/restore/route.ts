// src/app/api/reports/[reportId]/restore/route.ts

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
    restoreExpertReport,
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
            await restoreExpertReport({
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
                "Laudo restaurado com sucesso.",

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
            "Erro ao restaurar laudo:",
            error,
        );

        return NextResponse.json(
            {
                message:
                    "Não foi possível restaurar o laudo.",
            },
            {
                status: 500,
            },
        );
    }
}