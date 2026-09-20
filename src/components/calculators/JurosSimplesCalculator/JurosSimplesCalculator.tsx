// src/components/calculators/JurosSimplesCalculator/JurosSimplesCalculator.tsx

"use client";

import { Calculator, CircleAlert, History, Loader2, Printer, RotateCcw } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import SaveCalculationModal from "@/components/calculations/SaveCalculationModal/SaveCalculationModal";
import {
    getStringValue,
    loadCalculationRevision,
    type ReopenedCalculation,
} from "@/lib/calculations/reopen-calculation";
import {
    printCalculationDocument,
    type CalculationPrintRow,
} from "@/lib/printing/calculation-print";

import styles from "./styles.module.scss";

type CalculationMode = "amount" | "interest" | "capital" | "rate" | "period";

type JurosSimplesCalculatorProps = {
    calculationId?: string;
    calculationVersion?: number;
};

type Result = {
    capital: number;
    interest: number;
    amount: number;
    rate: number;
    period: number;
};

const modeOptions: Array<{ value: CalculationMode; label: string }> = [
    { value: "amount", label: "Calcular montante" },
    { value: "interest", label: "Calcular juros" },
    { value: "capital", label: "Calcular capital" },
    { value: "rate", label: "Calcular taxa" },
    { value: "period", label: "Calcular período" },
];

function isCalculationMode(value: unknown): value is CalculationMode {
    return modeOptions.some((option) => option.value === value);
}

function parseNumber(value: string) {
    return Number(value.trim().replace(/\./g, "").replace(",", "."));
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
}

function formatNumber(value: number, decimals = 4) {
    return new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
    }).format(value);
}

function getModeLabel(mode: CalculationMode) {
    return modeOptions.find((option) => option.value === mode)?.label ?? "Cálculo de juros simples";
}

function buildPrintInputRows({
    mode,
    result,
    rateUnit,
    periodUnit,
}: {
    mode: CalculationMode;
    result: Result;
    rateUnit: string;
    periodUnit: string;
}): CalculationPrintRow[] {
    const rateValue = `${formatNumber(result.rate, 8)}% ${rateUnit}`;
    const periodValue = `${formatNumber(result.period, 8)} ${periodUnit}`;

    switch (mode) {
        case "amount":
            return [
                { label: "Capital inicial", value: formatCurrency(result.capital) },
                { label: "Taxa de juros", value: rateValue },
                { label: "Período", value: periodValue },
            ];

        case "interest":
            return [
                { label: "Capital inicial", value: formatCurrency(result.capital) },
                { label: "Montante final", value: formatCurrency(result.amount) },
            ];

        case "capital":
            return [
                { label: "Valor dos juros", value: formatCurrency(result.interest) },
                { label: "Taxa de juros", value: rateValue },
                { label: "Período", value: periodValue },
            ];

        case "rate":
            return [
                { label: "Capital inicial", value: formatCurrency(result.capital) },
                { label: "Valor dos juros", value: formatCurrency(result.interest) },
                { label: "Período", value: periodValue },
            ];

        case "period":
            return [
                { label: "Capital inicial", value: formatCurrency(result.capital) },
                { label: "Valor dos juros", value: formatCurrency(result.interest) },
                { label: "Taxa de juros", value: rateValue },
            ];
    }
}

