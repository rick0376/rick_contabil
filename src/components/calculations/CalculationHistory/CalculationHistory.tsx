// src/components/calculations/CalculationHistory/CalculationHistory.tsx

"use client";

import {
    Building2,
    Calculator,
    CalendarDays,
    Eye,
    FileText,
    History,
    Loader2,
    Printer,
    RefreshCw,
    Search,
    UserRound,
} from "lucide-react";
import Link from "next/link";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import EditCalculationModal from "@/components/calculations/EditCalculationModal/EditCalculationModal";
import DeleteEntityButton from "@/components/ui/DeleteEntityButton/DeleteEntityButton";
import { printProfessionalDocument, type CalculationPrintRow, type ProfessionalPrintSection } from "@/lib/printing/calculation-print";

import styles from "./styles.module.scss";

type CalculationStatus =
    | "DRAFT"
    | "CALCULATED"
    | "FINALIZED"
    | "ARCHIVED";

type StatusFilter =
    | "ALL"
    | CalculationStatus;

type CalculationRecord = {
    id: string;
    type: string;
    title: string | null;
    description: string | null;
    status: CalculationStatus;
    referenceDate: string | null;
    currency: string;
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
        status: string;
    } | null;

    _count: {
        revisions: number;
    };
};

type CalculationListResponse = {
    calculations?: CalculationRecord[];
    message?: string;
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type CalculationLine = {
    id: string; sequence: number; label: string | null; competence: string | null; dueDate: string | null; paymentDate: string | null; openingBalance: string | null; correctionRate: string | null; monetaryCorrection: string | null; correctedBalance: string | null; interestRate: string | null; interest: string | null; amortization: string | null; installment: string | null; insurance: string | null; fee: string | null; fine: string | null; payment: string | null; closingBalance: string | null; debit: string | null; credit: string | null; dayCount: number | null; weightedBalance: string | null; metadata: JsonValue | null;
};

type CalculationRevision = {
    id: string; version: number; status: string; engineVersion: string; referenceDate: string | null; input: JsonValue; premises: JsonValue | null; methodology: JsonValue | null; formulas: JsonValue | null; result: JsonValue; summary: JsonValue | null; warnings: JsonValue | null; notes: string | null; integrityHash: string | null; finalizedAt: string | null; createdAt: string; lines: CalculationLine[];
};

type CalculationDetailsRecord = CalculationRecord & { notes: string | null; revisions: CalculationRevision[]; };
type CalculationDetailsResponse = { calculation?: CalculationDetailsRecord; message?: string };


function formatDate(
    value: string | null,
) {
    if (!value) {
        return "Não informada";
    }

    const date = new Date(value);

    if (
        Number.isNaN(date.getTime())
    ) {
        return "Não informada";
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
    ).format(date);
}


function formatKey(value: string) {
    const labels: Record<string, string> = { capital: "Capital", interest: "Juros", amount: "Montante", presentValue: "Valor presente", futureValue: "Valor futuro", discount: "Desconto", rate: "Taxa", period: "Período", rateUnit: "Unidade da taxa", periodUnit: "Unidade do período", totalInterest: "Total de juros", totalPaid: "Total pago", payment: "Prestação", principal: "Valor financiado", installments: "Parcelas", description: "Descrição", regime: "Regime", mode: "Modalidade" };
    return labels[value] ?? value.replace(/([A-Z])/g, " $1").replace(/[_-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function formatJsonValue(value: JsonValue) {
    if (value === null) return "—";
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (typeof value === "number") return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 10 }).format(value);
    if (typeof value === "string") return value || "—";
    return JSON.stringify(value);
}

function flattenJsonRows(value: JsonValue | null, prefix = ""): CalculationPrintRow[] {
    if (value === null) return [];
    if (Array.isArray(value)) return value.flatMap((item, index) => typeof item === "object" && item !== null ? flattenJsonRows(item, `${prefix}Item ${index + 1}`) : [{ label: `${prefix || "Item"} ${index + 1}`, value: formatJsonValue(item) }]);
    if (typeof value === "object") return Object.entries(value).flatMap(([key, item]) => { const label = prefix ? `${prefix} — ${formatKey(key)}` : formatKey(key); return typeof item === "object" && item !== null ? flattenJsonRows(item, label) : [{ label, value: formatJsonValue(item) }]; });
    return [{ label: prefix || "Valor", value: formatJsonValue(value) }];
}

function formatMoney(value: string | null) {
    if (value === null || value === "") return "—";
    const number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(number) : value;
}

function normalizeType(type: string) {
    return type
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");
}

function getTypeLabel(type: string) {
    const labels: Record<
        string,
        string
    > = {
        JUROS_SIMPLES:
            "Juros Simples",

        JUROS_COMPOSTOS:
            "Juros Compostos",

        VALOR_PRESENTE:
            "Valor Presente",

        VALOR_FUTURO:
            "Valor Futuro",

        SISTEMA_PRICE:
            "Sistema Price",

        PRICE:
            "Sistema Price",

        SISTEMA_SAC:
            "Sistema SAC",

        SAC:
            "Sistema SAC",

        SISTEMA_GAUSS:
            "Método de Gauss",

        METODO_DE_GAUSS:
            "Método de Gauss",

        GAUSS:
            "Método de Gauss",

        FLUXO_DE_CAIXA:
            "Fluxo de Caixa",

        FLUXO_CAIXA:
            "Fluxo de Caixa",

        ANALISE_PERICIAL:
            "Análise Pericial",

        ANALISE_FINANCIAMENTO_VEICULO:
            "Análise de Financiamento de Veículo",
    };

    return (
        labels[normalizeType(type)] ??
        type
    );
}

function getCalculationRoute(
    type: string,
) {
    const routes: Record<
        string,
        string
    > = {
        JUROS_SIMPLES:
            "/juros-simples",

        JUROS_COMPOSTOS:
            "/juros-compostos",

        VALOR_PRESENTE:
            "/valor-presente",

        VALOR_FUTURO:
            "/valor-futuro",

        SISTEMA_PRICE:
            "/sistema-price",

        PRICE:
            "/sistema-price",

        SISTEMA_SAC:
            "/sistema-sac",

        SAC:
            "/sistema-sac",

        SISTEMA_GAUSS:
            "/sistema-gauss",

        METODO_DE_GAUSS:
            "/sistema-gauss",

        GAUSS:
            "/sistema-gauss",

        FLUXO_DE_CAIXA:
            "/fluxo-caixa",

        FLUXO_CAIXA:
            "/fluxo-caixa",

        ANALISE_PERICIAL:
            "/analise-pericial",

        ANALISE_FINANCIAMENTO_VEICULO:
            "/analises-financeiras/financiamento-veiculo",
    };

    return (
        routes[normalizeType(type)] ??
        null
    );
}

function supportsReopening(
    type: string,
) {
    const normalizedType =
        normalizeType(type);

    return [
        "JUROS_SIMPLES",
        "JUROS_COMPOSTOS",
        "VALOR_PRESENTE",
        "VALOR_FUTURO",
        "SISTEMA_PRICE",
        "PRICE",
        "SISTEMA_SAC",
        "SAC",
        "SISTEMA_GAUSS",
        "METODO_DE_GAUSS",
        "GAUSS",
        "FLUXO_DE_CAIXA",
        "FLUXO_CAIXA",
        "ANALISE_PERICIAL",
        "ANALISE_FINANCIAMENTO_VEICULO",
    ].includes(normalizedType);
}

function getStatusLabel(
    status: CalculationStatus,
) {
    const labels: Record<
        CalculationStatus,
        string
    > = {
        DRAFT: "Rascunho",
        CALCULATED: "Calculado",
        FINALIZED: "Finalizado",
        ARCHIVED: "Arquivado",
    };

    return labels[status];
}

export default function CalculationHistory() {
    const [
        calculations,
        setCalculations,
    ] = useState<
        CalculationRecord[]
    >([]);

    const [search, setSearch] =
        useState("");

    const [
        statusFilter,
        setStatusFilter,
    ] = useState<StatusFilter>(
        "ALL",
    );

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");
    const [printingCalculationId, setPrintingCalculationId] = useState<string | null>(null);

    const loadCalculations =
        useCallback(async () => {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const response =
                    await fetch(
                        "/api/calculations",
                        {
                            method: "GET",
                            cache: "no-store",
                        },
                    );

                const payload =
                    (await response.json()) as CalculationListResponse;

                if (!response.ok) {
                    throw new Error(
                        payload.message ??
                        "Não foi possível carregar os cálculos.",
                    );
                }

                setCalculations(
                    payload.calculations ??
                    [],
                );
            } catch (error) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Não foi possível carregar os cálculos.",
                );
            } finally {
                setIsLoading(false);
            }
        }, []);

    useEffect(() => {
        void loadCalculations();
    }, [loadCalculations]);

    async function handlePrintCalculation(calculationId: string) {
        setPrintingCalculationId(calculationId); setErrorMessage("");

        try {
            const response = await fetch(`/api/calculations/${encodeURIComponent(calculationId)}`, { method: "GET", cache: "no-store" });
            const payload = (await response.json()) as CalculationDetailsResponse;
            if (!response.ok || !payload.calculation) throw new Error(payload.message ?? "Não foi possível carregar a memória para impressão.");

            const calculation = payload.calculation;
            const revision = calculation.revisions.find((item) => item.version === calculation.currentVersion) ?? calculation.revisions[0];
            if (!revision) throw new Error("O cálculo não possui revisão disponível para impressão.");

            const dataSections: ProfessionalPrintSection[] = [
                { title: "Dados de entrada", rows: flattenJsonRows(revision.input), columns: 2 as const },
                { title: "Resultados", rows: flattenJsonRows(revision.result), columns: 2 as const },
                { title: "Resumo", rows: flattenJsonRows(revision.summary), columns: 2 as const },
                { title: "Premissas", rows: flattenJsonRows(revision.premises), columns: 2 as const },
                { title: "Metodologia", rows: flattenJsonRows(revision.methodology), columns: 2 as const },
                { title: "Fórmulas e substituições", rows: flattenJsonRows(revision.formulas), columns: 1 as const },
                { title: "Avisos", rows: flattenJsonRows(revision.warnings), columns: 1 as const },
            ].filter((section) => (section.rows?.length ?? 0) > 0);

            if (revision.lines.length) dataSections.push({
                title: "Linhas detalhadas", pageBreakBefore: true, table: {
                    compact: true, columns: [
                        { key: "sequence", label: "#", align: "center" }, { key: "label", label: "Descrição" }, { key: "date", label: "Competência" }, { key: "opening", label: "Saldo inicial", align: "right" }, { key: "correction", label: "Correção", align: "right" }, { key: "interest", label: "Juros", align: "right" }, { key: "amortization", label: "Amortização", align: "right" }, { key: "installment", label: "Prestação", align: "right" }, { key: "payment", label: "Pagamento", align: "right" }, { key: "closing", label: "Saldo final", align: "right" },
                    ], rows: revision.lines.map((line) => ({ sequence: String(line.sequence), label: line.label ?? "Parcela", date: formatDate(line.competence ?? line.dueDate), opening: formatMoney(line.openingBalance), correction: formatMoney(line.monetaryCorrection), interest: formatMoney(line.interest), amortization: formatMoney(line.amortization), installment: formatMoney(line.installment), payment: formatMoney(line.payment), closing: formatMoney(line.closingBalance) }))
                }
            });

            dataSections.push({
                title: "Informações da revisão", columns: 2, rows: [
                    { label: "Versão", value: String(revision.version) }, { label: "Motor", value: revision.engineVersion }, { label: "Situação", value: revision.status }, { label: "Data-base", value: formatDate(revision.referenceDate) }, { label: "Criada em", value: formatDate(revision.createdAt) }, { label: "Hash de integridade", value: revision.integrityHash ?? "Não gerado" },
                ], note: revision.notes ?? calculation.notes ?? undefined
            });

            const printResult = printProfessionalDocument({
                title: calculation.title ?? getTypeLabel(calculation.type), subtitle: "Memória profissional de cálculo", documentType: `${getTypeLabel(calculation.type)} — versão ${revision.version}`, orientation: revision.lines.length ? "landscape" : "portrait",
                metadata: [
                    { label: "Situação", value: getStatusLabel(calculation.status) },
                    { label: "Cliente", value: calculation.client?.name ?? "Não vinculado" },
                    { label: "Processo", value: calculation.legalProcess?.title ?? calculation.legalProcess?.caseNumber ?? "Não vinculado" },
                    { label: "Data-base", value: formatDate(revision.referenceDate ?? calculation.referenceDate) },
                ],
                sections: [{
                    title: "Identificação", columns: 2, rows: [
                        { label: "Tipo", value: getTypeLabel(calculation.type) }, { label: "Moeda", value: calculation.currency }, { label: "Versão atual", value: String(calculation.currentVersion) }, { label: "Revisões", value: String(calculation.revisions.length) }, { label: "Descrição", value: calculation.description ?? "Não informada" },
                    ]
                }, ...dataSections],
                footerText: "Memória de cálculo gerada pelo LHP Sistema Contábil",
            });
            if (!printResult.ok) throw new Error(printResult.error);
        } catch (error) { setErrorMessage(error instanceof Error ? error.message : "Não foi possível imprimir a memória de cálculo."); } finally { setPrintingCalculationId(null); }
    }


    const filteredCalculations =
        useMemo(() => {
            const normalizedSearch =
                search
                    .trim()
                    .toLowerCase();

            return calculations.filter(
                (calculation) => {
                    const matchesStatus =
                        statusFilter ===
                        "ALL" ||
                        calculation.status ===
                        statusFilter;

                    if (!matchesStatus) {
                        return false;
                    }

                    if (
                        !normalizedSearch
                    ) {
                        return true;
                    }

                    const searchableContent =
                        [
                            calculation.title,
                            calculation.description,
                            calculation.type,
                            getTypeLabel(
                                calculation.type,
                            ),
                            calculation
                                .client
                                ?.name,
                            calculation
                                .client
                                ?.tradeName,
                            calculation
                                .legalProcess
                                ?.title,
                            calculation
                                .legalProcess
                                ?.caseNumber,
                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();

                    return searchableContent.includes(
                        normalizedSearch,
                    );
                },
            );
        }, [
            calculations,
            search,
            statusFilter,
        ]);

    const metrics = useMemo(
        () => ({
            total:
                calculations.length,

            calculated:
                calculations.filter(
                    (calculation) =>
                        calculation.status ===
                        "CALCULATED",
                ).length,

            finalized:
                calculations.filter(
                    (calculation) =>
                        calculation.status ===
                        "FINALIZED",
                ).length,

            drafts:
                calculations.filter(
                    (calculation) =>
                        calculation.status ===
                        "DRAFT",
                ).length,
        }),
        [calculations],
    );

    return (
        <section className={styles.card}>
            <div
                className={
                    styles.cardHeader
                }
            >
                <div
                    className={
                        styles.headerIcon
                    }
                >
                    <History size={23} />
                </div>

                <div>
                    <span>
                        Registros disponíveis
                    </span>

                    <h3>
                        Histórico profissional
                    </h3>

                    <p>
                        Pesquise cálculos por
                        tipo, cliente, processo
                        ou situação.
                    </p>
                </div>
            </div>

            <div
                className={styles.metrics}
            >
                <div>
                    <span>Total</span>

                    <strong>
                        {metrics.total}
                    </strong>
                </div>

                <div>
                    <span>
                        Calculados
                    </span>

                    <strong>
                        {metrics.calculated}
                    </strong>
                </div>

                <div>
                    <span>
                        Finalizados
                    </span>

                    <strong>
                        {metrics.finalized}
                    </strong>
                </div>

                <div>
                    <span>
                        Rascunhos
                    </span>

                    <strong>
                        {metrics.drafts}
                    </strong>
                </div>
            </div>

            <div
                className={styles.tools}
            >
                <label
                    className={
                        styles.searchBox
                    }
                >
                    <Search size={18} />

                    <input
                        type="search"
                        value={search}
                        placeholder="Pesquisar cálculo, cliente ou processo"
                        onChange={(
                            event,
                        ) =>
                            setSearch(
                                event.target
                                    .value,
                            )
                        }
                    />
                </label>

                <button
                    type="button"
                    className={
                        styles.refreshButton
                    }
                    disabled={isLoading}
                    onClick={() =>
                        void loadCalculations()
                    }
                >
                    <RefreshCw
                        className={
                            isLoading
                                ? styles.spin
                                : undefined
                        }
                        size={17}
                    />

                    Atualizar
                </button>
            </div>

            <div
                className={
                    styles.filters
                }
            >
                <button
                    type="button"
                    data-active={
                        statusFilter ===
                        "ALL"
                    }
                    onClick={() =>
                        setStatusFilter(
                            "ALL",
                        )
                    }
                >
                    Todos
                </button>

                <button
                    type="button"
                    data-active={
                        statusFilter ===
                        "CALCULATED"
                    }
                    onClick={() =>
                        setStatusFilter(
                            "CALCULATED",
                        )
                    }
                >
                    Calculados
                </button>

                <button
                    type="button"
                    data-active={
                        statusFilter ===
                        "FINALIZED"
                    }
                    onClick={() =>
                        setStatusFilter(
                            "FINALIZED",
                        )
                    }
                >
                    Finalizados
                </button>

                <button
                    type="button"
                    data-active={
                        statusFilter ===
                        "DRAFT"
                    }
                    onClick={() =>
                        setStatusFilter(
                            "DRAFT",
                        )
                    }
                >
                    Rascunhos
                </button>
            </div>

            <div
                className={
                    styles.resultInformation
                }
            >
                {
                    filteredCalculations.length
                }{" "}
                registros exibidos
            </div>

            {errorMessage && (
                <div
                    className={
                        styles.errorMessage
                    }
                >
                    {errorMessage}
                </div>
            )}

            <div className={styles.list}>
                {isLoading ? (
                    <div
                        className={
                            styles.emptyState
                        }
                    >
                        <Loader2
                            className={
                                styles.spin
                            }
                            size={31}
                        />

                        <strong>
                            Carregando histórico...
                        </strong>
                    </div>
                ) : filteredCalculations
                    .length === 0 ? (
                    <div
                        className={
                            styles.emptyState
                        }
                    >
                        <Calculator
                            size={34}
                        />

                        <strong>
                            Nenhum cálculo encontrado
                        </strong>

                        <p>
                            Os cálculos salvos
                            aparecerão
                            automaticamente nesta
                            tela.
                        </p>
                    </div>
                ) : (
                    filteredCalculations.map(
                        (calculation) => {
                            const calculationRoute =
                                getCalculationRoute(
                                    calculation.type,
                                );

                            const moduleHref =
                                calculationRoute
                                    ? supportsReopening(
                                        calculation.type,
                                    )
                                        ? `${calculationRoute}?calculationId=${encodeURIComponent(
                                            calculation.id,
                                        )}&version=${calculation.currentVersion}`
                                        : calculationRoute
                                    : null;

                            return (
                                <article
                                    key={
                                        calculation.id
                                    }
                                    className={
                                        styles.item
                                    }
                                >
                                    <div
                                        className={
                                            styles.itemIcon
                                        }
                                    >
                                        <Calculator
                                            size={22}
                                        />
                                    </div>

                                    <div
                                        className={
                                            styles.itemContent
                                        }
                                    >
                                        <div
                                            className={
                                                styles.itemHeader
                                            }
                                        >
                                            <div>
                                                <span
                                                    className={
                                                        styles.statusBadge
                                                    }
                                                    data-status={
                                                        calculation.status
                                                    }
                                                >
                                                    {getStatusLabel(
                                                        calculation.status,
                                                    )}
                                                </span>

                                                <h4>
                                                    {calculation.title ??
                                                        getTypeLabel(
                                                            calculation.type,
                                                        )}
                                                </h4>

                                                <p>
                                                    {getTypeLabel(
                                                        calculation.type,
                                                    )}
                                                </p>
                                            </div>

                                            <div
                                                className={
                                                    styles.actions
                                                }
                                            >

                                                <button type="button" className={styles.printButton} disabled={printingCalculationId === calculation.id} onClick={() => void handlePrintCalculation(calculation.id)}>
                                                    {printingCalculationId === calculation.id ? <Loader2 className={styles.spin} size={14} /> : <Printer size={14} />}
                                                    Imprimir
                                                </button>

                                                <Link
                                                    className={
                                                        styles.openButton
                                                    }
                                                    href={`/historico/${calculation.id}`}
                                                >
                                                    <Eye
                                                        size={14}
                                                    />

                                                    Detalhes
                                                </Link>

                                                <EditCalculationModal
                                                    calculationId={
                                                        calculation.id
                                                    }
                                                    itemName={
                                                        calculation.title ??
                                                        getTypeLabel(
                                                            calculation.type,
                                                        )
                                                    }
                                                    onUpdated={
                                                        loadCalculations
                                                    }
                                                />

                                                {moduleHref && (
                                                    <Link
                                                        className={
                                                            styles.openButton
                                                        }
                                                        href={
                                                            moduleHref
                                                        }
                                                    >
                                                        <FileText
                                                            size={14}
                                                        />

                                                        Abrir módulo
                                                    </Link>
                                                )}

                                                <DeleteEntityButton
                                                    endpoint={`/api/calculations/${encodeURIComponent(
                                                        calculation.id,
                                                    )}/delete`}
                                                    itemName={
                                                        calculation.title ??
                                                        getTypeLabel(
                                                            calculation.type,
                                                        )
                                                    }
                                                    entityLabel="cálculo"
                                                />
                                            </div>
                                        </div>

                                        {calculation.description && (
                                            <p
                                                className={
                                                    styles.description
                                                }
                                            >
                                                {
                                                    calculation.description
                                                }
                                            </p>
                                        )}

                                        <div
                                            className={
                                                styles.details
                                            }
                                        >
                                            {calculation.client && (
                                                <span>
                                                    {calculation
                                                        .client
                                                        .type ===
                                                        "INDIVIDUAL" ? (
                                                        <UserRound
                                                            size={15}
                                                        />
                                                    ) : (
                                                        <Building2
                                                            size={15}
                                                        />
                                                    )}

                                                    {
                                                        calculation
                                                            .client
                                                            .name
                                                    }
                                                </span>
                                            )}

                                            {calculation.legalProcess && (
                                                <span>
                                                    <FileText
                                                        size={15}
                                                    />

                                                    {calculation
                                                        .legalProcess
                                                        .title ??
                                                        calculation
                                                            .legalProcess
                                                            .caseNumber ??
                                                        "Processo vinculado"}
                                                </span>
                                            )}

                                            <span>
                                                <CalendarDays
                                                    size={15}
                                                />

                                                Data-base:{" "}
                                                {formatDate(
                                                    calculation.referenceDate,
                                                )}
                                            </span>

                                            <span>
                                                <History
                                                    size={15}
                                                />

                                                Versão{" "}
                                                {
                                                    calculation.currentVersion
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </article>
                            );
                        },
                    )
                )}
            </div>
        </section>
    );
}