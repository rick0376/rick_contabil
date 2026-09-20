//src/components/calculators/ValorFuturoCalculator/ValorFuturoCalculator.tsx

"use client";

import {
    Calculator,
    CircleAlert,
    History,
    Loader2,
    Printer,
    RotateCcw,
} from "lucide-react";
import {
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";

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

type CalculationMode =
    | "futureValue"
    | "presentValue"
    | "interest"
    | "rate"
    | "period";

type ValorFuturoCalculatorProps = {
    calculationId?: string;
    calculationVersion?: number;
};

type CalculationResult = {
    presentValue: number;
    futureValue: number;
    interest: number;
    rate: number;
    period: number;
};

const modeOptions: Array<{
    value: CalculationMode;
    label: string;
}> = [
        {
            value: "futureValue",
            label: "Calcular valor futuro",
        },
        {
            value: "presentValue",
            label: "Calcular valor presente",
        },
        {
            value: "interest",
            label: "Calcular juros",
        },
        {
            value: "rate",
            label: "Calcular taxa",
        },
        {
            value: "period",
            label: "Calcular período",
        },
    ];

function isCalculationMode(
    value: unknown,
): value is CalculationMode {
    return modeOptions.some(
        (option) => option.value === value,
    );
}

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

function formatNumber(
    value: number,
    maximumFractionDigits = 6,
) {
    return new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits,
    }).format(value);
}

function getModeLabel(mode: CalculationMode) {
    return (
        modeOptions.find((option) => option.value === mode)?.label ??
        "Cálculo de valor futuro"
    );
}

function buildPrintInputRows({
    mode,
    result,
    rateUnit,
    periodUnit,
}: {
    mode: CalculationMode;
    result: CalculationResult;
    rateUnit: string;
    periodUnit: string;
}): CalculationPrintRow[] {
    const rateValue = `${formatNumber(result.rate, 8)}% ${rateUnit}`;
    const periodValue = `${formatNumber(result.period, 8)} ${periodUnit}`;

    switch (mode) {
        case "futureValue":
        case "interest":
            return [
                { label: "Valor presente", value: formatCurrency(result.presentValue) },
                { label: "Taxa de juros", value: rateValue },
                { label: "Período", value: periodValue },
            ];

        case "presentValue":
            return [
                { label: "Valor futuro", value: formatCurrency(result.futureValue) },
                { label: "Taxa de juros", value: rateValue },
                { label: "Período", value: periodValue },
            ];

        case "rate":
            return [
                { label: "Valor presente", value: formatCurrency(result.presentValue) },
                { label: "Valor futuro", value: formatCurrency(result.futureValue) },
                { label: "Período", value: periodValue },
            ];

        case "period":
            return [
                { label: "Valor presente", value: formatCurrency(result.presentValue) },
                { label: "Valor futuro", value: formatCurrency(result.futureValue) },
                { label: "Taxa de juros", value: rateValue },
            ];
    }
}