function buildPrintDetails({
    mode,
    result,
    rateUnit,
    periodUnit,
}: {
    mode: CalculationMode;
    result: Result;
    rateUnit: string;
    periodUnit: string;
}) {
    const decimalRate = result.rate / 100;
    const rateValue = `${formatNumber(result.rate, 8)}% ${rateUnit}`;
    const periodValue = `${formatNumber(result.period, 8)} ${periodUnit}`;

    switch (mode) {
        case "amount":
            return {
                primaryLabel: "Montante calculado",
                primaryValue: formatCurrency(result.amount),
                formulas: ["J = C × i × n", "M = C + J"],
                substitutions: [
                    `J = ${formatCurrency(result.capital)} × ${formatNumber(decimalRate, 10)} × ${formatNumber(result.period, 8)}`,
                    `J = ${formatCurrency(result.interest)}`,
                    `M = ${formatCurrency(result.capital)} + ${formatCurrency(result.interest)}`,
                    `M = ${formatCurrency(result.amount)}`,
                ],
            };

        case "interest":
            return {
                primaryLabel: "Juros calculados",
                primaryValue: formatCurrency(result.interest),
                formulas: ["J = M − C", "M = C + J"],
                substitutions: [
                    `J = ${formatCurrency(result.amount)} − ${formatCurrency(result.capital)}`,
                    `J = ${formatCurrency(result.interest)}`,
                ],
            };

        case "capital":
            return {
                primaryLabel: "Capital calculado",
                primaryValue: formatCurrency(result.capital),
                formulas: ["C = J ÷ (i × n)", "M = C + J"],
                substitutions: [
                    `C = ${formatCurrency(result.interest)} ÷ (${formatNumber(decimalRate, 10)} × ${formatNumber(result.period, 8)})`,
                    `C = ${formatCurrency(result.capital)}`,
                    `M = ${formatCurrency(result.capital)} + ${formatCurrency(result.interest)}`,
                    `M = ${formatCurrency(result.amount)}`,
                ],
            };

        case "rate":
            return {
                primaryLabel: "Taxa calculada",
                primaryValue: rateValue,
                formulas: ["i = J ÷ (C × n)", "M = C + J"],
                substitutions: [
                    `i = ${formatCurrency(result.interest)} ÷ (${formatCurrency(result.capital)} × ${formatNumber(result.period, 8)})`,
                    `i = ${formatNumber(decimalRate, 10)}`,
                    `i = ${rateValue}`,
                    `M = ${formatCurrency(result.capital)} + ${formatCurrency(result.interest)} = ${formatCurrency(result.amount)}`,
                ],
            };

        case "period":
            return {
                primaryLabel: "Período calculado",
                primaryValue: periodValue,
                formulas: ["n = J ÷ (C × i)", "M = C + J"],
                substitutions: [
                    `n = ${formatCurrency(result.interest)} ÷ (${formatCurrency(result.capital)} × ${formatNumber(decimalRate, 10)})`,
                    `n = ${periodValue}`,
                    `M = ${formatCurrency(result.capital)} + ${formatCurrency(result.interest)} = ${formatCurrency(result.amount)}`,
                ],
            };
    }
}

