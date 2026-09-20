// src/components/reports/ExpertReportRevisionHistory/ExpertReportRevisionHistory.tsx

"use client";

import {
    ArrowLeft,
    CircleAlert,
    Download,
    Eye,
    FilePenLine,
    FileText,
    History,
    Loader2,
    ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

import styles from "./styles.module.scss";

type ReportStatus =
    | "DRAFT"
    | "IN_REVIEW"
    | "FINALIZED"
    | "ARCHIVED";

type RevisionStatus =
    | "DRAFT"
    | "IN_REVIEW"
    | "FINALIZED";

type ReportRevision = {
    id: string;
    version: number;
    status: RevisionStatus;
    title: string;
    reportNumber: string | null;
    referenceDate: string | null;
    templateVersion: string;
    integrityHash: string | null;
    createdAt: string;
    updatedAt: string;
    finalizedAt: string | null;

    calculationLinks: Array<{
        calculation: {
            id: string;
            type: string;
            title: string | null;
        };

        calculationRevision: {
            id: string;
            version: number;
            engineVersion: string;
        };
    }>;

    generatedDocuments: Array<{
        id: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number | null;
        integrityHash: string | null;
        generatedAt: string | null;
        createdAt: string;
    }>;
};

type ExpertReport = {
    id: string;
    title: string;
    reportNumber: string | null;
    status: ReportStatus;
    currentVersion: number;
    revisions: ReportRevision[];
};

type ReportResponse = {
    report?: ExpertReport;
    message?: string;
};

type ExpertReportRevisionHistoryProps = {
    reportId: string;
};

function formatDateTime(
    value: string | null,
) {
    if (!value) {
        return "Não informado";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "Não informado";
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            dateStyle: "short",
            timeStyle: "short",
        },
    ).format(date);
}

function getStatusLabel(
    status:
        | ReportStatus
        | RevisionStatus,
) {
    const labels = {
        DRAFT: "Rascunho",
        IN_REVIEW: "Em revisão",
        FINALIZED: "Finalizado",
        ARCHIVED: "Arquivado",
    };

    return labels[status];
}

