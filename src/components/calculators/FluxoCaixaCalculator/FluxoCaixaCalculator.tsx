// src/components/calculators/FluxoCaixaCalculator/FluxoCaixaCalculator.tsx

"use client";

import {
    ArrowDownCircle,
    ArrowUpCircle,
    CircleAlert,
    History,
    Loader2,
    Plus,
    Printer,
    RotateCcw,
    Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import SaveCalculationModal from "@/components/calculations/SaveCalculationModal/SaveCalculationModal";
import {
    loadCalculationRevision,
    type ReopenedCalculation,
} from "@/lib/calculations/reopen-calculation";
import { printProfessionalDocument } from "@/lib/printing/calculation-print";

import styles from "./styles.module.scss";

type FluxoCaixaCalculatorProps = {
    calculationId?: string;
    calculationVersion?: number;
};

type TransactionType = "entrada" | "saida";

type Transaction = {
    id: string;
    description: string;
    type: TransactionType;
    value: number;
    period: number;
};

type TransactionRecord = Record<string, unknown>;

function parseNumber(value: string) {
    return Number(
        value.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", "."),
    );
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
}

function isTransactionType(value: unknown): value is TransactionType {
    return value === "entrada" || value === "saida";
}

function getLoadedTransactions(input: Record<string, unknown>) {
    const storedTransactions = input.transactions;

    if (!Array.isArray(storedTransactions)) {
        return [];
    }

    return storedTransactions.flatMap((item, index): Transaction[] => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            return [];
        }

        const record = item as TransactionRecord;

        const description =
            typeof record.description === "string" ? record.description.trim() : "";

        const transactionType = record.type;

        const transactionValue =
            typeof record.value === "number" ? record.value : Number(record.value);

        const transactionPeriod =
            typeof record.period === "number" ? record.period : Number(record.period);

        if (
            !description ||
            !isTransactionType(transactionType) ||
            !Number.isFinite(transactionValue) ||
            transactionValue <= 0 ||
            !Number.isInteger(transactionPeriod) ||
            transactionPeriod < 0
        ) {
            return [];
        }

        const storedId =
            typeof record.id === "string" && record.id.trim()
                ? record.id
                : `reopened-${index}-${transactionPeriod}`;

        return [
            {
                id: storedId,
                description,
                type: transactionType,
                value: transactionValue,
                period: transactionPeriod,
            },
        ];
    });
}