export default function JurosSimplesCalculator({
    calculationId,
    calculationVersion,
}: JurosSimplesCalculatorProps) {
    const [mode, setMode] = useState<CalculationMode>("amount");
    const [capital, setCapital] = useState("");
    const [interest, setInterest] = useState("");
    const [amount, setAmount] = useState("");
    const [rate, setRate] = useState("");
    const [period, setPeriod] = useState("");
    const [rateUnit, setRateUnit] = useState("ao mês");
    const [periodUnit, setPeriodUnit] = useState("meses");
    const [error, setError] = useState("");
    const [result, setResult] = useState<Result | null>(null);
    const [reopenedCalculation, setReopenedCalculation] = useState<ReopenedCalculation | null>(null);
    const [isLoadingCalculation, setIsLoadingCalculation] = useState(Boolean(calculationId));
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
                    expectedType: "JUROS_SIMPLES",
                    requestedVersion: calculationVersion,
                });

                if (!isActive) {
                    return;
                }

                const loadedMode = loaded.input.mode;

                setMode(isCalculationMode(loadedMode) ? loadedMode : "amount");
                setCapital(getStringValue(loaded.input, "capital"));
                setInterest(getStringValue(loaded.input, "interest"));
                setAmount(getStringValue(loaded.input, "amount"));
                setRate(getStringValue(loaded.input, "rate"));
                setPeriod(getStringValue(loaded.input, "period"));
                setRateUnit(getStringValue(loaded.input, "rateUnit", "ao mês"));
                setPeriodUnit(getStringValue(loaded.input, "periodUnit", "meses"));
                setResult(null);
                setError("");
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

    const modeDescription = useMemo(() => {
        switch (mode) {
            case "amount":
                return "Informe o capital, a taxa e o período.";
            case "interest":
                return "Informe o capital e o montante final.";
            case "capital":
                return "Informe os juros, a taxa e o período.";
            case "rate":
                return "Informe o capital, os juros e o período.";
            case "period":
                return "Informe o capital, os juros e a taxa.";
        }
    }, [mode]);

    const modeLabel = getModeLabel(mode);

    function resetResult() {
        setError("");
        setResult(null);
    }

    function handleModeChange(nextMode: CalculationMode) {
        setMode(nextMode);
        resetResult();
    }

    function handleCalculate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setResult(null);

        const parsedCapital = parseNumber(capital);
        const parsedInterest = parseNumber(interest);
        const parsedAmount = parseNumber(amount);
        const parsedRatePercent = parseNumber(rate);
        const parsedRate = parsedRatePercent / 100;
        const parsedPeriod = parseNumber(period);

        let calculatedCapital = 0;
        let calculatedInterest = 0;
        let calculatedAmount = 0;
        let calculatedRate = 0;
        let calculatedPeriod = 0;

        if (mode === "amount") {
            if (parsedCapital <= 0 || parsedRatePercent < 0 || parsedPeriod <= 0) {
                setError("Informe capital, taxa e período válidos.");
                return;
            }

            calculatedCapital = parsedCapital;
            calculatedRate = parsedRatePercent;
            calculatedPeriod = parsedPeriod;
            calculatedInterest = parsedCapital * parsedRate * parsedPeriod;
            calculatedAmount = calculatedCapital + calculatedInterest;
        }

        if (mode === "interest") {
            if (parsedCapital <= 0 || parsedAmount <= 0 || parsedAmount < parsedCapital) {
                setError("O montante deve ser igual ou maior que o capital.");
                return;
            }

            calculatedCapital = parsedCapital;
            calculatedAmount = parsedAmount;
            calculatedInterest = parsedAmount - parsedCapital;
        }

        if (mode === "capital") {
            if (parsedInterest < 0 || parsedRatePercent <= 0 || parsedPeriod <= 0) {
                setError("Informe juros, taxa e período válidos.");
                return;
            }

            calculatedCapital = parsedInterest / (parsedRate * parsedPeriod);
            calculatedInterest = parsedInterest;
            calculatedAmount = calculatedCapital + calculatedInterest;
            calculatedRate = parsedRatePercent;
            calculatedPeriod = parsedPeriod;
        }

        if (mode === "rate") {
            if (parsedCapital <= 0 || parsedInterest < 0 || parsedPeriod <= 0) {
                setError("Informe capital, juros e período válidos.");
                return;
            }

            calculatedCapital = parsedCapital;
            calculatedInterest = parsedInterest;
            calculatedAmount = calculatedCapital + calculatedInterest;
            calculatedRate = (parsedInterest / (parsedCapital * parsedPeriod)) * 100;
            calculatedPeriod = parsedPeriod;
        }

        if (mode === "period") {
            if (parsedCapital <= 0 || parsedInterest < 0 || parsedRatePercent <= 0) {
                setError("Informe capital, juros e taxa válidos.");
                return;
            }

            calculatedCapital = parsedCapital;
            calculatedInterest = parsedInterest;
            calculatedAmount = calculatedCapital + calculatedInterest;
            calculatedRate = parsedRatePercent;
            calculatedPeriod = parsedInterest / (parsedCapital * parsedRate);
        }

        if (
            !Number.isFinite(calculatedCapital) ||
            !Number.isFinite(calculatedInterest) ||
            !Number.isFinite(calculatedAmount) ||
            !Number.isFinite(calculatedRate) ||
            !Number.isFinite(calculatedPeriod)
        ) {
            setError("Não foi possível realizar o cálculo.");
            return;
        }

        setResult({
            capital: calculatedCapital,
            interest: calculatedInterest,
            amount: calculatedAmount,
            rate: calculatedRate,
            period: calculatedPeriod,
        });
    }

    function handleClear() {
        setCapital("");
        setInterest("");
        setAmount("");
        setRate("");
        setPeriod("");
        setError("");
        setResult(null);
    }

    function handlePrint() {
        if (!result) {
            return;
        }

        setError("");

        const details = buildPrintDetails({ mode, result, rateUnit, periodUnit });
        const resultRows: CalculationPrintRow[] = [
            { label: "Capital inicial", value: formatCurrency(result.capital) },
            { label: "Total de juros", value: formatCurrency(result.interest) },
            { label: "Montante final", value: formatCurrency(result.amount) },
        ];

        if (mode !== "interest") {
            resultRows.push(
                { label: "Taxa aplicada", value: `${formatNumber(result.rate, 8)}% ${rateUnit}` },
                { label: "Período", value: `${formatNumber(result.period, 8)} ${periodUnit}` },
            );
        }

        const printResult = printCalculationDocument({
            title: "Memória de Cálculo — Juros Simples",
            modeLabel,
            primaryLabel: details.primaryLabel,
            primaryValue: details.primaryValue,
            inputRows: buildPrintInputRows({ mode, result, rateUnit, periodUnit }),
            resultRows,
            formulas: details.formulas,
            substitutions: details.substitutions,
            notice:
                "O cálculo utiliza o regime de juros simples, no qual os juros incidem exclusivamente sobre o capital inicial. Quando aplicável, a taxa e o período devem representar a mesma unidade de tempo.",
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
                            {reopenedCalculation.title} — versão {reopenedCalculation.sourceVersion}
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
                            <h2>Dados do cálculo</h2>
                            <p>{modeDescription}</p>
                        </div>
                    </div>

                    <div className={styles.modeSelector}>
                        <span>O que você deseja calcular?</span>

                        <div className={styles.modeGrid}>
                            {modeOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={mode === option.value ? styles.activeMode : styles.modeButton}
                                    onClick={() => handleModeChange(option.value)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.fields}>
                        {(mode === "amount" || mode === "interest" || mode === "rate" || mode === "period") && (
                            <label>
                                Capital inicial
                                <div className={styles.inputGroup}>
                                    <span>R$</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={capital}
                                        placeholder="0,00"
                                        onChange={(event) => setCapital(event.target.value)}
                                    />
                                </div>
                            </label>
                        )}

                        {(mode === "capital" || mode === "rate" || mode === "period") && (
                            <label>
                                Valor dos juros
                                <div className={styles.inputGroup}>
                                    <span>R$</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={interest}
                                        placeholder="0,00"
                                        onChange={(event) => setInterest(event.target.value)}
                                    />
                                </div>
                            </label>
                        )}

                        {mode === "interest" && (
                            <label>
                                Montante final
                                <div className={styles.inputGroup}>
                                    <span>R$</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={amount}
                                        placeholder="0,00"
                                        onChange={(event) => setAmount(event.target.value)}
                                    />
                                </div>
                            </label>
                        )}

                        {(mode === "amount" || mode === "capital" || mode === "period") && (
                            <label>
                                Taxa de juros
                                <div className={styles.combinedField}>
                                    <div className={styles.inputGroup}>
                                        <span>%</span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={rate}
                                            placeholder="0,00"
                                            onChange={(event) => setRate(event.target.value)}
                                        />
                                    </div>

                                    <select value={rateUnit} onChange={(event) => setRateUnit(event.target.value)}>
                                        <option value="ao dia">ao dia</option>
                                        <option value="ao mês">ao mês</option>
                                        <option value="ao ano">ao ano</option>
                                    </select>
                                </div>
                            </label>
                        )}

                        {(mode === "amount" || mode === "capital" || mode === "rate") && (
                            <label>
                                Período
                                <div className={styles.combinedField}>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={period}
                                        placeholder="0"
                                        onChange={(event) => setPeriod(event.target.value)}
                                    />

                                    <select
                                        value={periodUnit}
                                        onChange={(event) => setPeriodUnit(event.target.value)}
                                    >
                                        <option value="dias">dias</option>
                                        <option value="meses">meses</option>
                                        <option value="anos">anos</option>
                                    </select>
                                </div>
                            </label>
                        )}
                    </div>

                    {(mode === "amount" || mode === "capital" || mode === "rate" || mode === "period") && (
                        <div className={styles.warning}>
                            A taxa e o período devem estar na mesma unidade de tempo.
                        </div>
                    )}

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.actions}>
                        <button type="submit" className={styles.calculateButton}>
                            <Calculator size={19} />
                            Calcular
                        </button>

                        <button type="button" className={styles.clearButton} onClick={handleClear}>
                            <RotateCcw size={19} />
                            Limpar
                        </button>
                    </div>
                </form>

                <aside className={styles.resultCard}>
                    <span className={styles.resultLabel}>Resultado</span>
                    <h2>Resumo do cálculo</h2>

                    {result ? (
                        <>
                            <div className={styles.resultList}>
                                <div>
                                    <span>Capital inicial</span>
                                    <strong>{formatCurrency(result.capital)}</strong>
                                </div>

                                <div>
                                    <span>Total de juros</span>
                                    <strong>{formatCurrency(result.interest)}</strong>
                                </div>

                                <div>
                                    <span>Montante final</span>
                                    <strong>{formatCurrency(result.amount)}</strong>
                                </div>

                                {mode !== "interest" && (
                                    <div>
                                        <span>Taxa aplicada</span>
                                        <strong>
                                            {formatNumber(result.rate)}% {rateUnit}
                                        </strong>
                                    </div>
                                )}

                                {mode !== "interest" && (
                                    <div>
                                        <span>Período</span>
                                        <strong>
                                            {formatNumber(result.period)} {periodUnit}
                                        </strong>
                                    </div>
                                )}
                            </div>

                            <div className={styles.total}>
                                <span>Valor final</span>
                                <strong>{formatCurrency(result.amount)}</strong>
                            </div>

                            <div className={styles.formula}>
                                <span>Fórmulas utilizadas</span>
                                <strong>J = C × i × n</strong>
                                <strong>M = C + J</strong>
                            </div>

                            <button type="button" className={styles.printButton} onClick={handlePrint}>
                                <Printer size={18} />
                                Imprimir / Salvar PDF
                            </button>

                            <SaveCalculationModal
                                calculationType="JUROS_SIMPLES"
                                defaultTitle={`Juros Simples — ${modeLabel}`}
                                defaultDescription="Memória de cálculo pelo regime de juros simples."
                                input={{
                                    mode,
                                    capital,
                                    interest,
                                    amount,
                                    rate,
                                    period,
                                    rateUnit,
                                    periodUnit,
                                }}
                                result={{
                                    capital: result.capital,
                                    interest: result.interest,
                                    amount: result.amount,
                                    rate: result.rate,
                                    period: result.period,
                                }}
                                premises={{
                                    rateUnit,
                                    periodUnit,
                                    compatibility: "A taxa e o período utilizam a mesma unidade de tempo.",
                                }}
                                methodology={{
                                    regime: "Juros simples",
                                    description: "Os juros incidem exclusivamente sobre o capital inicial.",
                                }}
                                formulas={{
                                    interest: "J = C × i × n",
                                    amount: "M = C + J",
                                }}
                                summary={{
                                    capital: result.capital,
                                    totalInterest: result.interest,
                                    finalAmount: result.amount,
                                }}
                                onRevisionSaved={(version) =>
                                    setReopenedCalculation((current) =>
                                        current ? { ...current, currentVersion: version } : current,
                                    )
                                }
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
                            />
                        </>
                    ) : (
                        <div className={styles.empty}>
                            Selecione o cálculo, preencha os campos e clique em calcular.
                        </div>
                    )}
                </aside>
            </div>
        </section>
    );
}