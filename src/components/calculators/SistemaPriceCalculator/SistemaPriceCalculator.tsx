//src/components/calculators/SistemaPriceCalculator/SistemaPriceCalculator.tsx

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
import { printProfessionalDocument } from "@/lib/printing/calculation-print";

import styles from "./styles.module.scss";

type CalculationMode =
    | "payment"
    | "principal"
    | "rate"
    | "installments";

type SistemaPriceCalculatorProps = {
    calculationId?: string;
    calculationVersion?: number;
};

type PriceResult = {
    principal: number;
    payment: number;
    rate: number;
    installments: number;
    totalPaid: number;
    totalInterest: number;
};

type AmortizationRow = {
    installment: number;
    openingBalance: number;
    payment: number;
    interest: number;
    amortization: number;
    balance: number;
};

const modes: Array<{
    value: CalculationMode;
    label: string;
}> = [
        {
            value: "payment",
            label: "Calcular prestação",
        },

        {
            value: "principal",
            label: "Calcular valor financiado",
        },

        {
            value: "rate",
            label: "Calcular taxa",
        },

        {
            value: "installments",
            label: "Calcular parcelas",
        },
    ];

function isCalculationMode(
    value: unknown,
): value is CalculationMode {
    return modes.some(
        (option) =>
            option.value === value,
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

function formatCurrency(
    value: number,
) {
    return new Intl.NumberFormat(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL",
        },
    ).format(value);
}

function formatNumber(
    value: number,
    digits = 6,
) {
    return new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits:
                digits,
        },
    ).format(value);
}

function calculatePayment(
    principal: number,
    rate: number,
    installments: number,
) {
    if (rate === 0) {
        return (
            principal /
            installments
        );
    }

    return (
        principal *
        (rate /
            (1 -
                Math.pow(
                    1 + rate,
                    -installments,
                )))
    );
}

function calculatePrincipal(
    payment: number,
    rate: number,
    installments: number,
) {
    if (rate === 0) {
        return (
            payment *
            installments
        );
    }

    return (
        payment *
        ((1 -
            Math.pow(
                1 + rate,
                -installments,
            )) /
            rate)
    );
}

function calculateRate(
    principal: number,
    payment: number,
    installments: number,
) {
    const minimumPayment =
        principal / installments;

    if (
        payment < minimumPayment
    ) {
        return null;
    }

    if (
        Math.abs(
            payment -
            minimumPayment,
        ) < 0.0000001
    ) {
        return 0;
    }

    let lowerRate = 0;
    let upperRate = 10;

    for (
        let iteration = 0;
        iteration < 200;
        iteration += 1
    ) {
        const middleRate =
            (lowerRate + upperRate) /
            2;

        const calculatedPayment =
            calculatePayment(
                principal,
                middleRate,
                installments,
            );

        if (
            calculatedPayment >
            payment
        ) {
            upperRate = middleRate;
        } else {
            lowerRate = middleRate;
        }
    }

    return (
        lowerRate + upperRate
    ) / 2;
}

function calculateInstallments(
    principal: number,
    payment: number,
    rate: number,
) {
    if (rate === 0) {
        return (
            principal / payment
        );
    }

    const denominator =
        payment -
        principal * rate;

    if (denominator <= 0) {
        return null;
    }

    return (
        Math.log(
            payment /
            denominator,
        ) /
        Math.log(1 + rate)
    );
}

function buildAmortizationSchedule(
    principal: number,
    payment: number,
    rate: number,
    installments: number,
) {
    const rows:
        AmortizationRow[] = [];

    let balance = principal;

    const roundedInstallments =
        Math.ceil(installments);

    for (
        let installment = 1;
        installment <=
        roundedInstallments;
        installment += 1
    ) {
        const openingBalance =
            balance;

        const interest =
            openingBalance * rate;

        let currentPayment =
            payment;

        let amortization =
            currentPayment -
            interest;

        if (
            installment ===
            roundedInstallments ||
            amortization >
            openingBalance
        ) {
            amortization =
                openingBalance;

            currentPayment =
                amortization +
                interest;
        }

        balance = Math.max(
            0,
            openingBalance -
            amortization,
        );

        if (
            balance < 0.00000001
        ) {
            balance = 0;
        }

        rows.push({
            installment,
            openingBalance,
            payment:
                currentPayment,
            interest,
            amortization,
            balance,
        });
    }

    return rows;
}


