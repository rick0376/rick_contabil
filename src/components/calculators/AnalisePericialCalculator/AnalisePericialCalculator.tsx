// src/components/calculators/AnalisePericialCalculator/AnalisePericialCalculator.tsx

"use client";

import {
    Calculator,
    CircleAlert,
    CircleDollarSign,
    History,
    Loader2,
    Plus,
    Printer,
    RotateCcw,
    Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import SaveCalculationModal, {
    type CalculationLinePayload,
} from "@/components/calculations/SaveCalculationModal/SaveCalculationModal";
import {
    getStringValue,
    loadCalculationRevision,
    type ReopenedCalculation,
} from "@/lib/calculations/reopen-calculation";
import { printProfessionalDocument } from "@/lib/printing/calculation-print";

import styles from "./styles.module.scss";

type AnalisePericialCalculatorProps = {
    calculationId?: string;
    calculationVersion?: number;
};

type PeriodUnit = "dias" | "meses" | "anos";

type Payment = {
    id: string;
    description: string;
    value: number;
};

type PaymentRecord = Record<string, unknown>;

type CalculationResult = {
    principal: number;

    correctionRate: number;
    monetaryCorrection: number;
    correctedPrincipal: number;

    moraRate: number;
    moraPeriods: number;
    periodUnit: PeriodUnit;
    moraInterest: number;

    fineRate: number;
    fine: number;

    subtotalBeforeFees: number;

    feesRate: number;
    attorneyFees: number;

    costs: number;
    grossTotal: number;

    payments: number;
    netTotal: number;
};

function parseNumber(value: string) {
    const normalized = value
        .trim()
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

    return Number(normalized);
}

function getStoredNumber(value: unknown) {
    if (typeof value === "number") {
        return value;
    }

    if (typeof value === "string") {
        return parseNumber(value);
    }

    return Number.NaN;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
}

function isPeriodUnit(value: string): value is PeriodUnit {
    return ["dias", "meses", "anos"].includes(value);
}

function getLoadedPayments(input: Record<string, unknown>) {
    const storedPayments = input.payments;

    if (!Array.isArray(storedPayments)) {
        return [];
    }

    return storedPayments.flatMap((item, index): Payment[] => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            return [];
        }

        const record = item as PaymentRecord;

        const value = getStoredNumber(record.value);

        if (!Number.isFinite(value) || value <= 0) {
            return [];
        }

        const description =
            typeof record.description === "string" && record.description.trim()
                ? record.description.trim()
                : `Pagamento ${index + 1}`;

        const id =
            typeof record.id === "string" && record.id.trim()
                ? record.id
                : `reopened-payment-${index}`;

        return [
            {
                id,
                description,
                value,
            },
        ];
    });
}

