// src/app/(private)/laudos/[reportId]/visualizar/page.tsx

import ExpertReportPreview from "@/components/reports/ExpertReportPreview/ExpertReportPreview";

import styles from "./styles.module.scss";

type ExpertReportPreviewPageProps = {
    params: Promise<{
        reportId: string;
    }>;

    searchParams: Promise<{
        version?:
        | string
        | string[];
    }>;
};

function getSearchParam(
    value:
        | string
        | string[]
        | undefined,
) {
    return Array.isArray(value)
        ? value[0]
        : value;
}

function parseVersion(
    value: string | undefined,
) {
    if (!value) {
        return undefined;
    }

    const version = Number(value);

    if (
        !Number.isInteger(version) ||
        version <= 0
    ) {
        return undefined;
    }

    return version;
}

export default async function ExpertReportPreviewPage({
    params,
    searchParams,
}: ExpertReportPreviewPageProps) {
    const { reportId } = await params;

    const query = await searchParams;

    const version = parseVersion(
        getSearchParam(query.version),
    );

    return (
        <main className={styles.page}>
            <ExpertReportPreview
                reportId={reportId}
                requestedVersion={version}
            />
        </main>
    );
}