function buildPrintCalculationDetails({
    mode,
    result,
    rateUnit,
    periodUnit,
}: {
    mode: CalculationMode;
    result: CalculationResult;
    rateUnit: string;
    periodUnit: string;
}) {
    const decimalRate = result.rate / 100;
    const rateValue = `${formatNumber(result.rate, 8)}% ${rateUnit}`;
    const periodValue = `${formatNumber(result.period, 8)} ${periodUnit}`;

    switch (mode) {
        case "futureValue":
            return {
                primaryLabel: "Valor futuro calculado",
                primaryValue: formatCurrency(result.futureValue),
                formulas: ["FV = PV × (1 + i)ⁿ", "J = FV − PV"],
                substitutions: [
                    `FV = ${formatCurrency(result.presentValue)} × (1 + ${formatNumber(decimalRate, 10)})^${formatNumber(result.period, 8)}`,
                    `FV = ${formatCurrency(result.futureValue)}`,
                    `J = ${formatCurrency(result.futureValue)} − ${formatCurrency(result.presentValue)}`,
                    `J = ${formatCurrency(result.interest)}`,
                ],
            };

        case "presentValue":
            return {
                primaryLabel: "Valor presente calculado",
                primaryValue: formatCurrency(result.presentValue),
                formulas: ["PV = FV ÷ (1 + i)ⁿ", "J = FV − PV"],
                substitutions: [
                    `PV = ${formatCurrency(result.futureValue)} ÷ (1 + ${formatNumber(decimalRate, 10)})^${formatNumber(result.period, 8)}`,
                    `PV = ${formatCurrency(result.presentValue)}`,
                    `J = ${formatCurrency(result.futureValue)} − ${formatCurrency(result.presentValue)}`,
                    `J = ${formatCurrency(result.interest)}`,
                ],
            };

        case "interest":
            return {
                primaryLabel: "Juros calculados",
                primaryValue: formatCurrency(result.interest),
                formulas: ["FV = PV × (1 + i)ⁿ", "J = FV − PV"],
                substitutions: [
                    `FV = ${formatCurrency(result.presentValue)} × (1 + ${formatNumber(decimalRate, 10)})^${formatNumber(result.period, 8)}`,
                    `FV = ${formatCurrency(result.futureValue)}`,
                    `J = ${formatCurrency(result.futureValue)} − ${formatCurrency(result.presentValue)}`,
                    `J = ${formatCurrency(result.interest)}`,
                ],
            };

        case "rate":
            return {
                primaryLabel: "Taxa calculada",
                primaryValue: rateValue,
                formulas: ["i = (FV ÷ PV)^(1 ÷ n) − 1", "J = FV − PV"],
                substitutions: [
                    `i = (${formatCurrency(result.futureValue)} ÷ ${formatCurrency(result.presentValue)})^(1 ÷ ${formatNumber(result.period, 8)}) − 1`,
                    `i = ${formatNumber(decimalRate, 10)}`,
                    `i = ${rateValue}`,
                    `J = ${formatCurrency(result.futureValue)} − ${formatCurrency(result.presentValue)} = ${formatCurrency(result.interest)}`,
                ],
            };

        case "period":
            return {
                primaryLabel: "Período calculado",
                primaryValue: periodValue,
                formulas: ["n = ln(FV ÷ PV) ÷ ln(1 + i)", "J = FV − PV"],
                substitutions: [
                    `n = ln(${formatCurrency(result.futureValue)} ÷ ${formatCurrency(result.presentValue)}) ÷ ln(1 + ${formatNumber(decimalRate, 10)})`,
                    `n = ${periodValue}`,
                    `J = ${formatCurrency(result.futureValue)} − ${formatCurrency(result.presentValue)} = ${formatCurrency(result.interest)}`,
                ],
            };
    }
}

