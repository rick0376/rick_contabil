// src/app/api/reports/[reportId]/delete/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    getCurrentAppUser,
} from "@/lib/auth/current-user";
import {
    softDeleteExpertReport,
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
        await softDeleteExpertReport({
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
                "Laudo excluído com sucesso.",
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
            "Erro ao excluir laudo:",
            error,
        );

        return NextResponse.json(
            {
                message:
                    "Não foi possível excluir o laudo.",
            },
            {
                status: 500,
            },
        );
    }
}