function getModeLabel(mode: CalculationMode) {
    return modes.find((option) => option.value === mode)?.label ?? "Cálculo pelo Sistema Price";
}

function buildPriceInputRows({
    mode,
    result,
    rateUnit,
}: {
    mode: CalculationMode;
    result: PriceResult;
    rateUnit: string;
}) {
    const rateValue = `${formatNumber(result.rate, 8)}% ${rateUnit}`;
    const installmentValue = String(result.installments);

    switch (mode) {
        case "payment":
            return [
                { label: "Valor financiado", value: formatCurrency(result.principal) },
                { label: "Taxa de juros", value: rateValue },
                { label: "Quantidade de parcelas", value: installmentValue },
            ];
        case "principal":
            return [
                { label: "Valor da prestação", value: formatCurrency(result.payment) },
                { label: "Taxa de juros", value: rateValue },
                { label: "Quantidade de parcelas", value: installmentValue },
            ];
        case "rate":
            return [
                { label: "Valor financiado", value: formatCurrency(result.principal) },
                { label: "Valor da prestação", value: formatCurrency(result.payment) },
                { label: "Quantidade de parcelas", value: installmentValue },
            ];
        case "installments":
            return [
                { label: "Valor financiado", value: formatCurrency(result.principal) },
                { label: "Valor da prestação informada", value: formatCurrency(result.payment) },
                { label: "Taxa de juros", value: rateValue },
            ];
    }
}

function buildPriceCalculationDetails({ mode, result, rateUnit }: {
    mode: CalculationMode;
    result: PriceResult;
    rateUnit: string;
}) {
    const decimalRate = result.rate / 100;
    const rateValue = `${formatNumber(result.rate, 8)}% ${rateUnit}`;
    const commonFormulas = [
        "Jurosₖ = Saldo inicialₖ × i",
        "Amortizaçãoₖ = Prestaçãoₖ − Jurosₖ",
        "Saldo finalₖ = Saldo inicialₖ − Amortizaçãoₖ",
    ];

    switch (mode) {
        case "payment":
            return {
                primaryLabel: "Prestação calculada",
                primaryValue: formatCurrency(result.payment),
                formulas: ["PMT = PV × i ÷ [1 − (1 + i)⁻ⁿ]", ...commonFormulas],
                substitutions: [
                    `PMT = ${formatCurrency(result.principal)} × ${formatNumber(decimalRate, 10)} ÷ [1 − (1 + ${formatNumber(decimalRate, 10)})^−${result.installments}]`,
                    `PMT = ${formatCurrency(result.payment)}`,
                ],
            };
        case "principal":
            return {
                primaryLabel: "Valor financiado calculado",
                primaryValue: formatCurrency(result.principal),
                formulas: ["PV = PMT × [1 − (1 + i)⁻ⁿ] ÷ i", ...commonFormulas],
                substitutions: [
                    `PV = ${formatCurrency(result.payment)} × [1 − (1 + ${formatNumber(decimalRate, 10)})^−${result.installments}] ÷ ${formatNumber(decimalRate, 10)}`,
                    `PV = ${formatCurrency(result.principal)}`,
                ],
            };
        case "rate":
            return {
                primaryLabel: "Taxa calculada",
                primaryValue: rateValue,
                formulas: [
                    "PMT = PV × i ÷ [1 − (1 + i)⁻ⁿ]",
                    "i = taxa que iguala a prestação calculada à prestação informada",
                    ...commonFormulas,
                ],
                substitutions: [
                    `${formatCurrency(result.payment)} = ${formatCurrency(result.principal)} × i ÷ [1 − (1 + i)^−${result.installments}]`,
                    `i = ${formatNumber(decimalRate, 10)}`,
                    `i = ${rateValue}`,
                    "Método numérico: bisseção com 200 iterações.",
                ],
            };
        case "installments":
            return {
                primaryLabel: "Quantidade de parcelas calculada",
                primaryValue: String(result.installments),
                formulas: [
                    "n = ln[PMT ÷ (PMT − PV × i)] ÷ ln(1 + i)",
                    "Quantidade adotada = arredondamento para o inteiro superior",
                    ...commonFormulas,
                ],
                substitutions: [
                    `n = ln[${formatCurrency(result.payment)} ÷ (${formatCurrency(result.payment)} − ${formatCurrency(result.principal)} × ${formatNumber(decimalRate, 10)})] ÷ ln(1 + ${formatNumber(decimalRate, 10)})`,
                    `Quantidade adotada = ${result.installments} parcelas`,
                    `Prestação recalculada = ${formatCurrency(result.payment)}`,
                ],
            };
    }
}