export default function FluxoCaixaCalculator({
    calculationId,
    calculationVersion,
}: FluxoCaixaCalculatorProps) {
    const [description, setDescription] = useState("");

    const [type, setType] = useState<TransactionType>("entrada");

    const [value, setValue] = useState("");

    const [period, setPeriod] = useState("1");

    const [error, setError] = useState("");

    const [transactions, setTransactions] = useState<Transaction[]>([]);

    const [reopenedCalculation, setReopenedCalculation] =
        useState<ReopenedCalculation | null>(null);

    const [isLoadingCalculation, setIsLoadingCalculation] = useState(
        Boolean(calculationId),
    );

    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        if (!calculationId) {
            setReopenedCalculation(null);

            setIsLoadingCalculation(false);

            setLoadError("");

            return;
        }

        const targetCalculationId = calculationId;

        let isActive = true;

        async function loadRevision() {
            setIsLoadingCalculation(true);

            setLoadError("");

            try {
                const loaded = await loadCalculationRevision({
                    calculationId: targetCalculationId,

                    expectedType: ["FLUXO_DE_CAIXA", "FLUXO_CAIXA"],

                    requestedVersion: calculationVersion,
                });

                if (!isActive) {
                    return;
                }

                const loadedTransactions = getLoadedTransactions(loaded.input);

                setDescription("");
                setType("entrada");
                setValue("");
                setPeriod("1");
                setError("");

                setTransactions(loadedTransactions);

                setReopenedCalculation(loaded);
            } catch (loadCalculationError) {
                if (!isActive) {
                    return;
                }

                setReopenedCalculation(null);

                setLoadError(
                    loadCalculationError instanceof Error
                        ? loadCalculationError.message
                        : "Não foi possível carregar a revisão.",
                );
            } finally {
                if (isActive) {
                    setIsLoadingCalculation(false);
                }
            }
        }

        void loadRevision();

        return () => {
            isActive = false;
        };
    }, [calculationId, calculationVersion]);

    const summary = useMemo(() => {
        const totalEntries = transactions
            .filter((item) => item.type === "entrada")
            .reduce(
                (total, item) => total + item.value,

                0,
            );

        const totalExits = transactions
            .filter((item) => item.type === "saida")
            .reduce(
                (total, item) => total + item.value,

                0,
            );

        return {
            totalEntries,
            totalExits,

            balance: totalEntries - totalExits,
        };
    }, [transactions]);

    const orderedTransactions = useMemo(() => {
        return [...transactions].sort((a, b) => {
            if (a.period !== b.period) {
                return a.period - b.period;
            }

            return a.description.localeCompare(b.description, "pt-BR");
        });
    }, [transactions]);

    const accumulatedRows = useMemo(() => {
        let accumulated = 0;

        return orderedTransactions.map((transaction) => {
            const openingBalance = accumulated;

            const movement =
                transaction.type === "entrada" ? transaction.value : -transaction.value;

            accumulated += movement;

            return {
                ...transaction,
                openingBalance,
                movement,
                accumulated,
            };
        });
    }, [orderedTransactions]);

    function handleAdd(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");

        const parsedValue = parseNumber(value);

        const parsedPeriod = Number(period);

        if (!description.trim()) {
            setError("Informe uma descrição.");

            return;
        }

        if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
            setError("Informe um valor válido.");

            return;
        }

        if (!Number.isInteger(parsedPeriod) || parsedPeriod < 0) {
            setError("Informe um período válido.");

            return;
        }

        setTransactions((current) => [
            ...current,

            {
                id: crypto.randomUUID(),

                description: description.trim(),

                type,

                value: parsedValue,

                period: parsedPeriod,
            },
        ]);

        setDescription("");
        setValue("");
    }

    function handleRemove(id: string) {
        setTransactions((current) => current.filter((item) => item.id !== id));
    }

    function handleClear() {
        setDescription("");
        setType("entrada");
        setValue("");
        setPeriod("1");
        setError("");
        setTransactions([]);
    }

    function handlePrint() {
        if (transactions.length === 0) return;

        setError("");

        const firstPeriod = orderedTransactions[0]?.period ?? 0;
        const lastPeriod = orderedTransactions.at(-1)?.period ?? 0;
        const balanceTone =
            summary.balance < 0
                ? "danger"
                : summary.balance > 0
                    ? "success"
                    : "neutral";
        const balanceTitle =
            summary.balance < 0
                ? "Fluxo com saldo final negativo"
                : summary.balance > 0
                    ? "Fluxo com saldo final positivo"
                    : "Fluxo encerrado sem saldo";

        const printResult = printProfessionalDocument({
            title: "Demonstrativo de Fluxo de Caixa",
            subtitle: "Entradas, saídas e evolução do saldo acumulado por período",
            documentType: "Fluxo de caixa",
            orientation: "landscape",
            metadata: [
                {
                    label: "Quantidade de lançamentos",
                    value: String(transactions.length),
                },
                {
                    label: "Intervalo de períodos",
                    value: `${firstPeriod} a ${lastPeriod}`,
                },
                { label: "Saldo inicial", value: formatCurrency(0) },
                { label: "Moeda", value: "Real brasileiro (BRL)" },
            ],
            sections: [
                {
                    title: "Resumo do fluxo",
                    rows: [
                        {
                            label: "Total de entradas",
                            value: formatCurrency(summary.totalEntries),
                        },
                        {
                            label: "Total de saídas",
                            value: formatCurrency(summary.totalExits),
                        },
                        {
                            label: "Quantidade de lançamentos",
                            value: String(transactions.length),
                        },
                        {
                            label: "Saldo final",
                            value: formatCurrency(summary.balance),
                            highlight: true,
                        },
                    ],
                    columns: 4,
                    status: {
                        title: balanceTitle,
                        description:
                            "O saldo representa a diferença nominal entre todas as entradas e saídas registradas, sem aplicação de juros, correção monetária ou desconto financeiro.",
                        badge:
                            summary.balance < 0
                                ? "Saldo negativo"
                                : summary.balance > 0
                                    ? "Saldo positivo"
                                    : "Saldo zerado",
                        tone: balanceTone,
                        rows: [
                            {
                                label: "Entradas",
                                value: formatCurrency(summary.totalEntries),
                            },
                            { label: "Saídas", value: formatCurrency(summary.totalExits) },
                            { label: "Saldo", value: formatCurrency(summary.balance) },
                        ],
                    },
                },
                {
                    title: "Demonstrativo dos lançamentos",
                    description:
                        "Lançamentos ordenados por período e, em caso de empate, pela descrição.",
                    table: {
                        columns: [
                            { key: "period", label: "Período", align: "center" },
                            { key: "description", label: "Descrição", align: "left" },
                            { key: "type", label: "Tipo", align: "center" },
                            {
                                key: "openingBalance",
                                label: "Saldo anterior",
                                align: "right",
                            },
                            { key: "movement", label: "Movimento", align: "right" },
                            { key: "accumulated", label: "Saldo acumulado", align: "right" },
                        ],
                        rows: accumulatedRows.map((row) => ({
                            period: String(row.period),
                            description: row.description,
                            type: row.type === "entrada" ? "Entrada" : "Saída",
                            openingBalance: formatCurrency(row.openingBalance),
                            movement: formatCurrency(row.movement),
                            accumulated: formatCurrency(row.accumulated),
                        })),
                        footer: {
                            period: "—",
                            description: "Totais",
                            type: "—",
                            openingBalance: "—",
                            movement: formatCurrency(summary.balance),
                            accumulated: formatCurrency(summary.balance),
                        },
                        compact: true,
                    },
                },
                {
                    title: "Metodologia",
                    formulas: [
                        "Movimento de entrada = + valor",
                        "Movimento de saída = − valor",
                        "Saldo acumulado = Saldo anterior + Movimento",
                        "Saldo final = Total de entradas − Total de saídas",
                    ],
                    substitutions: [
                        `Saldo final = ${formatCurrency(summary.totalEntries)} − ${formatCurrency(summary.totalExits)}`,
                        `Saldo final = ${formatCurrency(summary.balance)}`,
                    ],
                    note: "Os períodos são ordinais e não representam datas automaticamente. A classificação de cada lançamento deve ser conferida conforme a natureza dos documentos analisados.",
                },
            ],
            footerText:
                "Demonstrativo nominal de entradas, saídas e saldos acumulados",
        });

        if (!printResult.ok) {
            setError(printResult.error ?? "Não foi possível abrir a impressão.");
        }
    }

    return (
        <section className={styles.wrapper}>
            {isLoadingCalculation && (
                <div className={styles.revisionNotice}>
                    <div className={styles.revisionNoticeIcon}>
                        <Loader2 className={styles.spin} size={21} />
                    </div>

                    <div>
                        <strong>Carregando revisão do histórico</strong>

                        <span>Preparando os lançamentos para edição.</span>
                    </div>
                </div>
            )}

            {loadError && (
                <div className={styles.revisionError}>
                    <CircleAlert size={20} />

                    <div>
                        <strong>Não foi possível reabrir o fluxo</strong>

                        <span>{loadError}</span>
                    </div>
                </div>
            )}

            {reopenedCalculation && !isLoadingCalculation && (
                <div className={styles.revisionNotice}>
                    <div className={styles.revisionNoticeIcon}>
                        <History size={21} />
                    </div>

                    <div>
                        <strong>
                            {reopenedCalculation.title} — versão{" "}
                            {reopenedCalculation.sourceVersion}
                        </strong>

                        <span>
                            Os lançamentos foram carregados. Edite o fluxo e salve a versão{" "}
                            {reopenedCalculation.currentVersion + 1}.
                        </span>
                    </div>
                </div>
            )}

            <div className={styles.container}>
                <form className={styles.formCard} onSubmit={handleAdd}>
                    <div className={styles.cardTitle}>
                        <div className={styles.icon}>
                            <Plus size={24} />
                        </div>

                        <div>
                            <h2>Novo lançamento</h2>

                            <p>Adicione entradas e saídas ao fluxo de caixa.</p>
                        </div>
                    </div>

                    <div className={styles.fields}>
                        <label>
                            Descrição
                            <input
                                type="text"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                placeholder="Ex.: Receita, despesa, parcela..."
                            />
                        </label>

                        <label>
                            Tipo de movimentação
                            <div className={styles.typeGrid}>
                                <button
                                    type="button"
                                    className={
                                        type === "entrada" ? styles.activeEntry : styles.typeButton
                                    }
                                    onClick={() => setType("entrada")}
                                >
                                    <ArrowUpCircle size={19} />
                                    Entrada
                                </button>

                                <button
                                    type="button"
                                    className={
                                        type === "saida" ? styles.activeExit : styles.typeButton
                                    }
                                    onClick={() => setType("saida")}
                                >
                                    <ArrowDownCircle size={19} />
                                    Saída
                                </button>
                            </div>
                        </label>

                        <label>
                            Valor
                            <div className={styles.inputGroup}>
                                <span>R$</span>

                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={value}
                                    onChange={(event) => setValue(event.target.value)}
                                    placeholder="0,00"
                                />
                            </div>
                        </label>

                        <label>
                            Período
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={period}
                                onChange={(event) => setPeriod(event.target.value)}
                                placeholder="1"
                            />
                        </label>
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.actions}>
                        <button type="submit" className={styles.addButton}>
                            <Plus size={19} />
                            Adicionar lançamento
                        </button>

                        <button
                            type="button"
                            className={styles.clearButton}
                            onClick={handleClear}
                        >
                            <RotateCcw size={19} />
                            Limpar tudo
                        </button>
                    </div>
                </form>

                <aside className={styles.summaryCard}>
                    <span className={styles.summaryLabel}>Resumo</span>

                    <h2>Resultado do fluxo</h2>

                    <div className={styles.summaryList}>
                        <div>
                            <span>Total de entradas</span>

                            <strong className={styles.positive}>
                                {formatCurrency(summary.totalEntries)}
                            </strong>
                        </div>

                        <div>
                            <span>Total de saídas</span>

                            <strong className={styles.negative}>
                                {formatCurrency(summary.totalExits)}
                            </strong>
                        </div>

                        <div>
                            <span>Lançamentos</span>

                            <strong>{transactions.length}</strong>
                        </div>
                    </div>

                    <div
                        className={`${styles.total} ${summary.balance < 0 ? styles.negativeTotal : styles.positiveTotal
                            }`}
                    >
                        <span>Saldo final</span>

                        <strong>{formatCurrency(summary.balance)}</strong>
                    </div>

                    <div className={styles.formula}>
                        <span>Fórmula utilizada</span>

                        <strong>Saldo = Entradas − Saídas</strong>
                    </div>

                    {transactions.length > 0 && (
                        <div className={styles.saveArea}>
                            <button
                                type="button"
                                className={styles.printButton}
                                onClick={handlePrint}
                            >
                                <Printer size={18} />
                                Imprimir / Salvar PDF
                            </button>

                            <SaveCalculationModal
                                calculationType="FLUXO_DE_CAIXA"
                                defaultTitle="Fluxo de Caixa"
                                defaultDescription="Demonstrativo de entradas, saídas e saldos acumulados por período."
                                engineVersion="cash-flow-1.0.0"
                                input={{
                                    transactions: transactions.map((transaction) => ({
                                        id: transaction.id,

                                        description: transaction.description,

                                        type: transaction.type,

                                        value: transaction.value,

                                        period: transaction.period,
                                    })),
                                }}
                                result={{
                                    totalEntries: summary.totalEntries,

                                    totalExits: summary.totalExits,

                                    balance: summary.balance,

                                    transactionCount: transactions.length,
                                }}
                                premises={{
                                    currency: "BRL",

                                    periodType: "Períodos ordinais informados pelo usuário.",

                                    initialBalance: 0,

                                    ordering:
                                        "Os lançamentos são apresentados em ordem crescente de período e, em caso de empate, por descrição.",

                                    timeValueOfMoney:
                                        "O módulo não aplica juros, atualização monetária ou desconto financeiro.",
                                }}
                                methodology={{
                                    description:
                                        "Cada entrada é tratada como movimento positivo e cada saída como movimento negativo.",

                                    accumulatedBalance:
                                        "O saldo acumulado de cada linha corresponde ao saldo anterior acrescido do movimento atual.",

                                    debitCreditMapping:
                                        "Entradas são registradas no campo crédito e saídas no campo débito da memória detalhada.",
                                }}
                                formulas={{
                                    entryMovement: "Movimento de entrada = + valor",

                                    exitMovement: "Movimento de saída = − valor",

                                    accumulatedBalance:
                                        "Saldo acumulado = Saldo anterior + Movimento",

                                    finalBalance:
                                        "Saldo final = Total de entradas − Total de saídas",
                                }}
                                summary={{
                                    totalEntries: summary.totalEntries,

                                    totalExits: summary.totalExits,

                                    finalBalance: summary.balance,

                                    transactionCount: transactions.length,

                                    firstPeriod: orderedTransactions[0]?.period ?? null,

                                    lastPeriod:
                                        orderedTransactions[orderedTransactions.length - 1]
                                            ?.period ?? null,
                                }}
                                warnings={{
                                    ordinalPeriods:
                                        "Os períodos não representam datas automaticamente.",

                                    noFinancialAdjustment:
                                        "Os valores não são corrigidos, capitalizados ou descontados no tempo.",

                                    classification:
                                        "A classificação como entrada ou saída deve ser validada conforme a natureza do documento analisado.",
                                }}
                                lines={accumulatedRows.map((row, index) => ({
                                    sequence: index + 1,

                                    label: row.description,

                                    openingBalance: row.openingBalance,

                                    debit: row.type === "saida" ? row.value : null,

                                    credit: row.type === "entrada" ? row.value : null,

                                    closingBalance: row.accumulated,

                                    metadata: {
                                        transactionId: row.id,

                                        transactionType: row.type,

                                        period: row.period,

                                        movement: row.movement,

                                        ordering: index + 1,
                                    },
                                }))}
                                revisionTarget={
                                    reopenedCalculation
                                        ? {
                                            calculationId: reopenedCalculation.id,

                                            calculationTitle: reopenedCalculation.title,

                                            currentVersion: reopenedCalculation.currentVersion,

                                            sourceVersion: reopenedCalculation.sourceVersion,

                                            referenceDate: reopenedCalculation.referenceDate,

                                            status: reopenedCalculation.status,
                                        }
                                        : undefined
                                }
                                onRevisionSaved={(version) =>
                                    setReopenedCalculation((current) =>
                                        current
                                            ? {
                                                ...current,

                                                currentVersion: version,
                                            }
                                            : current,
                                    )
                                }
                            />
                        </div>
                    )}
                </aside>
            </div>

            <section className={styles.tableCard}>
                <div className={styles.tableHeader}>
                    <div>
                        <span>Movimentações</span>

                        <h2>Demonstrativo do fluxo de caixa</h2>
                    </div>
                </div>

                {accumulatedRows.length > 0 ? (
                    <div className={styles.tableWrapper}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Período</th>

                                    <th>Descrição</th>

                                    <th>Tipo</th>

                                    <th>Movimento</th>

                                    <th>Saldo acumulado</th>

                                    <th>Ação</th>
                                </tr>
                            </thead>

                            <tbody>
                                {accumulatedRows.map((row) => (
                                    <tr key={row.id}>
                                        <td>{row.period}</td>

                                        <td>{row.description}</td>

                                        <td>
                                            <span
                                                className={
                                                    row.type === "entrada"
                                                        ? styles.entryBadge
                                                        : styles.exitBadge
                                                }
                                            >
                                                {row.type === "entrada" ? "Entrada" : "Saída"}
                                            </span>
                                        </td>

                                        <td
                                            className={
                                                row.movement >= 0 ? styles.positive : styles.negative
                                            }
                                        >
                                            {formatCurrency(row.movement)}
                                        </td>

                                        <td>{formatCurrency(row.accumulated)}</td>

                                        <td>
                                            <button
                                                type="button"
                                                className={styles.deleteButton}
                                                onClick={() => handleRemove(row.id)}
                                                aria-label="Excluir lançamento"
                                            >
                                                <Trash2 size={17} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                            <tfoot>
                                <tr>
                                    <td colSpan={3}>Total</td>

                                    <td>{formatCurrency(summary.balance)}</td>

                                    <td>{formatCurrency(summary.balance)}</td>

                                    <td>—</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className={styles.empty}>Nenhum lançamento foi adicionado.</div>
                )}
            </section>
        </section>
    );
}