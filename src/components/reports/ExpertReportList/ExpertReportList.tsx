// src/components/reports/ExpertReportList/ExpertReportList.tsx

"use client";

import {
    Archive,
    ArchiveRestore,
    ArrowRight,
    CalendarDays,
    CircleAlert,
    Eye,
    FilePenLine,
    FileText,
    History,
    Loader2,
    RefreshCw,
    Search,
    Trash2,
    UserRound,
} from "lucide-react";
import Link from "next/link";
import {
    type FormEvent,
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

type StatusFilter =
    | "ALL"
    | ReportStatus;

type ReportListItem = {
    id: string;
    title: string;
    reportNumber: string | null;
    status: ReportStatus;
    purpose: string | null;
    referenceDate: string | null;
    place: string | null;
    currentVersion: number;
    createdAt: string;
    updatedAt: string;

    client: {
        id: string;
        type:
        | "INDIVIDUAL"
        | "COMPANY";
        name: string;
        tradeName: string | null;
        documentNumber: string | null;
    } | null;

    legalProcess: {
        id: string;
        caseNumber: string | null;
        title: string | null;
        court: string | null;
        courtDivision: string | null;
        status: string;
    } | null;

    revisions: Array<{
        id: string;
        version: number;
        status:
        | "DRAFT"
        | "IN_REVIEW"
        | "FINALIZED";
        templateVersion: string;
        integrityHash: string | null;
        createdAt: string;
        updatedAt: string;

        _count: {
            sections: number;
            calculationLinks: number;
            generatedDocuments: number;
        };
    }>;

    _count: {
        revisions: number;
        generatedDocuments: number;
    };
};

type ReportsResponse = {
    reports?: ReportListItem[];
    message?: string;
};

type ActionResponse = {
    message?: string;
};

type ProcessingAction =
    | "ARCHIVE"
    | "RESTORE"
    | "DELETE";

type ProcessingState = {
    reportId: string;
    action: ProcessingAction;
} | null;

function formatDate(
    value: string | null,
) {
    if (!value) {
        return "Não informada";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "Não informada";
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
    ).format(date);
}

function formatDateTime(
    value: string,
) {
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
    status: ReportStatus,
) {
    const labels: Record<
        ReportStatus,
        string
    > = {
        DRAFT: "Rascunho",
        IN_REVIEW: "Em revisão",
        FINALIZED: "Finalizado",
        ARCHIVED: "Arquivado",
    };

    return labels[status];
}

export default function ExpertReportList() {
    const [
        reports,
        setReports,
    ] = useState<ReportListItem[]>(
        [],
    );

    const [
        search,
        setSearch,
    ] = useState("");

    const [
        status,
        setStatus,
    ] =
        useState<StatusFilter>(
            "ALL",
        );

    const [
        appliedSearch,
        setAppliedSearch,
    ] = useState("");

    const [
        appliedStatus,
        setAppliedStatus,
    ] =
        useState<StatusFilter>(
            "ALL",
        );

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        processing,
        setProcessing,
    ] =
        useState<ProcessingState>(
            null,
        );

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    const [
        successMessage,
        setSuccessMessage,
    ] = useState("");

    const loadReports =
        useCallback(
            async (
                nextSearch: string,
                nextStatus:
                    StatusFilter,
            ) => {
                setIsLoading(true);
                setErrorMessage("");

                try {
                    const params =
                        new URLSearchParams();

                    if (
                        nextSearch.trim()
                    ) {
                        params.set(
                            "search",
                            nextSearch.trim(),
                        );
                    }

                    if (
                        nextStatus !==
                        "ALL"
                    ) {
                        params.set(
                            "status",
                            nextStatus,
                        );
                    }

                    const query =
                        params.toString();

                    const response =
                        await fetch(
                            `/api/reports${query
                                ? `?${query}`
                                : ""
                            }`,
                            {
                                method: "GET",
                                cache: "no-store",
                            },
                        );

                    const payload =
                        (await response.json()) as ReportsResponse;

                    if (
                        !response.ok ||
                        !payload.reports
                    ) {
                        throw new Error(
                            payload.message ??
                            "Não foi possível carregar os laudos.",
                        );
                    }

                    setReports(
                        payload.reports,
                    );

                    setAppliedSearch(
                        nextSearch,
                    );

                    setAppliedStatus(
                        nextStatus,
                    );
                } catch (error) {
                    setReports([]);

                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : "Não foi possível carregar os laudos.",
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [],
        );

    useEffect(() => {
        void loadReports(
            "",
            "ALL",
        );
    }, [loadReports]);

    function handleSearch(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setSuccessMessage("");

        void loadReports(
            search,
            status,
        );
    }

    function clearFilters() {
        setSearch("");
        setStatus("ALL");
        setSuccessMessage("");

        void loadReports(
            "",
            "ALL",
        );
    }

    async function executeAction(
        report: ReportListItem,
        action: ProcessingAction,
    ) {
        const messages: Record<
            ProcessingAction,
            string
        > = {
            ARCHIVE:
                `Arquivar o laudo “${report.title}”?`,

            RESTORE:
                `Restaurar o laudo “${report.title}”?`,

            DELETE: [
                `Excluir o laudo “${report.title}”?`,
                "",
                "A exclusão será lógica.",
                "O registro será removido das consultas, mas permanecerá preservado no banco e na auditoria.",
            ].join("\n"),
        };

        if (
            !window.confirm(
                messages[action],
            )
        ) {
            return;
        }

        setProcessing({
            reportId:
                report.id,
            action,
        });

        setErrorMessage("");
        setSuccessMessage("");

        const endpointAction =
            action === "ARCHIVE"
                ? "archive"
                : action ===
                    "RESTORE"
                    ? "restore"
                    : "delete";

        try {
            const response =
                await fetch(
                    `/api/reports/${encodeURIComponent(
                        report.id,
                    )}/${endpointAction}`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                    },
                );

            const payload =
                (await response.json()) as ActionResponse;

            if (!response.ok) {
                throw new Error(
                    payload.message ??
                    "Não foi possível concluir a operação.",
                );
            }

            setSuccessMessage(
                payload.message ??
                "Operação concluída com sucesso.",
            );

            await loadReports(
                appliedSearch,
                appliedStatus,
            );
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Não foi possível concluir a operação.",
            );
        } finally {
            setProcessing(null);
        }
    }

    if (isLoading) {
        return (
            <section className={styles.loadingState}>
                <Loader2
                    className={styles.spin}
                    size={35}
                />

                <strong>
                    Carregando laudos...
                </strong>
            </section>
        );
    }

    return (
        <div className={styles.container}>
            <form
                className={styles.filters}
                onSubmit={handleSearch}
            >
                <label className={styles.searchField}>
                    <Search size={18} />

                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value,
                            )
                        }
                        placeholder="Buscar por título, número, cliente ou processo"
                    />
                </label>

                <label className={styles.statusField}>
                    <span>Situação</span>

                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(
                                event.target
                                    .value as StatusFilter,
                            )
                        }
                    >
                        <option value="ALL">
                            Todas
                        </option>

                        <option value="DRAFT">
                            Rascunho
                        </option>

                        <option value="IN_REVIEW">
                            Em revisão
                        </option>

                        <option value="FINALIZED">
                            Finalizado
                        </option>

                        <option value="ARCHIVED">
                            Arquivado
                        </option>
                    </select>
                </label>

                <button
                    type="submit"
                    className={styles.searchButton}
                >
                    <Search size={17} />
                    Pesquisar
                </button>

                <button
                    type="button"
                    className={styles.clearButton}
                    onClick={clearFilters}
                >
                    <RefreshCw size={17} />
                    Limpar
                </button>

                <Link
                    href="/historico"
                    className={styles.newButton}
                >
                    <FileText size={17} />
                    Escolher cálculo
                </Link>
            </form>

            {errorMessage && (
                <div
                    className={styles.errorMessage}
                    role="alert"
                >
                    <CircleAlert size={19} />
                    {errorMessage}
                </div>
            )}

            {successMessage && (
                <div
                    className={styles.successMessage}
                    role="status"
                >
                    <FileText size={19} />
                    {successMessage}
                </div>
            )}

            <section className={styles.resultsHeader}>
                <div>
                    <span>
                        Resultado da consulta
                    </span>

                    <h3>
                        {reports.length}{" "}
                        {reports.length === 1
                            ? "laudo"
                            : "laudos"}
                    </h3>
                </div>
            </section>

            {reports.length === 0 ? (
                <section className={styles.emptyState}>
                    <FileText size={38} />

                    <strong>
                        Nenhum laudo encontrado
                    </strong>

                    <p>
                        Ajuste os filtros ou escolha
                        um cálculo no histórico para
                        gerar um novo laudo.
                    </p>

                    <Link href="/historico">
                        Ir para o histórico
                        <ArrowRight size={17} />
                    </Link>
                </section>
            ) : (
                <div className={styles.reportGrid}>
                    {reports.map((report) => {
                        const latestRevision =
                            report.revisions[0];

                        const isProcessing =
                            processing?.reportId ===
                            report.id;

                        return (
                            <article
                                key={report.id}
                                className={styles.reportCard}
                                data-status={report.status}
                            >
                                <div className={styles.cardTop}>
                                    <div>
                                        <span
                                            className={
                                                styles.statusBadge
                                            }
                                            data-status={
                                                report.status
                                            }
                                        >
                                            {getStatusLabel(
                                                report.status,
                                            )}
                                        </span>

                                        <h3>
                                            {report.title}
                                        </h3>

                                        <p>
                                            {report.reportNumber
                                                ? `Laudo nº ${report.reportNumber}`
                                                : "Número não informado"}
                                        </p>
                                    </div>

                                    <FileText size={25} />
                                </div>

                                {report.purpose && (
                                    <p className={styles.purpose}>
                                        {report.purpose}
                                    </p>
                                )}

                                <div className={styles.informationGrid}>
                                    <div>
                                        <History size={17} />

                                        <span>
                                            Revisão atual
                                        </span>

                                        <strong>
                                            {report.currentVersion}
                                        </strong>
                                    </div>

                                    <div>
                                        <FileText size={17} />

                                        <span>
                                            Total de revisões
                                        </span>

                                        <strong>
                                            {report._count.revisions}
                                        </strong>
                                    </div>

                                    <div>
                                        <CalendarDays size={17} />

                                        <span>
                                            Data-base
                                        </span>

                                        <strong>
                                            {formatDate(
                                                report.referenceDate,
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <FileText size={17} />

                                        <span>
                                            Arquivos gerados
                                        </span>

                                        <strong>
                                            {
                                                report._count
                                                    .generatedDocuments
                                            }
                                        </strong>
                                    </div>
                                </div>

                                <div className={styles.relationships}>
                                    <div>
                                        <UserRound size={18} />

                                        <div>
                                            <span>Cliente</span>

                                            <strong>
                                                {report.client
                                                    ?.name ??
                                                    "Não vinculado"}
                                            </strong>
                                        </div>
                                    </div>

                                    <div>
                                        <FileText size={18} />

                                        <div>
                                            <span>Processo</span>

                                            <strong>
                                                {report.legalProcess
                                                    ?.caseNumber ??
                                                    report.legalProcess
                                                        ?.title ??
                                                    "Não vinculado"}
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.revisionSummary}>
                                    <div>
                                        <span>
                                            Situação da revisão
                                        </span>

                                        <strong>
                                            {latestRevision
                                                ? getStatusLabel(
                                                    latestRevision.status,
                                                )
                                                : "Não informada"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Última atualização
                                        </span>

                                        <strong>
                                            {formatDateTime(
                                                report.updatedAt,
                                            )}
                                        </strong>
                                    </div>
                                </div>

                                <div className={styles.actions}>
                                    <Link
                                        href={`/laudos/${encodeURIComponent(
                                            report.id,
                                        )}/visualizar?version=${report.currentVersion}`}
                                        className={styles.previewButton}
                                    >
                                        <Eye size={15} />
                                        Visualizar
                                    </Link>

                                    <Link
                                        href={`/laudos/${encodeURIComponent(
                                            report.id,
                                        )}/revisoes`}
                                        className={styles.historyButton}
                                    >
                                        <History size={15} />
                                        Revisões
                                    </Link>

                                    {report.status !== "ARCHIVED" && (
                                        <Link
                                            href={`/laudos/${encodeURIComponent(
                                                report.id,
                                            )}/editar`}
                                            className={styles.editButton}
                                        >
                                            <FilePenLine size={15} />
                                            Abrir
                                        </Link>
                                    )}

                                    {report.status === "ARCHIVED" ? (
                                        <button
                                            type="button"
                                            className={styles.restoreButton}
                                            disabled={isProcessing}
                                            onClick={() =>
                                                void executeAction(
                                                    report,
                                                    "RESTORE",
                                                )
                                            }
                                        >
                                            {processing?.action ===
                                                "RESTORE" &&
                                                isProcessing ? (
                                                <Loader2
                                                    className={
                                                        styles.spin
                                                    }
                                                    size={15}
                                                />
                                            ) : (
                                                <ArchiveRestore
                                                    size={15}
                                                />
                                            )}

                                            Restaurar
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className={styles.archiveButton}
                                            disabled={isProcessing}
                                            onClick={() =>
                                                void executeAction(
                                                    report,
                                                    "ARCHIVE",
                                                )
                                            }
                                        >
                                            {processing?.action ===
                                                "ARCHIVE" &&
                                                isProcessing ? (
                                                <Loader2
                                                    className={
                                                        styles.spin
                                                    }
                                                    size={15}
                                                />
                                            ) : (
                                                <Archive size={15} />
                                            )}

                                            Arquivar
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className={styles.deleteButton}
                                        disabled={isProcessing}
                                        onClick={() =>
                                            void executeAction(
                                                report,
                                                "DELETE",
                                            )
                                        }
                                    >
                                        {processing?.action ===
                                            "DELETE" &&
                                            isProcessing ? (
                                            <Loader2
                                                className={
                                                    styles.spin
                                                }
                                                size={15}
                                            />
                                        ) : (
                                            <Trash2 size={15} />
                                        )}

                                        Excluir
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}