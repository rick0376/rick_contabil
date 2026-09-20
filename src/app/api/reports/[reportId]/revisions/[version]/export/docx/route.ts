// src/app/api/reports/[reportId]/revisions/[version]/export/docx/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    getCurrentAppUser,
} from "@/lib/auth/current-user";
import {
    buildExpertReportDocx,
} from "@/lib/reports/expert-report-docx";
import {
    getExpertReportExportFileName,
    loadExpertReportExportSource,
    registerExpertReportExport,
} from "@/lib/reports/expert-report-export.service";
import {
    ExpertReportServiceError,
} from "@/lib/reports/expert-report.service";

export const runtime = "nodejs";
export const dynamic =
    "force-dynamic";

type RouteContext = {
    params: Promise<{
        reportId: string;
        version: string;
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

function parseVersion(
    value: string,
) {
    const version = Number(value);

    return Number.isInteger(version) &&
        version > 0
        ? version
        : null;
}

export async function GET(
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

    const {
        reportId,
        version: versionParam,
    } = await context.params;

    const version = parseVersion(
        versionParam,
    );

    if (!version) {
        return NextResponse.json(
            {
                message:
                    "A versão do laudo é inválida.",
            },
            {
                status: 400,
            },
        );
    }

    try {
        const source =
            await loadExpertReportExportSource(
                {
                    userId:
                        authenticatedUser.user
                            .id,

                    reportId,
                    version,
                },
            );

        const buffer =
            await buildExpertReportDocx(
                source,
            );

        const fileName =
            getExpertReportExportFileName(
                source,
                "docx",
            );

        await registerExpertReportExport(
            {
                userId:
                    authenticatedUser.user
                        .id,

                source,
                fileName,

                mimeType:
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

                buffer:
                    new Uint8Array(
                        buffer,
                    ),

                format: "DOCX",

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

        return new Response(
            new Uint8Array(buffer),
            {
                status: 200,

                headers: {
                    "Content-Type":
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

                    "Content-Disposition":
                        `attachment; filename="${fileName}"`,

                    "Content-Length":
                        String(
                            buffer.byteLength,
                        ),

                    "Cache-Control":
                        "private, no-store, max-age=0",

                    "X-Content-Type-Options":
                        "nosniff",
                },
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
            "Erro ao exportar laudo em DOCX:",
            error,
        );

        return NextResponse.json(
            {
                message:
                    "Não foi possível gerar o arquivo Word.",
            },
            {
                status: 500,
            },
        );
    }
}