export default function SistemaPriceCalculator({
    calculationId,
    calculationVersion,
}: SistemaPriceCalculatorProps) {
    const [mode, setMode] =
        useState<CalculationMode>(
            "payment",
        );

    const [
        principal,
        setPrincipal,
    ] = useState("");

    const [payment, setPayment] =
        useState("");

    const [rate, setRate] =
        useState("");

    const [
        installments,
        setInstallments,
    ] = useState("");

    const [
        rateUnit,
        setRateUnit,
    ] = useState("ao mês");

    const [error, setError] =
        useState("");

    const [result, setResult] =
        useState<PriceResult | null>(
            null,
        );

    const [
        schedule,
        setSchedule,
    ] = useState<
        AmortizationRow[]
    >([]);

    const [
        showSchedule,
        setShowSchedule,
    ] = useState(false);

    const [
        reopenedCalculation,
        setReopenedCalculation,
    ] = useState<ReopenedCalculation | null>(
        null,
    );

    const [
        isLoadingCalculation,
        setIsLoadingCalculation,
    ] = useState(
        Boolean(calculationId),
    );

    const [
        loadError,
        setLoadError,
    ] = useState("");

    useEffect(() => {
        if (!calculationId) {
            setReopenedCalculation(
                null,
            );

            setIsLoadingCalculation(
                false,
            );

            setLoadError("");

            return;
        }

        const targetCalculationId =
            calculationId;

        let isActive = true;

        async function loadRevision() {
            setIsLoadingCalculation(
                true,
            );

            setLoadError("");

            try {
                const loaded =
                    await loadCalculationRevision(
                        {
                            calculationId:
                                targetCalculationId,

                            expectedType:
                                [
                                    "SISTEMA_PRICE",
                                    "PRICE",
                                ],

                            requestedVersion:
                                calculationVersion,
                        },
                    );

                if (!isActive) {
                    return;
                }

                const loadedMode =
                    loaded.input.mode;

                setMode(
                    isCalculationMode(
                        loadedMode,
                    )
                        ? loadedMode
                        : "payment",
                );

                setPrincipal(
                    getStringValue(
                        loaded.input,
                        "principal",
                    ),
                );

                setPayment(
                    getStringValue(
                        loaded.input,
                        "payment",
                    ),
                );

                setRate(
                    getStringValue(
                        loaded.input,
                        "rate",
                    ),
                );

                setInstallments(
                    getStringValue(
                        loaded.input,
                        "installments",
                    ),
                );

                setRateUnit(
                    getStringValue(
                        loaded.input,
                        "rateUnit",
                        "ao mês",
                    ),
                );

                setError("");
                setResult(null);
                setSchedule([]);
                setShowSchedule(false);

                setReopenedCalculation(
                    loaded,
                );
            } catch (
            loadCalculationError
            ) {
                if (!isActive) {
                    return;
                }

                setReopenedCalculation(
                    null,
                );

                setLoadError(
                    loadCalculationError instanceof
                        Error
                        ? loadCalculationError.message
                        : "Não foi possível carregar a revisão.",
                );
            } finally {
                if (isActive) {
                    setIsLoadingCalculation(
                        false,
                    );
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

    const description =
        useMemo(() => {
            switch (mode) {
                case "payment":
                    return "Informe o valor financiado, a taxa e a quantidade de parcelas.";

                case "principal":
                    return "Informe a prestação, a taxa e a quantidade de parcelas.";

                case "rate":
                    return "Informe o valor financiado, a prestação e a quantidade de parcelas.";

                case "installments":
                    return "Informe o valor financiado, a prestação e a taxa.";
            }
        }, [mode]);

    const modeLabel = getModeLabel(mode);

    function handleModeChange(
        nextMode: CalculationMode,
    ) {
        setMode(nextMode);
        setError("");
        setResult(null);
        setSchedule([]);
        setShowSchedule(false);
    }

    function handleCalculate(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError("");
        setResult(null);
        setSchedule([]);
        setShowSchedule(false);

        const parsedPrincipal =
            parseNumber(principal);

        const parsedPayment =
            parseNumber(payment);

        const parsedRatePercent =
            parseNumber(rate);

        const parsedRate =
            parsedRatePercent /
            100;

        const parsedInstallments =
            parseNumber(
                installments,
            );

        let calculatedPrincipal =
            0;

        let calculatedPayment = 0;

        let calculatedRate = 0;

        let calculatedInstallments =
            0;

        if (mode === "payment") {
            if (
                parsedPrincipal <= 0 ||
                parsedRatePercent <
                0 ||
                parsedInstallments <=
                0
            ) {
                setError(
                    "Informe valor financiado, taxa e parcelas válidos.",
                );

                return;
            }

            calculatedPrincipal =
                parsedPrincipal;

            calculatedRate =
                parsedRate;

            calculatedInstallments =
                Math.ceil(
                    parsedInstallments,
                );

            calculatedPayment =
                calculatePayment(
                    calculatedPrincipal,
                    calculatedRate,
                    calculatedInstallments,
                );
        }

        if (
            mode === "principal"
        ) {
            if (
                parsedPayment <= 0 ||
                parsedRatePercent <
                0 ||
                parsedInstallments <=
                0
            ) {
                setError(
                    "Informe prestação, taxa e parcelas válidas.",
                );

                return;
            }

            calculatedPayment =
                parsedPayment;

            calculatedRate =
                parsedRate;

            calculatedInstallments =
                Math.ceil(
                    parsedInstallments,
                );

            calculatedPrincipal =
                calculatePrincipal(
                    calculatedPayment,
                    calculatedRate,
                    calculatedInstallments,
                );
        }

        if (mode === "rate") {
            if (
                parsedPrincipal <= 0 ||
                parsedPayment <= 0 ||
                parsedInstallments <=
                0
            ) {
                setError(
                    "Informe valor financiado, prestação e parcelas válidos.",
                );

                return;
            }

            const foundRate =
                calculateRate(
                    parsedPrincipal,
                    parsedPayment,
                    Math.ceil(
                        parsedInstallments,
                    ),
                );

            if (
                foundRate === null
            ) {
                setError(
                    "A prestação é insuficiente para quitar o financiamento.",
                );

                return;
            }

            calculatedPrincipal =
                parsedPrincipal;

            calculatedPayment =
                parsedPayment;

            calculatedRate =
                foundRate;

            calculatedInstallments =
                Math.ceil(
                    parsedInstallments,
                );
        }

        if (
            mode ===
            "installments"
        ) {
            if (
                parsedPrincipal <= 0 ||
                parsedPayment <= 0 ||
                parsedRatePercent <
                0
            ) {
                setError(
                    "Informe valor financiado, prestação e taxa válidos.",
                );

                return;
            }

            const foundInstallments =
                calculateInstallments(
                    parsedPrincipal,
                    parsedPayment,
                    parsedRate,
                );

            if (
                foundInstallments ===
                null ||
                !Number.isFinite(
                    foundInstallments,
                ) ||
                foundInstallments <=
                0
            ) {
                setError(
                    "A prestação informada não é suficiente para amortizar a dívida.",
                );

                return;
            }

            calculatedPrincipal =
                parsedPrincipal;

            calculatedRate =
                parsedRate;

            calculatedInstallments =
                Math.ceil(
                    foundInstallments,
                );

            calculatedPayment =
                calculatePayment(
                    calculatedPrincipal,
                    calculatedRate,
                    calculatedInstallments,
                );
        }

        if (
            !Number.isFinite(
                calculatedPrincipal,
            ) ||
            !Number.isFinite(
                calculatedPayment,
            ) ||
            !Number.isFinite(
                calculatedRate,
            ) ||
            !Number.isFinite(
                calculatedInstallments,
            )
        ) {
            setError(
                "Não foi possível realizar o cálculo.",
            );

            return;
        }

        const calculatedSchedule =
            buildAmortizationSchedule(
                calculatedPrincipal,
                calculatedPayment,
                calculatedRate,
                calculatedInstallments,
            );

        const totalPaid =
            calculatedSchedule.reduce(
                (total, row) =>
                    total +
                    row.payment,

                0,
            );

        const totalInterest =
            calculatedSchedule.reduce(
                (total, row) =>
                    total +
                    row.interest,

                0,
            );

        setResult({
            principal:
                calculatedPrincipal,

            payment:
                calculatedPayment,

            rate:
                calculatedRate *
                100,

            installments:
                calculatedInstallments,

            totalPaid,

            totalInterest,
        });

        setSchedule(
            calculatedSchedule,
        );
    }

    function handleClear() {
        setPrincipal("");
        setPayment("");
        setRate("");
        setInstallments("");
        setError("");
        setResult(null);
        setSchedule([]);
        setShowSchedule(false);
    }

    function handlePrint() {
        if (!result || schedule.length === 0) {
            return;
        }

        setError("");

        const details = buildPriceCalculationDetails({ mode, result, rateUnit });
        const printResult = printProfessionalDocument({
            title: "Sistema Price — Memória de Cálculo",
            subtitle: "Sistema Francês de Amortização com prestações periódicas constantes.",
            documentType: modeLabel,
            orientation: "landscape",
            metadata: [
                { label: "Modalidade", value: modeLabel },
                { label: "Sistema", value: "Tabela Price" },
                { label: "Unidade da taxa", value: rateUnit },
                { label: "Quantidade de parcelas", value: String(result.installments) },
            ],
            sections: [
                {
                    title: "Dados utilizados",
                    rows: buildPriceInputRows({ mode, result, rateUnit }),
                    columns: 3,
                },
                {
                    title: "Resultado do cálculo",
                    rows: [
                        { label: "Valor financiado", value: formatCurrency(result.principal) },
                        { label: "Prestação", value: formatCurrency(result.payment) },
                        { label: "Taxa aplicada", value: `${formatNumber(result.rate, 8)}% ${rateUnit}` },
                        { label: "Quantidade de parcelas", value: String(result.installments) },
                        { label: "Total de juros", value: formatCurrency(result.totalInterest) },
                        { label: "Total do financiamento", value: formatCurrency(result.totalPaid) },
                        { label: details.primaryLabel, value: details.primaryValue, highlight: true },
                    ],
                    columns: 3,
                },
                {
                    title: "Memória matemática",
                    formulas: details.formulas,
                    substitutions: details.substitutions,
                    note: "A prestação permanece constante. Os juros de cada período incidem sobre o saldo devedor, enquanto a amortização cresce ao longo do fluxo.",
                },
                {
                    title: "Planilha de amortização",
                    description: "Evolução do saldo devedor, juros, amortização e prestações.",
                    pageBreakBefore: true,
                    table: {
                        compact: true,
                        columns: [
                            { key: "installment", label: "Parcela", align: "center" },
                            { key: "openingBalance", label: "Saldo inicial", align: "right" },
                            { key: "payment", label: "Prestação", align: "right" },
                            { key: "interest", label: "Juros", align: "right" },
                            { key: "amortization", label: "Amortização", align: "right" },
                            { key: "balance", label: "Saldo devedor", align: "right" },
                        ],
                        rows: [
                            {
                                installment: "0",
                                openingBalance: "—",
                                payment: "—",
                                interest: "—",
                                amortization: "—",
                                balance: formatCurrency(result.principal),
                            },
                            ...schedule.map((row) => ({
                                installment: String(row.installment),
                                openingBalance: formatCurrency(row.openingBalance),
                                payment: formatCurrency(row.payment),
                                interest: formatCurrency(row.interest),
                                amortization: formatCurrency(row.amortization),
                                balance: formatCurrency(row.balance),
                            })),
                        ],
                        footer: {
                            installment: "Totais",
                            openingBalance: "—",
                            payment: formatCurrency(result.totalPaid),
                            interest: formatCurrency(result.totalInterest),
                            amortization: formatCurrency(result.principal),
                            balance: formatCurrency(schedule.at(-1)?.balance ?? 0),
                        },
                    },
                },
                {
                    title: "Observações técnicas",
                    note: "Os valores monetários são apresentados com duas casas decimais, mantendo-se maior precisão durante o cálculo interno. A última prestação pode receber ajuste técnico para eliminar eventual saldo residual de arredondamento. A taxa deve corresponder ao mesmo período das parcelas.",
                },
            ],
            footerText: "Memória de cálculo gerada pelo Sistema Price",
        });

        if (!printResult.ok) {
            setError(printResult.error ?? "Não foi possível abrir a impressão.");
        }
    }


    return (
        <section
            className={
                styles.wrapper
            }
        >
            {isLoadingCalculation && (
                <div
                    className={
                        styles.revisionNotice
                    }
                >
                    <div
                        className={
                            styles.revisionNoticeIcon
                        }
                    >
                        <Loader2
                            className={
                                styles.spin
                            }
                            size={21}
                        />
                    </div>

                    <div>
                        <strong>
                            Carregando
                            revisão do
                            histórico
                        </strong>

                        <span>
                            Preparando os
                            dados para
                            recálculo.
                        </span>
                    </div>
                </div>
            )}

            {loadError && (
                <div
                    className={
                        styles.revisionError
                    }
                >
                    <CircleAlert
                        size={20}
                    />

                    <div>
                        <strong>
                            Não foi possível
                            reabrir o cálculo
                        </strong>

                        <span>
                            {loadError}
                        </span>
                    </div>
                </div>
            )}

            {reopenedCalculation &&
                !isLoadingCalculation && (
                    <div
                        className={
                            styles.revisionNotice
                        }
                    >
                        <div
                            className={
                                styles.revisionNoticeIcon
                            }
                        >
                            <History
                                size={21}
                            />
                        </div>

                        <div>
                            <strong>
                                {
                                    reopenedCalculation.title
                                }{" "}
                                — versão{" "}
                                {
                                    reopenedCalculation.sourceVersion
                                }
                            </strong>

                            <span>
                                Os dados foram
                                carregados.
                                Recalcule para
                                salvar a versão{" "}
                                {reopenedCalculation.currentVersion +
                                    1}
                                .
                            </span>
                        </div>
                    </div>
                )}

            <div
                className={
                    styles.container
                }
            >
                <form
                    className={
                        styles.formCard
                    }
                    onSubmit={
                        handleCalculate
                    }
                >
                    <div
                        className={
                            styles.cardTitle
                        }
                    >
                        <div
                            className={
                                styles.icon
                            }
                        >
                            <Calculator
                                size={24}
                            />
                        </div>

                        <div>
                            <h2>
                                Dados do
                                financiamento
                            </h2>

                            <p>
                                {
                                    description
                                }
                            </p>
                        </div>
                    </div>

                    <div
                        className={
                            styles.modeSelector
                        }
                    >
                        <span>
                            O que você deseja
                            calcular?
                        </span>

                        <div
                            className={
                                styles.modeGrid
                            }
                        >
                            {modes.map(
                                (
                                    option,
                                ) => (
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

                    <div
                        className={
                            styles.fields
                        }
                    >
                        {(mode ===
                            "payment" ||
                            mode ===
                            "rate" ||
                            mode ===
                            "installments") && (
                                <label>
                                    Valor financiado

                                    <div
                                        className={
                                            styles.inputGroup
                                        }
                                    >
                                        <span>
                                            R$
                                        </span>

                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={
                                                principal
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setPrincipal(
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
                            "principal" ||
                            mode ===
                            "rate" ||
                            mode ===
                            "installments") && (
                                <label>
                                    Valor da
                                    prestação

                                    <div
                                        className={
                                            styles.inputGroup
                                        }
                                    >
                                        <span>
                                            R$
                                        </span>

                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={
                                                payment
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setPayment(
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
                            "payment" ||
                            mode ===
                            "principal" ||
                            mode ===
                            "installments") && (
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
                                            <span>
                                                %
                                            </span>

                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={
                                                    rate
                                                }
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
                                            <option value="ao mês">
                                                ao mês
                                            </option>

                                            <option value="ao trimestre">
                                                ao trimestre
                                            </option>

                                            <option value="ao semestre">
                                                ao semestre
                                            </option>

                                            <option value="ao ano">
                                                ao ano
                                            </option>
                                        </select>
                                    </div>
                                </label>
                            )}

                        {(mode ===
                            "payment" ||
                            mode ===
                            "principal" ||
                            mode ===
                            "rate") && (
                                <label>
                                    Quantidade de
                                    parcelas

                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={
                                            installments
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setInstallments(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        placeholder="0"
                                    />
                                </label>
                            )}
                    </div>

                    <div
                        className={
                            styles.warning
                        }
                    >
                        A taxa deve
                        corresponder ao
                        mesmo período das
                        parcelas.
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

                    <div
                        className={
                            styles.actions
                        }
                    >
                        <button
                            type="submit"
                            className={
                                styles.calculateButton
                            }
                        >
                            <Calculator
                                size={19}
                            />
                            Calcular
                        </button>

                        <button
                            type="button"
                            className={
                                styles.clearButton
                            }
                            onClick={
                                handleClear
                            }
                        >
                            <RotateCcw
                                size={19}
                            />
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

                    <h2>
                        Resumo do
                        financiamento
                    </h2>

                    {result ? (
                        <>
                            <div
                                className={
                                    styles.resultList
                                }
                            >
                                <div>
                                    <span>
                                        Valor
                                        financiado
                                    </span>

                                    <strong>
                                        {formatCurrency(
                                            result.principal,
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Prestação
                                    </span>

                                    <strong>
                                        {formatCurrency(
                                            result.payment,
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
                                        %{" "}
                                        {
                                            rateUnit
                                        }
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Quantidade de
                                        parcelas
                                    </span>

                                    <strong>
                                        {
                                            result.installments
                                        }
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Total de
                                        juros
                                    </span>

                                    <strong>
                                        {formatCurrency(
                                            result.totalInterest,
                                        )}
                                    </strong>
                                </div>
                            </div>

                            <div
                                className={
                                    styles.total
                                }
                            >
                                <span>
                                    Total do
                                    financiamento
                                </span>

                                <strong>
                                    {formatCurrency(
                                        result.totalPaid,
                                    )}
                                </strong>
                            </div>

                            <div
                                className={
                                    styles.formula
                                }
                            >
                                <span>
                                    Fórmula da
                                    prestação
                                </span>

                                <strong>
                                    PMT = PV × i
                                    ÷ [1 − (1 +
                                    i)⁻ⁿ]
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
                                calculationType="SISTEMA_PRICE"
                                defaultTitle={`Sistema Price — ${modeLabel}`}
                                defaultDescription="Memória de cálculo e planilha de amortização pelo Sistema Price."
                                engineVersion="price-1.0.0"
                                input={{
                                    mode,
                                    principal,
                                    payment,
                                    rate,
                                    installments,
                                    rateUnit,
                                }}
                                result={{
                                    principal:
                                        result.principal,

                                    payment:
                                        result.payment,

                                    rate:
                                        result.rate,

                                    installments:
                                        result.installments,

                                    totalPaid:
                                        result.totalPaid,

                                    totalInterest:
                                        result.totalInterest,
                                }}
                                premises={{
                                    system:
                                        "Sistema Price",

                                    rateUnit,

                                    periodicity:
                                        "A taxa informada corresponde ao mesmo período das parcelas.",

                                    rounding:
                                        "Os valores monetários são apresentados com duas casas decimais, preservando maior precisão durante o cálculo interno.",
                                }}
                                methodology={{
                                    system:
                                        "Sistema Francês de Amortização — Price",

                                    description:
                                        "A prestação permanece constante, os juros são calculados sobre o saldo devedor e a amortização cresce ao longo das parcelas.",

                                    finalInstallmentAdjustment:
                                        "A última parcela é ajustada quando necessário para eliminar eventual saldo residual.",
                                }}
                                formulas={{
                                    payment:
                                        "PMT = PV × i ÷ [1 − (1 + i)⁻ⁿ]",

                                    interest:
                                        "Juros da parcela = Saldo inicial × taxa",

                                    amortization:
                                        "Amortização = Prestação − Juros",

                                    closingBalance:
                                        "Saldo final = Saldo inicial − Amortização",

                                    paymentSubstitution: `PMT = ${result.principal} × ${result.rate / 100} ÷ [1 − (1 + ${result.rate / 100})^-${result.installments}]`,
                                }}
                                summary={{
                                    principal:
                                        result.principal,

                                    payment:
                                        result.payment,

                                    installments:
                                        result.installments,

                                    totalInterest:
                                        result.totalInterest,

                                    totalPaid:
                                        result.totalPaid,

                                    finalBalance:
                                        schedule.at(
                                            -1,
                                        )
                                            ?.balance ??
                                        0,
                                }}
                                warnings={{
                                    rounding:
                                        "Pode existir diferença residual de arredondamento, compensada na última parcela.",

                                    rateCompatibility:
                                        "A taxa deve corresponder ao período de cada parcela.",
                                }}
                                lines={schedule.map(
                                    (
                                        row,
                                    ) => ({
                                        sequence:
                                            row.installment,

                                        label: `Parcela ${row.installment}`,

                                        openingBalance:
                                            row.openingBalance,

                                        interestRate:
                                            result.rate /
                                            100,

                                        interest:
                                            row.interest,

                                        amortization:
                                            row.amortization,

                                        installment:
                                            row.payment,

                                        payment:
                                            row.payment,

                                        closingBalance:
                                            row.balance,

                                        metadata:
                                        {
                                            system:
                                                "PRICE",

                                            installmentNumber:
                                                row.installment,

                                            ratePercent:
                                                result.rate,

                                            rateUnit,
                                        },
                                    }),
                                )}
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
                            Selecione o
                            cálculo, preencha
                            os campos e
                            clique em
                            calcular.
                        </div>
                    )}
                </aside>
            </div>

            {result &&
                schedule.length > 0 && (
                    <section
                        className={
                            styles.scheduleCard
                        }
                    >
                        <button
                            type="button"
                            className={
                                styles.scheduleHeader
                            }
                            onClick={() =>
                                setShowSchedule(
                                    (
                                        current,
                                    ) =>
                                        !current,
                                )
                            }
                        >
                            <div>
                                <span>
                                    Tabela Price
                                </span>

                                <strong>
                                    Planilha de
                                    amortização
                                </strong>
                            </div>

                            {showSchedule ? (
                                <ChevronUp
                                    size={22}
                                />
                            ) : (
                                <ChevronDown
                                    size={22}
                                />
                            )}
                        </button>

                        {showSchedule && (
                            <div
                                className={
                                    styles.tableWrapper
                                }
                            >
                                <table>
                                    <thead>
                                        <tr>
                                            <th>
                                                Parcela
                                            </th>

                                            <th>
                                                Saldo
                                                inicial
                                            </th>

                                            <th>
                                                Prestação
                                            </th>

                                            <th>
                                                Juros
                                            </th>

                                            <th>
                                                Amortização
                                            </th>

                                            <th>
                                                Saldo
                                                devedor
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        <tr
                                            className={
                                                styles.initialRow
                                            }
                                        >
                                            <td>
                                                0
                                            </td>

                                            <td>
                                                —
                                            </td>

                                            <td>
                                                —
                                            </td>

                                            <td>
                                                —
                                            </td>

                                            <td>
                                                —
                                            </td>

                                            <td>
                                                {formatCurrency(
                                                    result.principal,
                                                )}
                                            </td>
                                        </tr>

                                        {schedule.map(
                                            (
                                                row,
                                            ) => (
                                                <tr
                                                    key={
                                                        row.installment
                                                    }
                                                >
                                                    <td>
                                                        {
                                                            row.installment
                                                        }
                                                    </td>

                                                    <td>
                                                        {formatCurrency(
                                                            row.openingBalance,
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatCurrency(
                                                            row.payment,
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatCurrency(
                                                            row.interest,
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatCurrency(
                                                            row.amortization,
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatCurrency(
                                                            row.balance,
                                                        )}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>

                                    <tfoot>
                                        <tr>
                                            <td>
                                                Total
                                            </td>

                                            <td>
                                                —
                                            </td>

                                            <td>
                                                {formatCurrency(
                                                    result.totalPaid,
                                                )}
                                            </td>

                                            <td>
                                                {formatCurrency(
                                                    result.totalInterest,
                                                )}
                                            </td>

                                            <td>
                                                {formatCurrency(
                                                    result.principal,
                                                )}
                                            </td>

                                            <td>
                                                {formatCurrency(
                                                    0,
                                                )}
                                            </td>
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