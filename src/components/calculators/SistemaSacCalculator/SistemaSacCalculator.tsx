// src/components/calculators/SistemaSacCalculator/SistemaSacCalculator.tsx

"use client";

import {
    Calculator,
    ChevronDown,
    ChevronUp,
    CircleAlert,
    History,
    Loader2,
    Printer,
    RotateCcw,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import SaveCalculationModal from "@/components/calculations/SaveCalculationModal/SaveCalculationModal";
import {
    getStringValue,
    loadCalculationRevision,
    type ReopenedCalculation,
} from "@/lib/calculations/reopen-calculation";
import { printProfessionalDocument } from "@/lib/printing/calculation-print";

import styles from "./styles.module.scss";

type SistemaSacCalculatorProps = {
    calculationId?: string;
    calculationVersion?: number;
};

type AmortizationRow = {
    installment: number;
    openingBalance: number;
    payment: number;
    interest: number;
    amortization: number;
    balance: number;
};

type SacResult = {
    principal: number;
    rate: number;
    installments: number;
    amortization: number;
    firstPayment: number;
    lastPayment: number;
    totalInterest: number;
    totalPaid: number;
};

function parseNumber(value: string) {
    const normalized = value
        .trim()
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

    return Number(normalized);
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
}

function formatNumber(value: number, digits = 6) {
    return new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: digits,
    }).format(value);
}

function buildSacSchedule(
    principal: number,
    rate: number,
    installments: number,
) {
    const rows: AmortizationRow[] = [];

    const amortization = principal / installments;

    let balance = principal;

    for (let installment = 1; installment <= installments; installment += 1) {
        const openingBalance = balance;

        const interest = openingBalance * rate;

        const currentAmortization =
            installment === installments
                ? openingBalance
                : Math.min(amortization, openingBalance);

        const payment = currentAmortization + interest;

        balance = Math.max(0, openingBalance - currentAmortization);

        if (balance < 0.00000001) {
            balance = 0;
        }

        rows.push({
            installment,
            openingBalance,
            payment,
            interest,
            amortization: currentAmortization,
            balance,
        });
    }

    return rows;
}