function buildCalculationLines(
    result: CalculationResult,
    payments: Payment[],
): CalculationLinePayload[] {
    const lines: CalculationLinePayload[] = [];

    let sequence = 1;
    let runningBalance = 0;

    lines.push({
        sequence,
        label: "Valor principal",

        openingBalance: runningBalance,

        debit: result.principal,

        closingBalance: result.principal,

        metadata: {
            stage: "PRINCIPAL",
            description: "Reconhecimento do valor principal da apuração.",
        },
    });

    sequence += 1;
    runningBalance = result.principal;

    lines.push({
        sequence,
        label: "Correção monetária",

        openingBalance: runningBalance,

        correctionRate: result.correctionRate / 100,

        monetaryCorrection: result.monetaryCorrection,

        correctedBalance: result.correctedPrincipal,

        closingBalance: result.correctedPrincipal,

        metadata: {
            stage: "MONETARY_CORRECTION",

            correctionRatePercent: result.correctionRate,

            application: "Taxa acumulada aplicada diretamente sobre o principal.",
        },
    });

    sequence += 1;
    runningBalance = result.correctedPrincipal;

    const balanceAfterMora = runningBalance + result.moraInterest;

    lines.push({
        sequence,
        label: "Juros de mora",

        openingBalance: runningBalance,

        interestRate: result.moraRate / 100,

        interest: result.moraInterest,

        dayCount:
            result.periodUnit === "dias" && Number.isInteger(result.moraPeriods)
                ? result.moraPeriods
                : null,

        closingBalance: balanceAfterMora,

        metadata: {
            stage: "MORA_INTEREST",

            ratePercent: result.moraRate,

            periods: result.moraPeriods,

            periodUnit: result.periodUnit,

            regime: "Juros simples",
        },
    });

    sequence += 1;
    runningBalance = balanceAfterMora;

    const balanceAfterFine = runningBalance + result.fine;

    lines.push({
        sequence,
        label: "Multa",

        openingBalance: runningBalance,

        fine: result.fine,

        closingBalance: balanceAfterFine,

        metadata: {
            stage: "FINE",

            fineRatePercent: result.fineRate,

            applicationBase: "Principal corrigido",
        },
    });

    sequence += 1;
    runningBalance = balanceAfterFine;

    const balanceAfterFees = runningBalance + result.attorneyFees;

    lines.push({
        sequence,
        label: "Honorários advocatícios",

        openingBalance: runningBalance,

        fee: result.attorneyFees,

        closingBalance: balanceAfterFees,

        metadata: {
            stage: "ATTORNEY_FEES",

            feesRatePercent: result.feesRate,

            applicationBase:
                "Subtotal formado pelo principal corrigido, juros de mora e multa.",
        },
    });

    sequence += 1;
    runningBalance = balanceAfterFees;

    const balanceAfterCosts = runningBalance + result.costs;

    lines.push({
        sequence,
        label: "Custas e despesas",

        openingBalance: runningBalance,

        debit: result.costs,

        closingBalance: balanceAfterCosts,

        metadata: {
            stage: "COSTS",

            description: "Custas e despesas adicionadas ao total bruto.",
        },
    });

    sequence += 1;
    runningBalance = balanceAfterCosts;

    payments.forEach((payment, index) => {
        const openingBalance = runningBalance;

        const closingBalance = Math.max(0, openingBalance - payment.value);

        const appliedPayment = Math.min(openingBalance, payment.value);

        const excessPayment = Math.max(0, payment.value - openingBalance);

        lines.push({
            sequence: sequence + index,

            label: payment.description,

            openingBalance,

            payment: payment.value,

            credit: payment.value,

            closingBalance,

            metadata: {
                stage: "PAYMENT",

                paymentId: payment.id,

                paymentNumber: index + 1,

                appliedPayment,

                excessPayment,

                description: "Pagamento abatido do saldo da apuração.",
            },
        });

        runningBalance = closingBalance;
    });

    return lines;
}

