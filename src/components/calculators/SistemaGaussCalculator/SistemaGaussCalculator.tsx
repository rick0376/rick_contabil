// src/components/calculators/SistemaGaussCalculator/SistemaGaussCalculator.tsx

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

type SistemaGaussCalculatorProps = {
    calculationId?: string;
    calculationVersion?: number;
};

type GaussRow = {
    installment: number;
    openingBalance: number;
    payment: number;
    interest: number;
    amortization: number;
    balance: number;
};

type GaussResult = {
    principal: number;
    rate: number;
    installments: number;
    payment: number;
    totalInterest: number;
    totalPaid: number;
};

function parseNumber(value: string) {
    return Number(
        value
            .trim()
            .replace(/\s/g, "")
            .replace(/\./g, "")
            .replace(",", "."),
    );
}

function formatCurrency(value: number) {
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

function calculateGaussPayment(
    principal: number,
    rate: number,
    installments: number,
) {
    const numerator =
        principal *
        (1 + rate * installments);

    const denominator =
        installments +
        rate *
        ((installments *
            (installments - 1)) /
            2);

    return numerator / denominator;
}

function buildGaussSchedule(
    principal: number,
    rate: number,
    installments: number,
    payment: number,
) {
    const rows: GaussRow[] = [];

    const finalEquivalent =
        principal *
        (1 + rate * installments);

    let accumulatedPaymentsAtFinalDate =
        0;

    let previousBalance = principal;

    for (
        let installment = 1;
        installment <= installments;
        installment += 1
    ) {
        const openingBalance =
            previousBalance;

        const remainingPeriods =
            installments - installment;

        accumulatedPaymentsAtFinalDate +=
            payment *
            (1 +
                rate *
                remainingPeriods);

        const remainingEquivalent =
            finalEquivalent -
            accumulatedPaymentsAtFinalDate;

        let currentBalance =
            installment === installments
                ? 0
                : remainingEquivalent /
                (1 +
                    rate *
                    remainingPeriods);

        if (
            Math.abs(currentBalance) <
            0.00000001
        ) {
            currentBalance = 0;
        }

        const amortization =
            openingBalance -
            currentBalance;

        const calculatedInterest =
            payment - amortization;

        const interest =
            calculatedInterest < 0 &&
                Math.abs(
                    calculatedInterest,
                ) < 0.00000001
                ? 0
                : Math.max(
                    0,
                    calculatedInterest,
                );

        rows.push({
            installment,
            openingBalance,
            payment,
            interest,
            amortization,
            balance: Math.max(
                0,
                currentBalance,
            ),
        });

        previousBalance =
            currentBalance;
    }

    return rows;
}


function buildGaussPrintDetails(result: GaussResult, rateUnit: string) {
    const decimalRate = result.rate / 100;

    return {
        formulas: [
            "VF = PV × (1 + i × n)",
            "PMT = PV × (1 + i × n) ÷ [n + i × n × (n − 1) ÷ 2]",
            "Saldo = Equivalente remanescente ÷ [1 + i × períodos restantes]",
            "Amortização = Saldo inicial − Saldo final",
            "Juros = Prestação − Amortização",
        ],
        substitutions: [
            `VF = ${formatCurrency(result.principal)} × (1 + ${formatNumber(decimalRate, 10)} × ${result.installments})`,
            `PMT = ${formatCurrency(result.principal)} × (1 + ${formatNumber(decimalRate, 10)} × ${result.installments}) ÷ [${result.installments} + ${formatNumber(decimalRate, 10)} × ${result.installments} × (${result.installments} − 1) ÷ 2]`,
            `PMT = ${formatCurrency(result.payment)}`,
            `Taxa utilizada = ${formatNumber(result.rate, 8)}% ${rateUnit}`,
        ],
    };
}

export default function SistemaGaussCalculator({
    calculationId,
    calculationVersion,
}: SistemaGaussCalculatorProps) {
    const [
        principal,
        setPrincipal,
    ] = useState("");

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
        useState<GaussResult | null>(
            null,
        );

    const [
        schedule,
        setSchedule,
    ] = useState<GaussRow[]>([]);

    const [
        showSchedule,
        setShowSchedule,
    ] = useState(false);

    const [
        reopenedCalculation,
        setReopenedCalculation,
    ] =
        useState<ReopenedCalculation | null>(
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

                            expectedType: [
                                "SISTEMA_GAUSS",
                                "METODO_DE_GAUSS",
                                "GAUSS",
                            ],

                            requestedVersion:
                                calculationVersion,
                        },
                    );

                if (!isActive) {
                    return;
                }

                setPrincipal(
                    getStringValue(
                        loaded.input,
                        "principal",
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

        const parsedRatePercent =
            parseNumber(rate);

        const parsedRate =
            parsedRatePercent / 100;

        const parsedInstallments =
            Math.floor(
                parseNumber(
                    installments,
                ),
            );

        if (
            !Number.isFinite(
                parsedPrincipal,
            ) ||
            !Number.isFinite(
                parsedRatePercent,
            ) ||
            !Number.isFinite(
                parsedInstallments,
            ) ||
            parsedPrincipal <= 0 ||
            parsedRatePercent < 0 ||
            parsedInstallments <= 0
        ) {
            setError(
                "Informe valor financiado, taxa e parcelas válidos.",
            );

            return;
        }

        const payment =
            calculateGaussPayment(
                parsedPrincipal,
                parsedRate,
                parsedInstallments,
            );

        if (
            !Number.isFinite(payment) ||
            payment <= 0
        ) {
            setError(
                "Não foi possível calcular a prestação com os dados informados.",
            );

            return;
        }

        const calculatedSchedule =
            buildGaussSchedule(
                parsedPrincipal,
                parsedRate,
                parsedInstallments,
                payment,
            );

        const totalPaid =
            calculatedSchedule.reduce(
                (total, row) =>
                    total +
                    row.payment,

                0,
            );

        const totalInterest =
            totalPaid -
            parsedPrincipal;

        setResult({
            principal:
                parsedPrincipal,

            rate:
                parsedRatePercent,

            installments:
                parsedInstallments,

            payment,

            totalInterest,

            totalPaid,
        });

        setSchedule(
            calculatedSchedule,
        );
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
        if (!result || schedule.length === 0) {
            return;
        }

        setError("");

        const details = buildGaussPrintDetails(result, rateUnit);
        const printResult = printProfessionalDocument({
            title: "Método de Gauss — Memória de Cálculo",
            subtitle: "Cálculo de prestações fixas por juros simples e equivalência financeira em data focal.",
            documentType: "Método de Gauss",
            orientation: "landscape",
            metadata: [
                { label: "Sistema", value: "Método de Gauss" },
                { label: "Regime", value: "Juros simples" },
                { label: "Unidade da taxa", value: rateUnit },
                { label: "Quantidade de parcelas", value: String(result.installments) },
            ],
            sections: [
                {
                    title: "Dados utilizados",
                    rows: [
                        { label: "Valor financiado", value: formatCurrency(result.principal) },
                        { label: "Taxa de juros simples", value: `${formatNumber(result.rate, 8)}% ${rateUnit}` },
                        { label: "Quantidade de parcelas", value: String(result.installments) },
                        { label: "Data focal", value: "Data final do fluxo" },
                    ],
                    columns: 2,
                },
                {
                    title: "Resultado do cálculo",
                    rows: [
                        { label: "Valor financiado", value: formatCurrency(result.principal) },
                        { label: "Prestação fixa", value: formatCurrency(result.payment), highlight: true },
                        { label: "Taxa simples", value: `${formatNumber(result.rate, 8)}% ${rateUnit}` },
                        { label: "Quantidade de parcelas", value: String(result.installments) },
                        { label: "Total de juros", value: formatCurrency(result.totalInterest) },
                        { label: "Total do financiamento", value: formatCurrency(result.totalPaid) },
                    ],
                    columns: 3,
                },
                {
                    title: "Memória matemática",
                    formulas: details.formulas,
                    substitutions: details.substitutions,
                    note: "O capital e cada prestação são equivalidos financeiramente na data focal final sob o regime de juros simples.",
                },
                {
                    title: "Planilha de amortização",
                    description: "Composição das prestações fixas entre juros, amortização e saldo devedor.",
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
                    note: "A taxa deve corresponder à periodicidade de cada parcela. A aplicação do Método de Gauss deve ser compatível com o contrato, a decisão judicial ou a metodologia pericial adotada. Este cálculo utiliza juros simples e não deve ser confundido com sistemas de capitalização composta.",
                },
            ],
            footerText: "Memória de cálculo gerada pelo Método de Gauss",
        });

        if (!printResult.ok) {
            setError(printResult.error ?? "Não foi possível abrir a impressão.");
        }
    }


    return (
        <section className={styles.wrapper}>
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
                            Carregando revisão do
                            histórico
                        </strong>

                        <span>
                            Preparando os dados para
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
                    <CircleAlert size={20} />

                    <div>
                        <strong>
                            Não foi possível reabrir o
                            cálculo
                        </strong>

                        <span>{loadError}</span>
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
                            <History size={21} />
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
                                Os dados foram carregados.
                                Recalcule para salvar a
                                versão{" "}
                                {reopenedCalculation.currentVersion +
                                    1}
                                .
                            </span>
                        </div>
                    </div>
                )}

            <div className={styles.container}>
                <form
                    className={styles.formCard}
                    onSubmit={handleCalculate}
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
                                Dados do financiamento
                            </h2>

                            <p>
                                Informe o capital, a
                                taxa simples e as
                                parcelas.
                            </p>
                        </div>
                    </div>

                    <div
                        className={
                            styles.fields
                        }
                    >
                        <label>
                            Valor financiado

                            <div
                                className={
                                    styles.inputGroup
                                }
                            >
                                <span>R$</span>

                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={principal}
                                    onChange={(event) =>
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

                        <label>
                            Taxa de juros simples

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
                                        onChange={(event) =>
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
                                    onChange={(event) =>
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

                        <label>
                            Quantidade de parcelas

                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={
                                    installments
                                }
                                onChange={(event) =>
                                    setInstallments(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="0"
                            />
                        </label>
                    </div>

                    <div
                        className={
                            styles.warning
                        }
                    >
                        A taxa deve estar na mesma
                        periodicidade das parcelas. O
                        Método de Gauss utiliza juros
                        simples e equivalência
                        financeira em data focal.
                    </div>

                    <div
                        className={
                            styles.technicalNote
                        }
                    >
                        Em trabalhos periciais,
                        confirme se a sentença, o
                        contrato ou a metodologia
                        adotada determinam
                        expressamente este critério.
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
                        Resumo pelo Método de Gauss
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
                                        Valor financiado
                                    </span>

                                    <strong>
                                        {formatCurrency(
                                            result.principal,
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Prestação fixa
                                    </span>

                                    <strong>
                                        {formatCurrency(
                                            result.payment,
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Taxa simples
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
                                        Total de juros
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
                                    Total do financiamento
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
                                    Fórmula utilizada
                                </span>

                                <strong>
                                    PMT = PV × (1 + i × n)
                                    ÷ [n + i × n × (n − 1)
                                    ÷ 2]
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
                                calculationType="SISTEMA_GAUSS"
                                defaultTitle="Método de Gauss — prestações fixas"
                                defaultDescription="Memória de cálculo e planilha de amortização pelo Método de Gauss."
                                engineVersion="gauss-1.0.0"
                                input={{
                                    principal,
                                    rate,
                                    installments,
                                    rateUnit,
                                }}
                                result={{
                                    principal:
                                        result.principal,

                                    rate:
                                        result.rate,

                                    installments:
                                        result.installments,

                                    payment:
                                        result.payment,

                                    totalInterest:
                                        result.totalInterest,

                                    totalPaid:
                                        result.totalPaid,
                                }}
                                premises={{
                                    system:
                                        "Método de Gauss",

                                    regime:
                                        "Juros simples",

                                    rateUnit,

                                    periodicity:
                                        "A taxa informada corresponde ao mesmo período das parcelas.",

                                    focalDate:
                                        "As prestações são equivalidas financeiramente na data focal final.",

                                    rounding:
                                        "Os valores monetários são exibidos com duas casas decimais, preservando maior precisão no cálculo interno.",
                                }}
                                methodology={{
                                    system:
                                        "Método de Gauss",

                                    description:
                                        "O valor financiado é transportado até a data focal final por juros simples, assim como cada prestação, permitindo determinar uma prestação periódica fixa.",

                                    paymentStructure:
                                        "As prestações permanecem fixas, enquanto a composição entre juros e amortização varia ao longo do financiamento.",

                                    finalInstallmentAdjustment:
                                        "O saldo da última parcela é encerrado em zero para eliminar resíduos numéricos.",
                                }}
                                formulas={{
                                    finalEquivalent:
                                        "VF = PV × (1 + i × n)",

                                    payment:
                                        "PMT = PV × (1 + i × n) ÷ [n + i × n × (n − 1) ÷ 2]",

                                    remainingBalance:
                                        "Saldo = Equivalente remanescente ÷ [1 + i × períodos restantes]",

                                    amortization:
                                        "Amortização = Saldo inicial − Saldo final",

                                    interest:
                                        "Juros = Prestação − Amortização",

                                    paymentSubstitution: `PMT = ${result.principal} × (1 + ${result.rate / 100
                                        } × ${result.installments
                                        }) ÷ [${result.installments
                                        } + ${result.rate / 100
                                        } × ${result.installments
                                        } × (${result.installments
                                        } − 1) ÷ 2]`,
                                }}
                                summary={{
                                    principal:
                                        result.principal,

                                    payment:
                                        result.payment,

                                    installments:
                                        result.installments,

                                    rate:
                                        result.rate,

                                    rateUnit,

                                    totalInterest:
                                        result.totalInterest,

                                    totalPaid:
                                        result.totalPaid,

                                    finalBalance:
                                        schedule[
                                            schedule.length -
                                            1
                                        ]?.balance ?? 0,
                                }}
                                warnings={{
                                    rateCompatibility:
                                        "A taxa deve corresponder à periodicidade de cada parcela.",

                                    legalCriterion:
                                        "A adoção do Método de Gauss deve ser compatível com o contrato, a decisão judicial ou a metodologia pericial aplicável.",

                                    simpleInterest:
                                        "Este cálculo utiliza juros simples e não deve ser confundido com sistemas de capitalização composta.",

                                    rounding:
                                        "Pequenas diferenças de arredondamento podem ocorrer na exibição, sem alterar a precisão interna do cálculo.",
                                }}
                                lines={schedule.map(
                                    (row) => ({
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

                                        metadata: {
                                            system:
                                                "GAUSS",

                                            regime:
                                                "Juros simples",

                                            installmentNumber:
                                                row.installment,

                                            ratePercent:
                                                result.rate,

                                            rateUnit,

                                            focalDate:
                                                "Data final do fluxo",
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
                            Preencha os campos e clique
                            em calcular.
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
                                    (current) =>
                                        !current,
                                )
                            }
                        >
                            <div>
                                <span>
                                    Método de Gauss
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
                                            <td>0</td>
                                            <td>—</td>
                                            <td>—</td>
                                            <td>—</td>

                                            <td>
                                                {formatCurrency(
                                                    result.principal,
                                                )}
                                            </td>
                                        </tr>

                                        {schedule.map(
                                            (row) => (
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