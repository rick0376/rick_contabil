// src/app/(private)/laudos/[reportId]/page.tsx

import {
    redirect,
} from "next/navigation";

type ExpertReportPageProps = {
    params: Promise<{
        reportId: string;
    }>;
};

export default async function ExpertReportPage({
    params,
}: ExpertReportPageProps) {
    const { reportId } =
        await params;

    redirect(
        `/laudos/${encodeURIComponent(
            reportId,
        )}/editar`,
    );
}