export default function AnalisePericialCalculator({
    calculationId,
    calculationVersion,
}: AnalisePericialCalculatorProps) {
    const [principal, setPrincipal] = useState("");

    const [correctionRate, setCorrectionRate] = useState("");

    const [moraRate, setMoraRate] = useState("");

    const [moraPeriods, setMoraPeriods] = useState("");

    const [periodUnit, setPeriodUnit] = useState<PeriodUnit>("meses");

    const [fineRate, setFineRate] = useState("");

    const [feesRate, setFeesRate] = useState("");

    const [costs, setCosts] = useState("");

    const [paymentDescription, setPaymentDescription] = useState("");

    const [paymentValue, setPaymentValue] = useState("");

    const [payments, setPayments] = useState<Payment[]>([]);

    const [error, setError] = useState("");

    const [result, setResult] = useState<CalculationResult | null>(null);

    const [reopenedCalculation, setReopenedCalculation] =
        useState<ReopenedCalculation | null>(null);

    const [isLoadingCalculation, setIsLoadingCalculation] = useState(
        Boolean(calculationId),
    );

    const [loadError, setLoadError] = useState("");

    const totalPayments = useMemo(() => {
        return payments.reduce(
            (total, payment) => total + payment.value,

            0,
        );
    }, [payments]);

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

                    expectedType: "ANALISE_PERICIAL",

                    requestedVersion: calculationVersion,
                });

                if (!isActive) {
                    return;
                }

                setPrincipal(getStringValue(loaded.input, "principal"));

                setCorrectionRate(getStringValue(loaded.input, "correctionRate"));

                setMoraRate(getStringValue(loaded.input, "moraRate"));

                setMoraPeriods(getStringValue(loaded.input, "moraPeriods"));

                const loadedPeriodUnit = getStringValue(
                    loaded.input,
                    "periodUnit",
                    "meses",
                );

                setPeriodUnit(
                    isPeriodUnit(loadedPeriodUnit) ? loadedPeriodUnit : "meses",
                );

                setFineRate(getStringValue(loaded.input, "fineRate"));

                setFeesRate(getStringValue(loaded.input, "feesRate"));

                setCosts(getStringValue(loaded.input, "costs"));

                setPaymentDescription("");

                setPaymentValue("");

                setPayments(getLoadedPayments(loaded.input));

                setError("");
                setResult(null);

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

    function handleAddPayment() {
        setError("");

        const parsedValue = parseNumber(paymentValue);

        if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
            setError("Informe um pagamento válido.");

            return;
        }

        setPayments((current) => [
            ...current,

            {
                id: crypto.randomUUID(),

                description:
                    paymentDescription.trim() || `Pagamento ${current.length + 1}`,

                value: parsedValue,
            },
        ]);

        setPaymentDescription("");
        setPaymentValue("");
        setResult(null);
    }

    function handleRemovePayment(id: string) {
        setPayments((current) => current.filter((payment) => payment.id !== id));

        setResult(null);
    }

    function handleCalculate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setResult(null);

        const parsedPrincipal = parseNumber(principal);

        const parsedCorrectionRate = parseNumber(correctionRate || "0");

        const parsedMoraRate = parseNumber(moraRate || "0");

        const parsedMoraPeriods = parseNumber(moraPeriods || "0");

        const parsedFineRate = parseNumber(fineRate || "0");

        const parsedFeesRate = parseNumber(feesRate || "0");

        const parsedCosts = parseNumber(costs || "0");

        const values = [
            parsedPrincipal,
            parsedCorrectionRate,
            parsedMoraRate,
            parsedMoraPeriods,
            parsedFineRate,
            parsedFeesRate,
            parsedCosts,
        ];

        if (
            values.some((item) => !Number.isFinite(item)) ||
            parsedPrincipal <= 0 ||
            parsedCorrectionRate < 0 ||
            parsedMoraRate < 0 ||
            parsedMoraPeriods < 0 ||
            parsedFineRate < 0 ||
            parsedFeesRate < 0 ||
            parsedCosts < 0
        ) {
            setError("Preencha os campos com valores válidos.");

            return;
        }

        const monetaryCorrection = parsedPrincipal * (parsedCorrectionRate / 100);

        const correctedPrincipal = parsedPrincipal + monetaryCorrection;

        const moraInterest =
            correctedPrincipal * (parsedMoraRate / 100) * parsedMoraPeriods;

        const fine = correctedPrincipal * (parsedFineRate / 100);

        const subtotalBeforeFees = correctedPrincipal + moraInterest + fine;

        const attorneyFees = subtotalBeforeFees * (parsedFeesRate / 100);

        const grossTotal = subtotalBeforeFees + attorneyFees + parsedCosts;

        const netTotal = Math.max(0, grossTotal - totalPayments);

        setResult({
            principal: parsedPrincipal,

            correctionRate: parsedCorrectionRate,

            monetaryCorrection,

            correctedPrincipal,

            moraRate: parsedMoraRate,

            moraPeriods: parsedMoraPeriods,

            periodUnit,

            moraInterest,

            fineRate: parsedFineRate,

            fine,

            subtotalBeforeFees,

            feesRate: parsedFeesRate,

            attorneyFees,

            costs: parsedCosts,

            grossTotal,

            payments: totalPayments,

            netTotal,
        });
    }

    function handleClear() {
        setPrincipal("");
        setCorrectionRate("");
        setMoraRate("");
        setMoraPeriods("");
        setPeriodUnit("meses");
        setFineRate("");
        setFeesRate("");
        setCosts("");

        setPaymentDescription("");
        setPaymentValue("");
        setPayments([]);

        setError("");
        setResult(null);
    }

    function handlePrint() {
        if (!result) return;

        setError("");

        const balanceAfterMora = result.correctedPrincipal + result.moraInterest;
        const balanceAfterFine = balanceAfterMora + result.fine;
        const balanceAfterFees = balanceAfterFine + result.attorneyFees;
        const stageRows: Array<Record<string, string>> = [
            {
                stage: "Valor principal",
                addition: formatCurrency(result.principal),
                deduction: "—",
                balance: formatCurrency(result.principal),
            },
            {
                stage: "Correção monetária",
                addition: formatCurrency(result.monetaryCorrection),
                deduction: "—",
                balance: formatCurrency(result.correctedPrincipal),
            },
            {
                stage: "Juros de mora",
                addition: formatCurrency(result.moraInterest),
                deduction: "—",
                balance: formatCurrency(balanceAfterMora),
            },
            {
                stage: "Multa",
                addition: formatCurrency(result.fine),
                deduction: "—",
                balance: formatCurrency(balanceAfterFine),
            },
            {
                stage: "Honorários",
                addition: formatCurrency(result.attorneyFees),
                deduction: "—",
                balance: formatCurrency(balanceAfterFees),
            },
            {
                stage: "Custas e despesas",
                addition: formatCurrency(result.costs),
                deduction: "—",
                balance: formatCurrency(result.grossTotal),
            },
        ];

        let paymentBalance = result.grossTotal;
        payments.forEach((payment) => {
            paymentBalance = Math.max(0, paymentBalance - payment.value);
            stageRows.push({
                stage: payment.description,
                addition: "—",
                deduction: formatCurrency(payment.value),
                balance: formatCurrency(paymentBalance),
            });
        });

        const printResult = printProfessionalDocument({
            title: "Memória de Apuração Pericial Contábil",
            subtitle:
                "Correção monetária, juros de mora, multa, honorários, custas e pagamentos",
            documentType: "Análise pericial",
            orientation: "portrait",
            metadata: [
                { label: "Regime dos juros de mora", value: "Juros simples" },
                { label: "Unidade dos períodos", value: result.periodUnit },
                { label: "Pagamentos registrados", value: String(payments.length) },
                { label: "Moeda", value: "Real brasileiro (BRL)" },
            ],
            sections: [
                {
                    title: "Critérios utilizados",
                    rows: [
                        {
                            label: "Valor principal",
                            value: formatCurrency(result.principal),
                        },
                        {
                            label: "Correção monetária acumulada",
                            value: `${result.correctionRate}%`,
                        },
                        {
                            label: "Juros de mora",
                            value: `${result.moraRate}% por ${result.periodUnit}`,
                        },
                        {
                            label: "Quantidade de períodos",
                            value: `${result.moraPeriods} ${result.periodUnit}`,
                        },
                        { label: "Multa", value: `${result.fineRate}%` },
                        { label: "Honorários", value: `${result.feesRate}%` },
                        { label: "Custas e despesas", value: formatCurrency(result.costs) },
                        {
                            label: "Pagamentos informados",
                            value: formatCurrency(result.payments),
                        },
                    ],
                    columns: 2,
                },
                {
                    title: "Resultado da apuração",
                    rows: [
                        {
                            label: "Correção monetária",
                            value: formatCurrency(result.monetaryCorrection),
                        },
                        {
                            label: "Principal corrigido",
                            value: formatCurrency(result.correctedPrincipal),
                        },
                        {
                            label: "Juros de mora",
                            value: formatCurrency(result.moraInterest),
                        },
                        { label: "Multa", value: formatCurrency(result.fine) },
                        { label: "Honorários", value: formatCurrency(result.attorneyFees) },
                        { label: "Custas e despesas", value: formatCurrency(result.costs) },
                        { label: "Total bruto", value: formatCurrency(result.grossTotal) },
                        {
                            label: "Pagamentos abatidos",
                            value: formatCurrency(result.payments),
                        },
                        {
                            label: "Total líquido atualizado",
                            value: formatCurrency(result.netTotal),
                            highlight: true,
                        },
                    ],
                    columns: 2,
                    status: {
                        title: "Total líquido da apuração",
                        description:
                            "Resultado obtido após a incidência sucessiva dos critérios informados e o abatimento dos pagamentos registrados.",
                        badge: "Resultado apurado",
                        tone: "neutral",
                        rows: [
                            {
                                label: "Total bruto",
                                value: formatCurrency(result.grossTotal),
                            },
                            { label: "Pagamentos", value: formatCurrency(result.payments) },
                            {
                                label: "Total líquido",
                                value: formatCurrency(result.netTotal),
                                highlight: true,
                            },
                        ],
                    },
                },
                {
                    title: "Evolução da apuração por etapas",
                    table: {
                        columns: [
                            { key: "stage", label: "Etapa", align: "left" },
                            { key: "addition", label: "Acréscimo", align: "right" },
                            { key: "deduction", label: "Abatimento", align: "right" },
                            { key: "balance", label: "Saldo após a etapa", align: "right" },
                        ],
                        rows: stageRows,
                        footer: {
                            stage: "Total líquido",
                            addition: "—",
                            deduction: formatCurrency(result.payments),
                            balance: formatCurrency(result.netTotal),
                        },
                        compact: true,
                    },
                },
                {
                    title: "Memória matemática",
                    formulas: [
                        "Correção = Principal × Taxa acumulada de correção",
                        "Principal corrigido = Principal + Correção",
                        "Mora = Principal corrigido × Taxa de mora × Períodos",
                        "Multa = Principal corrigido × Taxa de multa",
                        "Subtotal = Principal corrigido + Mora + Multa",
                        "Honorários = Subtotal × Taxa de honorários",
                        "Total bruto = Subtotal + Honorários + Custas",
                        "Total líquido = Máximo entre zero e Total bruto − Pagamentos",
                    ],
                    substitutions: [
                        `Correção = ${formatCurrency(result.principal)} × ${result.correctionRate / 100}`,
                        `Correção = ${formatCurrency(result.monetaryCorrection)}`,
                        `Mora = ${formatCurrency(result.correctedPrincipal)} × ${result.moraRate / 100} × ${result.moraPeriods}`,
                        `Mora = ${formatCurrency(result.moraInterest)}`,
                        `Honorários = ${formatCurrency(result.subtotalBeforeFees)} × ${result.feesRate / 100}`,
                        `Honorários = ${formatCurrency(result.attorneyFees)}`,
                        `Total líquido = ${formatCurrency(result.grossTotal)} − ${formatCurrency(result.payments)}`,
                        `Total líquido = ${formatCurrency(result.netTotal)}`,
                    ],
                },
                {
                    title: "Observações técnicas",
                    note: "Os critérios de incidência devem ser compatíveis com o contrato, a sentença, a decisão judicial ou a metodologia pericial aplicável. O módulo recebe uma taxa acumulada de correção monetária, não consulta séries históricas automaticamente e não considera datas individuais dos pagamentos. Este documento constitui memória de cálculo e não substitui laudo pericial ou conclusão jurídica.",
                },
            ],
            footerText:
                "Memória de apuração pericial contábil gerada automaticamente",
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

                        <span>Preparando os critérios e pagamentos para recálculo.</span>
                    </div>
                </div>
            )}

            {loadError && (
                <div className={styles.revisionError}>
                    <CircleAlert size={20} />

                    <div>
                        <strong>Não foi possível reabrir a apuração</strong>

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
                            Os critérios e pagamentos foram carregados. Recalcule para salvar
                            a versão {reopenedCalculation.currentVersion + 1}.
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
                            <h2>Dados da apuração</h2>

                            <p>Informe os valores e os critérios determinados.</p>
                        </div>
                    </div>

                    <div className={styles.fields}>
                        <label>
                            Valor principal
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

                        <div className={styles.twoColumns}>
                            <label>
                                Correção monetária acumulada
                                <div className={styles.inputGroup}>
                                    <span>%</span>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={correctionRate}
                                        onChange={(event) => setCorrectionRate(event.target.value)}
                                        placeholder="0,00"
                                    />
                                </div>
                            </label>

                            <label>
                                Multa
                                <div className={styles.inputGroup}>
                                    <span>%</span>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={fineRate}
                                        onChange={(event) => setFineRate(event.target.value)}
                                        placeholder="0,00"
                                    />
                                </div>
                            </label>
                        </div>

                        <div className={styles.twoColumns}>
                            <label>
                                Juros de mora
                                <div className={styles.inputGroup}>
                                    <span>%</span>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={moraRate}
                                        onChange={(event) => setMoraRate(event.target.value)}
                                        placeholder="0,00"
                                    />
                                </div>
                            </label>

                            <label>
                                Quantidade de períodos
                                <div className={styles.combinedField}>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={moraPeriods}
                                        onChange={(event) => setMoraPeriods(event.target.value)}
                                        placeholder="0"
                                    />

                                    <select
                                        value={periodUnit}
                                        onChange={(event) => {
                                            const value = event.target.value;

                                            if (isPeriodUnit(value)) {
                                                setPeriodUnit(value);
                                            }
                                        }}
                                    >
                                        <option value="dias">dias</option>

                                        <option value="meses">meses</option>

                                        <option value="anos">anos</option>
                                    </select>
                                </div>
                            </label>
                        </div>

                        <div className={styles.twoColumns}>
                            <label>
                                Honorários
                                <div className={styles.inputGroup}>
                                    <span>%</span>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={feesRate}
                                        onChange={(event) => setFeesRate(event.target.value)}
                                        placeholder="0,00"
                                    />
                                </div>
                            </label>

                            <label>
                                Custas e despesas
                                <div className={styles.inputGroup}>
                                    <span>R$</span>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={costs}
                                        onChange={(event) => setCosts(event.target.value)}
                                        placeholder="0,00"
                                    />
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className={styles.paymentSection}>
                        <div className={styles.sectionTitle}>
                            <div>
                                <span>Abatimentos</span>

                                <h3>Pagamentos realizados</h3>
                            </div>

                            <strong>{formatCurrency(totalPayments)}</strong>
                        </div>

                        <div className={styles.paymentFields}>
                            <input
                                type="text"
                                value={paymentDescription}
                                onChange={(event) => setPaymentDescription(event.target.value)}
                                placeholder="Descrição do pagamento"
                            />

                            <div className={styles.inputGroup}>
                                <span>R$</span>

                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={paymentValue}
                                    onChange={(event) => setPaymentValue(event.target.value)}
                                    placeholder="0,00"
                                />
                            </div>

                            <button
                                type="button"
                                className={styles.addPaymentButton}
                                onClick={handleAddPayment}
                            >
                                <Plus size={18} />
                                Adicionar
                            </button>
                        </div>

                        {payments.length > 0 && (
                            <div className={styles.paymentList}>
                                {payments.map((payment) => (
                                    <div key={payment.id}>
                                        <span>{payment.description}</span>

                                        <strong>{formatCurrency(payment.value)}</strong>

                                        <button
                                            type="button"
                                            onClick={() => handleRemovePayment(payment.id)}
                                            aria-label="Excluir pagamento"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.warning}>
                        Os critérios de incidência devem seguir o contrato, a sentença ou a
                        determinação judicial aplicável ao processo.
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.actions}>
                        <button type="submit" className={styles.calculateButton}>
                            <CircleDollarSign size={19} />
                            Calcular apuração
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

                    <h2>Resumo da apuração</h2>

                    {result ? (
                        <>
                            <div className={styles.resultList}>
                                <div>
                                    <span>Valor principal</span>

                                    <strong>{formatCurrency(result.principal)}</strong>
                                </div>

                                <div>
                                    <span>Correção monetária</span>

                                    <strong>{formatCurrency(result.monetaryCorrection)}</strong>
                                </div>

                                <div>
                                    <span>Principal corrigido</span>

                                    <strong>{formatCurrency(result.correctedPrincipal)}</strong>
                                </div>

                                <div>
                                    <span>Juros de mora</span>

                                    <strong>{formatCurrency(result.moraInterest)}</strong>
                                </div>

                                <div>
                                    <span>Multa</span>

                                    <strong>{formatCurrency(result.fine)}</strong>
                                </div>

                                <div>
                                    <span>Honorários</span>

                                    <strong>{formatCurrency(result.attorneyFees)}</strong>
                                </div>

                                <div>
                                    <span>Custas e despesas</span>

                                    <strong>{formatCurrency(result.costs)}</strong>
                                </div>

                                <div>
                                    <span>Total bruto</span>

                                    <strong>{formatCurrency(result.grossTotal)}</strong>
                                </div>

                                <div>
                                    <span>Pagamentos abatidos</span>

                                    <strong className={styles.paymentValue}>
                                        − {formatCurrency(result.payments)}
                                    </strong>
                                </div>
                            </div>

                            <div className={styles.total}>
                                <span>Total líquido atualizado</span>

                                <strong>{formatCurrency(result.netTotal)}</strong>
                            </div>

                            <div className={styles.formula}>
                                <span>Memória resumida</span>

                                <strong>Principal corrigido = Principal + Correção</strong>

                                <strong>Mora = Principal corrigido × Taxa × Períodos</strong>

                                <strong>Total líquido = Total bruto − Pagamentos</strong>
                            </div>

                            <button
                                type="button"
                                className={styles.printButton}
                                onClick={handlePrint}
                            >
                                <Printer size={18} />
                                Imprimir / Salvar PDF
                            </button>

                            <div className={styles.saveArea}>
                                <SaveCalculationModal
                                    calculationType="ANALISE_PERICIAL"
                                    defaultTitle="Análise Pericial Contábil"
                                    defaultDescription="Memória de apuração com correção monetária, juros de mora, multa, honorários, custas e pagamentos."
                                    engineVersion="forensic-analysis-1.0.0"
                                    input={{
                                        principal: result.principal,

                                        correctionRate: result.correctionRate,

                                        moraRate: result.moraRate,

                                        moraPeriods: result.moraPeriods,

                                        periodUnit: result.periodUnit,

                                        fineRate: result.fineRate,

                                        feesRate: result.feesRate,

                                        costs: result.costs,

                                        payments: payments.map((payment) => ({
                                            id: payment.id,

                                            description: payment.description,

                                            value: payment.value,
                                        })),
                                    }}
                                    result={{
                                        principal: result.principal,

                                        monetaryCorrection: result.monetaryCorrection,

                                        correctedPrincipal: result.correctedPrincipal,

                                        moraInterest: result.moraInterest,

                                        fine: result.fine,

                                        subtotalBeforeFees: result.subtotalBeforeFees,

                                        attorneyFees: result.attorneyFees,

                                        costs: result.costs,

                                        grossTotal: result.grossTotal,

                                        payments: result.payments,

                                        netTotal: result.netTotal,
                                    }}
                                    premises={{
                                        currency: "BRL",

                                        correctionCriterion:
                                            "A correção monetária é informada como taxa acumulada e aplicada diretamente sobre o principal.",

                                        moraRegime:
                                            "Os juros de mora são calculados pelo regime simples sobre o principal corrigido.",

                                        fineBase:
                                            "A multa é calculada sobre o principal corrigido.",

                                        feesBase:
                                            "Os honorários são calculados sobre o subtotal composto pelo principal corrigido, juros de mora e multa.",

                                        costsCriterion:
                                            "Custas e despesas são adicionadas pelo valor nominal informado.",

                                        paymentCriterion:
                                            "Os pagamentos são abatidos após a formação do total bruto.",
                                    }}
                                    methodology={{
                                        description:
                                            "A apuração é formada em etapas sucessivas, registrando o saldo após cada incidência e após cada pagamento.",

                                        stages:
                                            "Principal, correção monetária, juros de mora, multa, honorários, custas e pagamentos.",

                                        paymentTreatment:
                                            "Os pagamentos reduzem o saldo em ordem de inclusão.",

                                        minimumBalance:
                                            "O total líquido é limitado a zero quando os pagamentos superam o total bruto.",
                                    }}
                                    formulas={{
                                        monetaryCorrection:
                                            "Correção = Principal × Taxa de correção",

                                        correctedPrincipal:
                                            "Principal corrigido = Principal + Correção",

                                        moraInterest:
                                            "Mora = Principal corrigido × Taxa de mora × Períodos",

                                        fine: "Multa = Principal corrigido × Taxa de multa",

                                        subtotalBeforeFees:
                                            "Subtotal = Principal corrigido + Mora + Multa",

                                        attorneyFees: "Honorários = Subtotal × Taxa de honorários",

                                        grossTotal: "Total bruto = Subtotal + Honorários + Custas",

                                        netTotal:
                                            "Total líquido = Máximo entre zero e Total bruto − Pagamentos",

                                        correctionSubstitution: `Correção = ${result.principal} × ${result.correctionRate / 100
                                            }`,

                                        moraSubstitution: `Mora = ${result.correctedPrincipal} × ${result.moraRate / 100
                                            } × ${result.moraPeriods}`,
                                    }}
                                    summary={{
                                        principal: result.principal,

                                        correctionRate: result.correctionRate,

                                        monetaryCorrection: result.monetaryCorrection,

                                        correctedPrincipal: result.correctedPrincipal,

                                        moraRate: result.moraRate,

                                        moraPeriods: result.moraPeriods,

                                        periodUnit: result.periodUnit,

                                        moraInterest: result.moraInterest,

                                        fineRate: result.fineRate,

                                        fine: result.fine,

                                        feesRate: result.feesRate,

                                        attorneyFees: result.attorneyFees,

                                        costs: result.costs,

                                        grossTotal: result.grossTotal,

                                        totalPayments: result.payments,

                                        netTotal: result.netTotal,

                                        paymentCount: payments.length,
                                    }}
                                    warnings={{
                                        legalCriterion:
                                            "Os critérios devem ser compatíveis com o contrato, a sentença, a decisão judicial ou a metodologia pericial aplicável.",

                                        accumulatedCorrection:
                                            "O módulo recebe uma taxa acumulada de correção e não consulta automaticamente séries históricas de índices.",

                                        periodCompatibility:
                                            "A taxa de mora deve corresponder à unidade e à quantidade de períodos informadas.",

                                        paymentDates:
                                            "O módulo atual não considera datas individuais dos pagamentos.",

                                        excessPayments:
                                            "Pagamentos superiores ao total bruto resultam em saldo líquido igual a zero; eventual crédito excedente deve ser analisado separadamente.",
                                    }}
                                    lines={buildCalculationLines(result, payments)}
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
                        </>
                    ) : (
                        <div className={styles.empty}>
                            Preencha os critérios da apuração e clique em calcular.
                        </div>
                    )}
                </aside>
            </div>
        </section>
    );
}