export default function ValorFuturoCalculator({
    calculationId,
    calculationVersion,
}: ValorFuturoCalculatorProps) {
    const [mode, setMode] =
        useState<CalculationMode>("futureValue");

    const [presentValue, setPresentValue] =
        useState("");

    const [futureValue, setFutureValue] =
        useState("");

    const [rate, setRate] = useState("");
    const [period, setPeriod] = useState("");

    const [rateUnit, setRateUnit] =
        useState("ao mês");

    const [periodUnit, setPeriodUnit] =
        useState("meses");

    const [error, setError] = useState("");

    const [result, setResult] =
        useState<CalculationResult | null>(null);

    const [
        reopenedCalculation,
        setReopenedCalculation,
    ] = useState<ReopenedCalculation | null>(
        null,
    );

    const [
        isLoadingCalculation,
        setIsLoadingCalculation,
    ] = useState(Boolean(calculationId));

    const [loadError, setLoadError] =
        useState("");

    useEffect(() => {
        if (!calculationId) {
            setReopenedCalculation(null);
            setIsLoadingCalculation(false);
            setLoadError("");

            return;
        }

        const targetCalculationId =
            calculationId;

        let isActive = true;

        async function loadRevision() {
            setIsLoadingCalculation(true);
            setLoadError("");

            try {
                const loaded =
                    await loadCalculationRevision({
                        calculationId:
                            targetCalculationId,

                        expectedType:
                            "VALOR_FUTURO",

                        requestedVersion:
                            calculationVersion,
                    });

                if (!isActive) {
                    return;
                }

                const loadedMode =
                    loaded.input.mode;

                setMode(
                    isCalculationMode(loadedMode)
                        ? loadedMode
                        : "futureValue",
                );

                setPresentValue(
                    getStringValue(
                        loaded.input,
                        "presentValue",
                    ),
                );

                setFutureValue(
                    getStringValue(
                        loaded.input,
                        "futureValue",
                    ),
                );

                setRate(
                    getStringValue(
                        loaded.input,
                        "rate",
                    ),
                );

                setPeriod(
                    getStringValue(
                        loaded.input,
                        "period",
                    ),
                );

                setRateUnit(
                    getStringValue(
                        loaded.input,
                        "rateUnit",
                        "ao mês",
                    ),
                );

                setPeriodUnit(
                    getStringValue(
                        loaded.input,
                        "periodUnit",
                        "meses",
                    ),
                );

                setResult(null);
                setError("");
                setReopenedCalculation(loaded);
            } catch (loadCalculationError) {
                if (!isActive) {
                    return;
                }

                setReopenedCalculation(null);

                setLoadError(
                    loadCalculationError instanceof
                        Error
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
    }, [
        calculationId,
        calculationVersion,
    ]);

    const description = useMemo(() => {
        switch (mode) {
            case "futureValue":
                return "Informe o valor presente, a taxa e o período.";

            case "presentValue":
                return "Informe o valor futuro, a taxa e o período.";

            case "interest":
                return "Informe o valor presente, a taxa e o período.";

            case "rate":
                return "Informe o valor presente, o valor futuro e o período.";

            case "period":
                return "Informe o valor presente, o valor futuro e a taxa.";
        }
    }, [mode]);

    const modeLabel = getModeLabel(mode);

    function handleModeChange(
        nextMode: CalculationMode,
    ) {
        setMode(nextMode);
        setError("");
        setResult(null);
    }

    function handleCalculate(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError("");
        setResult(null);

        const parsedPresentValue =
            parseNumber(presentValue);

        const parsedFutureValue =
            parseNumber(futureValue);

        const parsedRatePercent =
            parseNumber(rate);

        const parsedRate =
            parsedRatePercent / 100;

        const parsedPeriod =
            parseNumber(period);

        let calculatedPresentValue = 0;
        let calculatedFutureValue = 0;
        let calculatedInterest = 0;
        let calculatedRate = 0;
        let calculatedPeriod = 0;

        if (
            mode === "futureValue" ||
            mode === "interest"
        ) {
            if (
                !Number.isFinite(
                    parsedPresentValue,
                ) ||
                !Number.isFinite(
                    parsedRatePercent,
                ) ||
                !Number.isFinite(parsedPeriod) ||
                parsedPresentValue <= 0 ||
                parsedRatePercent < 0 ||
                parsedPeriod <= 0
            ) {
                setError(
                    "Informe valor presente, taxa e período válidos.",
                );

                return;
            }

            calculatedPresentValue =
                parsedPresentValue;

            calculatedFutureValue =
                parsedPresentValue *
                Math.pow(
                    1 + parsedRate,
                    parsedPeriod,
                );

            calculatedInterest =
                calculatedFutureValue -
                calculatedPresentValue;

            calculatedRate =
                parsedRatePercent;

            calculatedPeriod =
                parsedPeriod;
        }

        if (mode === "presentValue") {
            if (
                !Number.isFinite(
                    parsedFutureValue,
                ) ||
                !Number.isFinite(
                    parsedRatePercent,
                ) ||
                !Number.isFinite(parsedPeriod) ||
                parsedFutureValue <= 0 ||
                parsedRatePercent < 0 ||
                parsedPeriod <= 0
            ) {
                setError(
                    "Informe valor futuro, taxa e período válidos.",
                );

                return;
            }

            calculatedPresentValue =
                parsedFutureValue /
                Math.pow(
                    1 + parsedRate,
                    parsedPeriod,
                );

            calculatedFutureValue =
                parsedFutureValue;

            calculatedInterest =
                calculatedFutureValue -
                calculatedPresentValue;

            calculatedRate =
                parsedRatePercent;

            calculatedPeriod =
                parsedPeriod;
        }

        if (mode === "rate") {
            if (
                !Number.isFinite(
                    parsedPresentValue,
                ) ||
                !Number.isFinite(
                    parsedFutureValue,
                ) ||
                !Number.isFinite(parsedPeriod) ||
                parsedPresentValue <= 0 ||
                parsedFutureValue <
                parsedPresentValue ||
                parsedPeriod <= 0
            ) {
                setError(
                    "Informe valor presente, valor futuro e período válidos.",
                );

                return;
            }

            calculatedPresentValue =
                parsedPresentValue;

            calculatedFutureValue =
                parsedFutureValue;

            calculatedInterest =
                parsedFutureValue -
                parsedPresentValue;

            calculatedRate =
                (Math.pow(
                    parsedFutureValue /
                    parsedPresentValue,

                    1 / parsedPeriod,
                ) -
                    1) *
                100;

            calculatedPeriod =
                parsedPeriod;
        }

        if (mode === "period") {
            if (
                !Number.isFinite(
                    parsedPresentValue,
                ) ||
                !Number.isFinite(
                    parsedFutureValue,
                ) ||
                !Number.isFinite(
                    parsedRatePercent,
                ) ||
                parsedPresentValue <= 0 ||
                parsedFutureValue <
                parsedPresentValue ||
                parsedRatePercent <= 0
            ) {
                setError(
                    "Informe valor presente, valor futuro e taxa válidos.",
                );

                return;
            }

            calculatedPresentValue =
                parsedPresentValue;

            calculatedFutureValue =
                parsedFutureValue;

            calculatedInterest =
                parsedFutureValue -
                parsedPresentValue;

            calculatedRate =
                parsedRatePercent;

            calculatedPeriod =
                Math.log(
                    parsedFutureValue /
                    parsedPresentValue,
                ) /
                Math.log(1 + parsedRate);
        }

        if (
            !Number.isFinite(
                calculatedPresentValue,
            ) ||
            !Number.isFinite(
                calculatedFutureValue,
            ) ||
            !Number.isFinite(
                calculatedInterest,
            ) ||
            !Number.isFinite(
                calculatedRate,
            ) ||
            !Number.isFinite(
                calculatedPeriod,
            )
        ) {
            setError(
                "Não foi possível realizar o cálculo.",
            );

            return;
        }

        setResult({
            presentValue:
                calculatedPresentValue,

            futureValue:
                calculatedFutureValue,

            interest:
                calculatedInterest,

            rate: calculatedRate,

            period:
                calculatedPeriod,
        });
    }

    function handleClear() {
        setPresentValue("");
        setFutureValue("");
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

        const details = buildPrintCalculationDetails({
            mode,
            result,
            rateUnit,
            periodUnit,
        });

        const printResult = printCalculationDocument({
            title: "Memória de Cálculo — Valor Futuro",
            modeLabel,
            primaryLabel: details.primaryLabel,
            primaryValue: details.primaryValue,
            inputRows: buildPrintInputRows({
                mode,
                result,
                rateUnit,
                periodUnit,
            }),
            resultRows: [
                { label: "Valor presente", value: formatCurrency(result.presentValue) },
                { label: "Total de juros", value: formatCurrency(result.interest) },
                { label: "Valor futuro", value: formatCurrency(result.futureValue) },
                { label: "Taxa aplicada", value: `${formatNumber(result.rate, 8)}% ${rateUnit}` },
                { label: "Período", value: `${formatNumber(result.period, 8)} ${periodUnit}` },
            ],
            formulas: details.formulas,
            substitutions: details.substitutions,
            notice:
                "O cálculo utiliza capitalização composta. O valor futuro representa o montante acumulado após a incorporação dos juros ao saldo em cada período. A taxa e o período devem utilizar a mesma unidade de tempo.",
        });

        if (!printResult.ok) {
            setError(
                printResult.error ??
                "Não foi possível abrir a impressão.",
            );
        }
    }

    return (
        <div
            style={{
                display: "grid",
                gap: 18,
            }}
        >
            {isLoadingCalculation && (
                <div className={styles.warning}>
                    <Loader2 size={18} />

                    <strong>
                        Carregando revisão do histórico...
                    </strong>
                </div>
            )}

            {loadError && (
                <div className={styles.error}>
                    <CircleAlert size={18} />

                    <strong>{loadError}</strong>
                </div>
            )}

            {reopenedCalculation &&
                !isLoadingCalculation && (
                    <div
                        className={
                            styles.warning
                        }
                    >
                        <History size={18} />

                        <strong>
                            {
                                reopenedCalculation.title
                            }{" "}
                            — versão{" "}
                            {
                                reopenedCalculation.sourceVersion
                            }
                            . Recalcule para salvar a
                            versão{" "}
                            {reopenedCalculation.currentVersion +
                                1}
                            .
                        </strong>
                    </div>
                )}

            <section className={styles.container}>
                <form
                    className={styles.formCard}
                    onSubmit={handleCalculate}
                >
                    <div className={styles.cardTitle}>
                        <div className={styles.icon}>
                            <Calculator size={24} />
                        </div>

                        <div>
                            <h2>Dados do cálculo</h2>
                            <p>{description}</p>
                        </div>
                    </div>

                    <div
                        className={
                            styles.modeSelector
                        }
                    >
                        <span>
                            O que você deseja calcular?
                        </span>

                        <div
                            className={
                                styles.modeGrid
                            }
                        >
                            {modeOptions.map(
                                (option) => (
                                    <button
                                        key={
                                            option.value
                                        }
                                        type="button"
                                        className={
                                            mode ===
                                                option.value
                                                ? styles.activeMode
                                                : styles.modeButton
                                        }
                                        onClick={() =>
                                            handleModeChange(
                                                option.value,
                                            )
                                        }
                                    >
                                        {
                                            option.label
                                        }
                                    </button>
                                ),
                            )}
                        </div>
                    </div>

                    <div className={styles.fields}>
                        {(mode ===
                            "futureValue" ||
                            mode === "interest" ||
                            mode === "rate" ||
                            mode ===
                            "period") && (
                                <label>
                                    Valor presente

                                    <div
                                        className={
                                            styles.inputGroup
                                        }
                                    >
                                        <span>R$</span>

                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={
                                                presentValue
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setPresentValue(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="0,00"
                                        />
                                    </div>
                                </label>
                            )}

                        {(mode ===
                            "presentValue" ||
                            mode === "rate" ||
                            mode ===
                            "period") && (
                                <label>
                                    Valor futuro

                                    <div
                                        className={
                                            styles.inputGroup
                                        }
                                    >
                                        <span>R$</span>

                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={
                                                futureValue
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setFutureValue(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="0,00"
                                        />
                                    </div>
                                </label>
                            )}

                        {(mode ===
                            "futureValue" ||
                            mode ===
                            "presentValue" ||
                            mode === "interest" ||
                            mode ===
                            "period") && (
                                <label>
                                    Taxa de juros

                                    <div
                                        className={
                                            styles.combinedField
                                        }
                                    >
                                        <div
                                            className={
                                                styles.inputGroup
                                            }
                                        >
                                            <span>%</span>

                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={rate}
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setRate(
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="0,00"
                                            />
                                        </div>

                                        <select
                                            value={
                                                rateUnit
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setRateUnit(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                        >
                                            <option value="ao dia">
                                                ao dia
                                            </option>

                                            <option value="ao mês">
                                                ao mês
                                            </option>

                                            <option value="ao ano">
                                                ao ano
                                            </option>
                                        </select>
                                    </div>
                                </label>
                            )}

                        {(mode ===
                            "futureValue" ||
                            mode ===
                            "presentValue" ||
                            mode === "interest" ||
                            mode === "rate") && (
                                <label>
                                    Período

                                    <div
                                        className={
                                            styles.combinedField
                                        }
                                    >
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={period}
                                            onChange={(
                                                event,
                                            ) =>
                                                setPeriod(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="0"
                                        />

                                        <select
                                            value={
                                                periodUnit
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setPeriodUnit(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                        >
                                            <option value="dias">
                                                dias
                                            </option>

                                            <option value="meses">
                                                meses
                                            </option>

                                            <option value="anos">
                                                anos
                                            </option>
                                        </select>
                                    </div>
                                </label>
                            )}
                    </div>

                    <div
                        className={
                            styles.warning
                        }
                    >
                        A taxa e o período devem
                        estar na mesma unidade de
                        tempo.
                    </div>

                    {error && (
                        <div
                            className={
                                styles.error
                            }
                        >
                            {error}
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button
                            type="submit"
                            className={
                                styles.calculateButton
                            }
                        >
                            <Calculator size={19} />
                            Calcular
                        </button>

                        <button
                            type="button"
                            className={
                                styles.clearButton
                            }
                            onClick={handleClear}
                        >
                            <RotateCcw size={19} />
                            Limpar
                        </button>
                    </div>
                </form>

                <aside
                    className={
                        styles.resultCard
                    }
                >
                    <span
                        className={
                            styles.resultLabel
                        }
                    >
                        Resultado
                    </span>

                    <h2>Resumo do cálculo</h2>

                    {result ? (
                        <>
                            <div
                                className={
                                    styles.resultList
                                }
                            >
                                <div>
                                    <span>
                                        Valor presente
                                    </span>

                                    <strong>
                                        {formatCurrency(
                                            result.presentValue,
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Total de juros
                                    </span>

                                    <strong>
                                        {formatCurrency(
                                            result.interest,
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Valor futuro
                                    </span>

                                    <strong>
                                        {formatCurrency(
                                            result.futureValue,
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Taxa aplicada
                                    </span>

                                    <strong>
                                        {formatNumber(
                                            result.rate,
                                        )}
                                        % {rateUnit}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Período
                                    </span>

                                    <strong>
                                        {formatNumber(
                                            result.period,
                                        )}{" "}
                                        {periodUnit}
                                    </strong>
                                </div>
                            </div>

                            <div
                                className={
                                    styles.total
                                }
                            >
                                <span>
                                    Valor futuro
                                    calculado
                                </span>

                                <strong>
                                    {formatCurrency(
                                        result.futureValue,
                                    )}
                                </strong>
                            </div>

                            <div
                                className={
                                    styles.formula
                                }
                            >
                                <span>
                                    Fórmulas utilizadas
                                </span>

                                <strong>
                                    FV = PV × (1 + i)ⁿ
                                </strong>

                                <strong>
                                    PV = FV ÷ (1 + i)ⁿ
                                </strong>

                                <strong>
                                    J = FV − PV
                                </strong>
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
                                calculationType="VALOR_FUTURO"
                                defaultTitle={`Valor Futuro — ${modeLabel}`}
                                defaultDescription="Memória de cálculo de valor futuro pelo regime de capitalização composta."
                                input={{
                                    mode,
                                    presentValue,
                                    futureValue,
                                    rate,
                                    period,
                                    rateUnit,
                                    periodUnit,
                                }}
                                result={{
                                    presentValue:
                                        result.presentValue,

                                    futureValue:
                                        result.futureValue,

                                    interest:
                                        result.interest,

                                    rate:
                                        result.rate,

                                    period:
                                        result.period,
                                }}
                                premises={{
                                    rateUnit,
                                    periodUnit,

                                    compatibility:
                                        "A taxa e o período utilizam a mesma unidade de tempo.",
                                }}
                                methodology={{
                                    regime:
                                        "Capitalização composta",

                                    description:
                                        "O capital é atualizado pela taxa composta durante o período informado.",
                                }}
                                formulas={{
                                    futureValue:
                                        "FV = PV × (1 + i)ⁿ",

                                    presentValue:
                                        "PV = FV ÷ (1 + i)ⁿ",

                                    interest:
                                        "J = FV − PV",

                                    futureValueSubstitution: `FV = ${result.presentValue} × (1 + ${result.rate / 100})^${result.period}`,

                                    presentValueSubstitution: `PV = ${result.futureValue} ÷ (1 + ${result.rate / 100})^${result.period}`,
                                }}
                                summary={{
                                    presentValue:
                                        result.presentValue,

                                    totalInterest:
                                        result.interest,

                                    futureValue:
                                        result.futureValue,
                                }}
                                warnings={{
                                    rounding:
                                        "Os valores exibidos em moeda foram formatados com duas casas decimais; o cálculo interno manteve maior precisão.",
                                }}
                                revisionTarget={
                                    reopenedCalculation
                                        ? {
                                            calculationId:
                                                reopenedCalculation.id,

                                            calculationTitle:
                                                reopenedCalculation.title,

                                            currentVersion:
                                                reopenedCalculation.currentVersion,

                                            sourceVersion:
                                                reopenedCalculation.sourceVersion,

                                            referenceDate:
                                                reopenedCalculation.referenceDate,

                                            status:
                                                reopenedCalculation.status,
                                        }
                                        : undefined
                                }
                                onRevisionSaved={(
                                    version,
                                ) =>
                                    setReopenedCalculation(
                                        (
                                            current,
                                        ) =>
                                            current
                                                ? {
                                                    ...current,

                                                    currentVersion:
                                                        version,
                                                }
                                                : current,
                                    )
                                }
                            />
                        </>
                    ) : (
                        <div
                            className={
                                styles.empty
                            }
                        >
                            Selecione o cálculo,
                            preencha os campos e
                            clique em calcular.
                        </div>
                    )}
                </aside>
            </section>
        </div>
    );
}