export default function ExpertReportRevisionHistory({
    reportId,
}: ExpertReportRevisionHistoryProps) {
    const [
        report,
        setReport,
    ] =
        useState<ExpertReport | null>(
            null,
        );

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    const loadReport =
        useCallback(async () => {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const response =
                    await fetch(
                        `/api/reports/${encodeURIComponent(
                            reportId,
                        )}`,
                        {
                            method: "GET",
                            cache: "no-store",
                        },
                    );

                const payload =
                    (await response.json()) as ReportResponse;

                if (
                    !response.ok ||
                    !payload.report
                ) {
                    throw new Error(
                        payload.message ??
                        "Não foi possível carregar as revisões.",
                    );
                }

                setReport(
                    payload.report,
                );
            } catch (error) {
                setReport(null);

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Não foi possível carregar as revisões.",
                );
            } finally {
                setIsLoading(false);
            }
        }, [reportId]);

    useEffect(() => {
        void loadReport();
    }, [loadReport]);

    if (isLoading) {
        return (
            <section className={styles.loadingState}>
                <Loader2
                    className={styles.spin}
                    size={35}
                />

                <strong>
                    Carregando revisões...
                </strong>
            </section>
        );
    }

    if (!report) {
        return (
            <section className={styles.errorState}>
                <CircleAlert size={37} />

                <strong>
                    Laudo não encontrado
                </strong>

                <p>{errorMessage}</p>

                <Link href="/laudos">
                    <ArrowLeft size={17} />
                    Voltar aos laudos
                </Link>
            </section>
        );
    }

    const encodedReportId =
        encodeURIComponent(
            report.id,
        );

    return (
        <div className={styles.container}>
            <section className={styles.summaryCard}>
                <div>
                    <span>
                        {getStatusLabel(
                            report.status,
                        )}
                    </span>

                    <h2>{report.title}</h2>

                    <p>
                        {report.reportNumber
                            ? `Laudo nº ${report.reportNumber}`
                            : "Número do laudo não informado"}
                    </p>
                </div>

                <div className={styles.summaryActions}>
                    <Link href="/laudos">
                        <ArrowLeft size={16} />
                        Todos os laudos
                    </Link>

                    <Link
                        href={`/laudos/${encodedReportId}/editar`}
                    >
                        <FilePenLine size={16} />
                        Abrir laudo
                    </Link>
                </div>
            </section>

            <div className={styles.revisionList}>
                {report.revisions.map(
                    (revision) => {
                        const isCurrent =
                            revision.version ===
                            report.currentVersion;

                        const calculation =
                            revision
                                .calculationLinks[0];

                        return (
                            <article
                                key={revision.id}
                                className={styles.revisionCard}
                                data-current={isCurrent}
                            >
                                <div className={styles.revisionHeader}>
                                    <div className={styles.versionIcon}>
                                        <History size={22} />
                                    </div>

                                    <div>
                                        <div className={styles.badges}>
                                            <span
                                                data-status={
                                                    revision.status
                                                }
                                            >
                                                {getStatusLabel(
                                                    revision.status,
                                                )}
                                            </span>

                                            {isCurrent && (
                                                <strong>
                                                    Revisão atual
                                                </strong>
                                            )}
                                        </div>

                                        <h3>
                                            Revisão{" "}
                                            {revision.version}
                                        </h3>

                                        <p>
                                            {revision.title}
                                        </p>
                                    </div>
                                </div>

                                <div className={styles.informationGrid}>
                                    <div>
                                        <span>
                                            Criada em
                                        </span>

                                        <strong>
                                            {formatDateTime(
                                                revision.createdAt,
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Atualizada em
                                        </span>

                                        <strong>
                                            {formatDateTime(
                                                revision.updatedAt,
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Finalizada em
                                        </span>

                                        <strong>
                                            {formatDateTime(
                                                revision.finalizedAt,
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Modelo
                                        </span>

                                        <strong>
                                            {
                                                revision.templateVersion
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Cálculo
                                        </span>

                                        <strong>
                                            {calculation
                                                ?.calculation
                                                .title ??
                                                calculation
                                                    ?.calculation
                                                    .type ??
                                                "Não informado"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Versão do cálculo
                                        </span>

                                        <strong>
                                            {calculation
                                                ?.calculationRevision
                                                .version ??
                                                "—"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Motor
                                        </span>

                                        <strong>
                                            {calculation
                                                ?.calculationRevision
                                                .engineVersion ??
                                                "Não informado"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Arquivos gerados
                                        </span>

                                        <strong>
                                            {
                                                revision
                                                    .generatedDocuments
                                                    .length
                                            }
                                        </strong>
                                    </div>
                                </div>

                                <div className={styles.hashBox}>
                                    <ShieldCheck size={17} />

                                    <div>
                                        <span>
                                            Hash da revisão
                                        </span>

                                        <strong>
                                            {revision.integrityHash ??
                                                "Não disponível"}
                                        </strong>
                                    </div>
                                </div>

                                <div className={styles.actions}>
                                    <Link
                                        href={`/laudos/${encodedReportId}/visualizar?version=${revision.version}`}
                                        className={styles.previewButton}
                                    >
                                        <Eye size={15} />
                                        Visualizar A4
                                    </Link>

                                    {isCurrent && (
                                        <Link
                                            href={`/laudos/${encodedReportId}/editar`}
                                            className={styles.editButton}
                                        >
                                            <FilePenLine size={15} />
                                            Abrir revisão atual
                                        </Link>
                                    )}

                                    <a
                                        href={`/api/reports/${encodedReportId}/revisions/${revision.version}/export/docx`}
                                        className={styles.wordButton}
                                    >
                                        <FileText size={15} />
                                        Word
                                    </a>

                                    <a
                                        href={`/api/reports/${encodedReportId}/revisions/${revision.version}/export/pdf`}
                                        className={styles.pdfButton}
                                    >
                                        <Download size={15} />
                                        PDF
                                    </a>
                                </div>
                            </article>
                        );
                    },
                )}
            </div>
        </div>
    );
}