export default function SistemaSacCalculator({
    calculationId,
    calculationVersion,
}: SistemaSacCalculatorProps) {
    const [principal, setPrincipal] = useState("");

    const [rate, setRate] = useState("");

    const [installments, setInstallments] = useState("");

    const [rateUnit, setRateUnit] = useState("ao mês");

    const [error, setError] = useState("");

    const [result, setResult] = useState<SacResult | null>(null);

    const [schedule, setSchedule] = useState<AmortizationRow[]>([]);

    const [showSchedule, setShowSchedule] = useState(false);

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

                    expectedType: ["SISTEMA_SAC", "SAC"],

                    requestedVersion: calculationVersion,
                });

                if (!isActive) {
                    return;
                }

                setPrincipal(getStringValue(loaded.input, "principal"));

                setRate(getStringValue(loaded.input, "rate"));

                setInstallments(getStringValue(loaded.input, "installments"));

                setRateUnit(getStringValue(loaded.input, "rateUnit", "ao mês"));

                setError("");
                setResult(null);
                setSchedule([]);
                setShowSchedule(false);

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

    function handleCalculate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setResult(null);
        setSchedule([]);
        setShowSchedule(false);

        const parsedPrincipal = parseNumber(principal);

        const parsedRatePercent = parseNumber(rate);

        const parsedRate = parsedRatePercent / 100;

        const parsedInstallments = Math.floor(parseNumber(installments));

        if (
            !Number.isFinite(parsedPrincipal) ||
            !Number.isFinite(parsedRatePercent) ||
            !Number.isFinite(parsedInstallments) ||
            parsedPrincipal <= 0 ||
            parsedRatePercent < 0 ||
            parsedInstallments <= 0
        ) {
            setError("Informe valor financiado, taxa e parcelas válidos.");

            return;
        }

        const calculatedSchedule = buildSacSchedule(
            parsedPrincipal,
            parsedRate,
            parsedInstallments,
        );

        const totalInterest = calculatedSchedule.reduce(
            (total, row) => total + row.interest,

            0,
        );

        const totalPaid = calculatedSchedule.reduce(
            (total, row) => total + row.payment,

            0,
        );

        const firstRow = calculatedSchedule[0];

        const lastRow = calculatedSchedule[calculatedSchedule.length - 1];

        if (!firstRow || !lastRow) {
            setError("Não foi possível gerar a planilha de amortização.");

            return;
        }

        setSchedule(calculatedSchedule);

        setResult({
            principal: parsedPrincipal,

            rate: parsedRatePercent,

            installments: parsedInstallments,

            amortization: parsedPrincipal / parsedInstallments,

            firstPayment: firstRow.payment,

            lastPayment: lastRow.payment,

            totalInterest,

            totalPaid,
        });
    }

    function handleClear() {
        setPrincipal("");
        setRate("");
        setInstallments("");
        setError("");
        setResult(null);
        setSchedule([]);
        setShowSchedule(false);
    }

    function handlePrint() {
        if (!result || schedule.length === 0) return;

        setError("");

        const printResult = printProfessionalDocument({
            title: "Memória de Cálculo — Sistema SAC",
            subtitle: "Sistema de Amortização Constante com planilha detalhada",
            documentType: "Sistema SAC",
            orientation: "landscape",
            metadata: [
                { label: "Periodicidade da taxa", value: rateUnit },
                { label: "Quantidade de parcelas", value: String(result.installments) },
                { label: "Regime", value: "Amortização constante" },
                { label: "Moeda", value: "Real brasileiro (BRL)" },
            ],
            sections: [
                {
                    title: "Dados utilizados",
                    rows: [
                        {
                            label: "Valor financiado",
                            value: formatCurrency(result.principal),
                        },
                        {
                            label: "Taxa de juros",
                            value: `${formatNumber(result.rate, 8)}% ${rateUnit}`,
                        },
                        {
                            label: "Quantidade de parcelas",
                            value: String(result.installments),
                        },
                        { label: "Sistema de amortização", value: "SAC" },
                    ],
                    columns: 4,
                },
                {
                    title: "Resultado do cálculo",
                    rows: [
                        {
                            label: "Amortização constante",
                            value: formatCurrency(result.amortization),
                            highlight: true,
                        },
                        {
                            label: "Primeira parcela",
                            value: formatCurrency(result.firstPayment),
                        },
                        {
                            label: "Última parcela",
                            value: formatCurrency(result.lastPayment),
                        },
                        {
                            label: "Total de juros",
                            value: formatCurrency(result.totalInterest),
                        },
                        {
                            label: "Total do financiamento",
                            value: formatCurrency(result.totalPaid),
                            highlight: true,
                        },
                        {
                            label: "Saldo final",
                            value: formatCurrency(schedule.at(-1)?.balance ?? 0),
                        },
                    ],
                    columns: 3,
                },
                {
                    title: "Memória matemática",
                    formulas: [
                        "A = PV ÷ n",
                        "Jurosₖ = Saldo inicialₖ × i",
                        "Prestaçãoₖ = Amortizaçãoₖ + Jurosₖ",
                        "Saldo finalₖ = Saldo inicialₖ − Amortizaçãoₖ",
                    ],
                    substitutions: [
                        `A = ${formatCurrency(result.principal)} ÷ ${result.installments}`,
                        `A = ${formatCurrency(result.amortization)}`,
                        `Primeira prestação = ${formatCurrency(result.amortization)} + ${formatCurrency(schedule[0]?.interest ?? 0)}`,
                        `Primeira prestação = ${formatCurrency(result.firstPayment)}`,
                        `Última prestação = ${formatCurrency(result.lastPayment)}`,
                    ],
                    note: "No SAC, a amortização permanece constante, os juros diminuem com a redução do saldo devedor e, consequentemente, as prestações são decrescentes.",
                },
                {
                    title: "Planilha de amortização",
                    description:
                        "Evolução integral do saldo devedor. O cabeçalho será repetido automaticamente nas páginas seguintes.",
                    pageBreakBefore: true,
                    table: {
                        columns: [
                            { key: "installment", label: "Parcela", align: "center" },
                            { key: "openingBalance", label: "Saldo inicial", align: "right" },
                            { key: "interest", label: "Juros", align: "right" },
                            { key: "amortization", label: "Amortização", align: "right" },
                            { key: "payment", label: "Prestação", align: "right" },
                            { key: "balance", label: "Saldo final", align: "right" },
                        ],
                        rows: schedule.map((row) => ({
                            installment: String(row.installment),
                            openingBalance: formatCurrency(row.openingBalance),
                            interest: formatCurrency(row.interest),
                            amortization: formatCurrency(row.amortization),
                            payment: formatCurrency(row.payment),
                            balance: formatCurrency(row.balance),
                        })),
                        footer: {
                            installment: "Totais",
                            openingBalance: "—",
                            interest: formatCurrency(result.totalInterest),
                            amortization: formatCurrency(result.principal),
                            payment: formatCurrency(result.totalPaid),
                            balance: formatCurrency(schedule.at(-1)?.balance ?? 0),
                        },
                        compact: true,
                    },
                },
                {
                    title: "Observações",
                    note: "A taxa deve corresponder à periodicidade de cada parcela. Os cálculos internos mantêm maior precisão; os valores monetários exibidos são formatados com duas casas decimais. A última amortização pode ser ajustada para eliminar eventual saldo residual.",
                },
            ],
            footerText:
                "Memória de cálculo e planilha de amortização pelo Sistema SAC",
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

                        <span>Preparando os dados para recálculo.</span>
                    </div>
                </div>
            )}

            {loadError && (
                <div className={styles.revisionError}>
                    <CircleAlert size={20} />

                    <div>
                        <strong>Não foi possível reabrir o cálculo</strong>

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
                            Os dados foram carregados. Recalcule para salvar a versão{" "}
                            {reopenedCalculation.currentVersion + 1}.
                        </span>
                    </div>
                </div>
            )}

            <div className={styles.container}>
                <form className={styles.formCard} onSubmit={handleCalculate}>
                    <div className={styles.cardTitle}>
                        <div className={styles.icon}>
                            <Calculator size={24} />
                        </div>

                        <div>
                            <h2>Dados do financiamento</h2>

                            <p>Informe o valor, a taxa e a quantidade de parcelas.</p>
                        </div>
                    </div>

                    <div className={styles.fields}>
                        <label>
                            Valor financiado
                            <div className={styles.inputGroup}>
                                <span>R$</span>

                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={principal}
                                    onChange={(event) => setPrincipal(event.target.value)}
                                    placeholder="0,00"
                                />
                            </div>
                        </label>

                        <label>
                            Taxa de juros
                            <div className={styles.combinedField}>
                                <div className={styles.inputGroup}>
                                    <span>%</span>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={rate}
                                        onChange={(event) => setRate(event.target.value)}
                                        placeholder="0,00"
                                    />
                                </div>

                                <select
                                    value={rateUnit}
                                    onChange={(event) => setRateUnit(event.target.value)}
                                >
                                    <option value="ao mês">ao mês</option>

                                    <option value="ao trimestre">ao trimestre</option>

                                    <option value="ao semestre">ao semestre</option>

                                    <option value="ao ano">ao ano</option>
                                </select>
                            </div>
                        </label>

                        <label>
                            Quantidade de parcelas
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={installments}
                                onChange={(event) => setInstallments(event.target.value)}
                                placeholder="0"
                            />
                        </label>
                    </div>

                    <div className={styles.warning}>
                        A taxa deve corresponder ao mesmo período das parcelas.
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.actions}>
                        <button type="submit" className={styles.calculateButton}>
                            <Calculator size={19} />
                            Calcular
                        </button>

                        <button
                            type="button"
                            className={styles.clearButton}
                            onClick={handleClear}
                        >
                            <RotateCcw size={19} />
                            Limpar
                        </button>
                    </div>
                </form>

                <aside className={styles.resultCard}>
                    <span className={styles.resultLabel}>Resultado</span>

                    <h2>Resumo do financiamento</h2>

                    {result ? (
                        <>
                            <div className={styles.resultList}>
                                <div>
                                    <span>Valor financiado</span>

                                    <strong>{formatCurrency(result.principal)}</strong>
                                </div>

                                <div>
                                    <span>Amortização constante</span>

                                    <strong>{formatCurrency(result.amortization)}</strong>
                                </div>

                                <div>
                                    <span>Primeira parcela</span>

                                    <strong>{formatCurrency(result.firstPayment)}</strong>
                                </div>

                                <div>
                                    <span>Última parcela</span>

                                    <strong>{formatCurrency(result.lastPayment)}</strong>
                                </div>

                                <div>
                                    <span>Taxa aplicada</span>

                                    <strong>
                                        {formatNumber(result.rate)}% {rateUnit}
                                    </strong>
                                </div>

                                <div>
                                    <span>Total de juros</span>

                                    <strong>{formatCurrency(result.totalInterest)}</strong>
                                </div>
                            </div>

                            <div className={styles.total}>
                                <span>Total do financiamento</span>

                                <strong>{formatCurrency(result.totalPaid)}</strong>
                            </div>

                            <div className={styles.formula}>
                                <span>Fórmulas utilizadas</span>

                                <strong>A = PV ÷ n</strong>

                                <strong>J = Saldo × i</strong>

                                <strong>Prestação = A + J</strong>
                            </div>

                            <button
                                type="button"
                                className={styles.printButton}
                                onClick={handlePrint}
                            >
                                <Printer size={18} />
                                Imprimir / Salvar PDF
                            </button>

                            <SaveCalculationModal
                                calculationType="SISTEMA_SAC"
                                defaultTitle="Sistema SAC — amortização constante"
                                defaultDescription="Memória de cálculo e planilha de amortização pelo Sistema SAC."
                                engineVersion="sac-1.0.0"
                                input={{
                                    principal,
                                    rate,
                                    installments,
                                    rateUnit,
                                }}
                                result={{
                                    principal: result.principal,

                                    rate: result.rate,

                                    installments: result.installments,

                                    amortization: result.amortization,

                                    firstPayment: result.firstPayment,

                                    lastPayment: result.lastPayment,

                                    totalInterest: result.totalInterest,

                                    totalPaid: result.totalPaid,
                                }}
                                premises={{
                                    system: "Sistema SAC",

                                    rateUnit,

                                    periodicity:
                                        "A taxa informada corresponde ao mesmo período das parcelas.",

                                    rounding:
                                        "Os valores monetários são apresentados com duas casas decimais, preservando maior precisão durante o cálculo interno.",
                                }}
                                methodology={{
                                    system: "Sistema de Amortização Constante — SAC",

                                    description:
                                        "A amortização permanece constante, os juros incidem sobre o saldo devedor e as prestações diminuem ao longo do contrato.",

                                    finalInstallmentAdjustment:
                                        "A última amortização é ajustada quando necessário para eliminar eventual saldo residual.",
                                }}
                                formulas={{
                                    amortization: "A = PV ÷ n",

                                    interest: "Juros da parcela = Saldo inicial × taxa",

                                    payment: "Prestação = Amortização + Juros",

                                    closingBalance: "Saldo final = Saldo inicial − Amortização",

                                    amortizationSubstitution: `A = ${result.principal} ÷ ${result.installments}`,
                                }}
                                summary={{
                                    principal: result.principal,

                                    amortization: result.amortization,

                                    firstPayment: result.firstPayment,

                                    lastPayment: result.lastPayment,

                                    installments: result.installments,

                                    totalInterest: result.totalInterest,

                                    totalPaid: result.totalPaid,

                                    finalBalance: schedule[schedule.length - 1]?.balance ?? 0,
                                }}
                                warnings={{
                                    rateCompatibility:
                                        "A taxa deve corresponder ao período de cada parcela.",

                                    rounding:
                                        "Pode existir diferença residual de arredondamento, compensada na última amortização.",
                                }}
                                lines={schedule.map((row) => ({
                                    sequence: row.installment,

                                    label: `Parcela ${row.installment}`,

                                    openingBalance: row.openingBalance,

                                    interestRate: result.rate / 100,

                                    interest: row.interest,

                                    amortization: row.amortization,

                                    installment: row.payment,

                                    payment: row.payment,

                                    closingBalance: row.balance,

                                    metadata: {
                                        system: "SAC",

                                        installmentNumber: row.installment,

                                        ratePercent: result.rate,

                                        rateUnit,
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
                        </>
                    ) : (
                        <div className={styles.empty}>
                            Preencha os campos e clique em calcular.
                        </div>
                    )}
                </aside>
            </div>

            {result && schedule.length > 0 && (
                <section className={styles.scheduleCard}>
                    <button
                        type="button"
                        className={styles.scheduleHeader}
                        onClick={() => setShowSchedule((current) => !current)}
                    >
                        <div>
                            <span>Sistema SAC</span>

                            <strong>Planilha de amortização</strong>
                        </div>

                        {showSchedule ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                    </button>

                    {showSchedule && (
                        <div className={styles.tableWrapper}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Parcela</th>

                                        <th>Prestação</th>

                                        <th>Juros</th>

                                        <th>Amortização</th>

                                        <th>Saldo devedor</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    <tr className={styles.initialRow}>
                                        <td>0</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>

                                        <td>{formatCurrency(result.principal)}</td>
                                    </tr>

                                    {schedule.map((row) => (
                                        <tr key={row.installment}>
                                            <td>{row.installment}</td>

                                            <td>{formatCurrency(row.payment)}</td>

                                            <td>{formatCurrency(row.interest)}</td>

                                            <td>{formatCurrency(row.amortization)}</td>

                                            <td>{formatCurrency(row.balance)}</td>
                                        </tr>
                                    ))}
                                </tbody>

                                <tfoot>
                                    <tr>
                                        <td>Total</td>

                                        <td>{formatCurrency(result.totalPaid)}</td>

                                        <td>{formatCurrency(result.totalInterest)}</td>

                                        <td>{formatCurrency(result.principal)}</td>

                                        <td>{formatCurrency(0)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </section>
            )}
        </section>
    );
}