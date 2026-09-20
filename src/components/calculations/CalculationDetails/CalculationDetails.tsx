// src/components/calculations/CalculationDetails/CalculationDetails.tsx

"use client";

import {
    ArrowLeft,
    Building2,
    Calculator,
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    FileInput,
    FileText,
    FilePlus2,
    FlaskConical,
    FunctionSquare,
    History,
    Landmark,
    ListChecks,
    Loader2,
    RefreshCw,
    Scale,
    Sigma,
    UserRound,
} from "lucide-react";
import Link from "next/link";
import {
    type CSSProperties,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import EditCalculationModal from "@/components/calculations/EditCalculationModal/EditCalculationModal";
import DeleteEntityButton from "@/components/ui/DeleteEntityButton/DeleteEntityButton";

import styles from "./styles.module.scss";

type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | {
        [key: string]: JsonValue;
    };

type CalculationStatus =
    | "DRAFT"
    | "CALCULATED"
    | "FINALIZED"
    | "ARCHIVED";

type RevisionStatus =
    | "DRAFT"
    | "CALCULATED"
    | "FINALIZED";

type CalculationLine = {
    id: string;
    sequence: number;
    label: string | null;
    competence: string | null;
    dueDate: string | null;
    paymentDate: string | null;
    openingBalance: string | null;
    correctionRate: string | null;
    monetaryCorrection: string | null;
    correctedBalance: string | null;
    interestRate: string | null;
    interest: string | null;
    amortization: string | null;
    installment: string | null;
    insurance: string | null;
    fee: string | null;
    fine: string | null;
    payment: string | null;
    closingBalance: string | null;
    debit: string | null;
    credit: string | null;
    dayCount: number | null;
    weightedBalance: string | null;
    metadata: JsonValue | null;
};

type CalculationRevision = {
    id: string;
    version: number;
    status: RevisionStatus;
    engineVersion: string;
    referenceDate: string | null;
    input: JsonValue;
    premises: JsonValue | null;
    methodology: JsonValue | null;
    formulas: JsonValue | null;
    result: JsonValue;
    summary: JsonValue | null;
    warnings: JsonValue | null;
    notes: string | null;
    integrityHash: string | null;
    finalizedAt: string | null;
    createdAt: string;
    lines: CalculationLine[];
};

type CalculationRecord = {
    id: string;
    type: string;
    title: string | null;
    description: string | null;
    status: CalculationStatus;
    referenceDate: string | null;
    currency: string;
    currentVersion: number;
    input: JsonValue | null;
    result: JsonValue | null;
    createdAt: string;
    updatedAt: string;
    notes: string | null;

    client: {
        id: string;
        type:
        | "INDIVIDUAL"
        | "COMPANY";
        name: string;
        tradeName: string | null;
        documentNumber: string | null;
        email: string | null;
        phone: string | null;
        mobile: string | null;
    } | null;

    legalProcess: {
        id: string;
        caseNumber: string | null;
        title: string | null;
        court: string | null;
        courtDivision: string | null;
        status: string;
    } | null;

    revisions: CalculationRevision[];
};

type CalculationResponse = {
    calculation?: CalculationRecord;
    message?: string;
};

type CalculationDetailsProps = {
    calculationId: string;
};

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

function formatDateTime(
    value: string | null,
) {
    if (!value) {
        return "Não informado";
    }

    const date = new Date(value);

    if (
        Number.isNaN(date.getTime())
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

function formatMoney(
    value:
        | string
        | number
        | null,
) {
    if (
        value === null ||
        value === ""
    ) {
        return "—";
    }

    const numericValue =
        Number(value);

    if (
        !Number.isFinite(
            numericValue,
        )
    ) {
        return String(value);
    }

    return new Intl.NumberFormat(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL",
        },
    ).format(numericValue);
}

function formatKey(value: string) {
    const labels: Record<
        string,
        string
    > = {
        capital: "Capital",
        interest: "Juros",
        amount: "Montante",

        principal:
            "Valor principal",

        payment: "Pagamento",

        installment:
            "Prestação",

        installments:
            "Quantidade de parcelas",

        openingBalance:
            "Saldo inicial",

        closingBalance:
            "Saldo final",

        amortization:
            "Amortização",

        firstPayment:
            "Primeira parcela",

        lastPayment:
            "Última parcela",

        presentValue:
            "Valor presente",

        futureValue:
            "Valor futuro",

        discount: "Desconto",

        financialDiscount:
            "Desconto financeiro",

        rate: "Taxa",
        period: "Período",

        rateUnit:
            "Unidade da taxa",

        periodUnit:
            "Unidade dos períodos",

        totalInterest:
            "Total de juros",

        totalPaid:
            "Total pago",

        totalEntries:
            "Total de entradas",

        totalExits:
            "Total de saídas",

        balance: "Saldo",

        transactionCount:
            "Quantidade de lançamentos",

        firstPeriod:
            "Primeiro período",

        lastPeriod:
            "Último período",

        finalBalance:
            "Saldo final",

        finalAmount:
            "Montante final",

        correctionRate:
            "Taxa de correção",

        monetaryCorrection:
            "Correção monetária",

        correctedPrincipal:
            "Principal corrigido",

        moraRate:
            "Taxa de mora",

        moraPeriods:
            "Períodos de mora",

        moraInterest:
            "Juros de mora",

        fineRate:
            "Taxa de multa",

        fine: "Multa",

        subtotalBeforeFees:
            "Subtotal antes dos honorários",

        feesRate:
            "Taxa de honorários",

        attorneyFees:
            "Honorários advocatícios",

        costs:
            "Custas e despesas",

        grossTotal:
            "Total bruto",

        totalPayments:
            "Total de pagamentos",

        netTotal:
            "Total líquido",

        paymentCount:
            "Quantidade de pagamentos",

        compatibility:
            "Compatibilidade",

        periodicity:
            "Periodicidade",

        system: "Sistema",
        regime: "Regime",

        description:
            "Descrição",

        mode: "Modalidade",

        rounding:
            "Arredondamento",

        currency: "Moeda",

        periodType:
            "Tipo de período",

        initialBalance:
            "Saldo inicial",

        ordering:
            "Ordenação",

        timeValueOfMoney:
            "Valor do dinheiro no tempo",

        accumulatedBalance:
            "Saldo acumulado",

        debitCreditMapping:
            "Classificação entre débito e crédito",

        entryMovement:
            "Movimento de entrada",

        exitMovement:
            "Movimento de saída",

        ordinalPeriods:
            "Períodos ordinais",

        noFinancialAdjustment:
            "Ausência de atualização financeira",

        classification:
            "Classificação dos lançamentos",

        correctionCriterion:
            "Critério de correção monetária",

        moraRegime:
            "Regime dos juros de mora",

        fineBase:
            "Base de cálculo da multa",

        feesBase:
            "Base de cálculo dos honorários",

        costsCriterion:
            "Critério das custas e despesas",

        paymentCriterion:
            "Critério de abatimento dos pagamentos",

        stages:
            "Etapas da apuração",

        paymentTreatment:
            "Tratamento dos pagamentos",

        minimumBalance:
            "Limite mínimo do saldo",

        legalCriterion:
            "Critério jurídico",

        accumulatedCorrection:
            "Correção acumulada",

        periodCompatibility:
            "Compatibilidade dos períodos",

        paymentDates:
            "Datas dos pagamentos",

        excessPayments:
            "Pagamentos excedentes",

        rateCompatibility:
            "Compatibilidade da taxa",

        finalInstallmentAdjustment:
            "Ajuste da última parcela",

        paymentSubstitution:
            "Substituição numérica da prestação",

        amortizationSubstitution:
            "Substituição numérica da amortização",

        correctionSubstitution:
            "Substituição numérica da correção",

        moraSubstitution:
            "Substituição numérica da mora",

        futureValueSubstitution:
            "Substituição numérica do valor futuro",

        presentValueSubstitution:
            "Substituição numérica do valor presente",

        contractType:
            "Tipo do contrato",

        operationType:
            "Tipo da operação",

        operationNumber:
            "Número da operação",

        amortizationSystem:
            "Sistema de amortização",

        vehicleValue:
            "Valor do veículo",

        accessoriesServices:
            "Acessórios e serviços",

        downPayment:
            "Entrada",

        iof:
            "IOF",

        cadastroFee:
            "Tarifa de cadastro",

        appraisalFee:
            "Avaliação do bem",

        insurance:
            "Seguro prestamista",

        contractRegistration:
            "Registro do contrato",

        premiumInstallmentCapitalization:
            "Capitalização premiável",

        otherFinancedCharges:
            "Outros encargos financiados",

        declaredFinancedCapital:
            "Capital total declarado",

        installmentBaseValue:
            "Valor-base da parcela",

        boletoFee:
            "Tarifa do boleto",

        chargedInstallment:
            "Parcela cobrada",

        signatureDate:
            "Data da assinatura",

        firstDueDate:
            "Primeira prestação",

        finalDueDate:
            "Vencimento final informado",

        contractedMonthlyRatePercent:
            "Taxa mensal contratada",

        contractedAnnualRatePercent:
            "Taxa anual contratada",

        cetMonthlyRatePercent:
            "CET mensal",

        cetAnnualRatePercent:
            "CET anual",

        moraRatePercent:
            "Juros de mora",

        fineRatePercent:
            "Multa moratória",

        permanenceCommissionRatePercent:
            "Comissão de permanência",

        capitalizationClause:
            "Cláusula de capitalização",

        contractNotes:
            "Observações do contrato",

        capitalComposition:
            "Composição do capital",

        baseFinancing:
            "Valor-base do financiamento",

        calculatedFinancedCapital:
            "Capital calculado",

        principalUsed:
            "Capital utilizado",

        capitalDifference:
            "Diferença do capital",

        effectiveMonthlyRate:
            "Taxa efetiva decimal",

        effectiveMonthlyRatePercent:
            "Taxa efetiva mensal",

        effectiveAnnualRatePercent:
            "Taxa efetiva anual",

        contractedMonthlyRate:
            "Taxa contratada decimal",

        contractedEquivalentAnnualRatePercent:
            "Taxa anual equivalente",

        contractualInstallment:
            "Parcela contratual",

        differencePerInstallment:
            "Diferença por parcela",

        totalCharged:
            "Total cobrado",

        totalContractual:
            "Total contratual",

        totalDifference:
            "Diferença total",

        effectiveTotalInterest:
            "Juros pela taxa efetiva",

        contractedTotalInterest:
            "Juros pela taxa contratada",

        totalInterestDifference:
            "Diferença dos juros",

        expectedFinalDueDate:
            "Vencimento final calculado",
    };

    if (labels[value]) {
        return labels[value];
    }

    return value
        .replace(
            /([A-Z])/g,
            " $1",
        )
        .replace(/[_-]+/g, " ")
        .replace(
            /^./,
            (letter) =>
                letter.toUpperCase(),
        );
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

function getRevisionStatusLabel(
    status: RevisionStatus,
) {
    const labels: Record<
        RevisionStatus,
        string
    > = {
        DRAFT: "Rascunho",
        CALCULATED: "Calculada",
        FINALIZED: "Finalizada",
    };

    return labels[status];
}

function getMetadataPrimitive(
    metadata: JsonValue | null,
    key: string,
) {
    if (
        !metadata ||
        Array.isArray(metadata) ||
        typeof metadata !== "object"
    ) {
        return null;
    }

    const value = metadata[key];

    if (
        typeof value === "string" ||
        typeof value === "number"
    ) {
        return String(value);
    }

    return null;
}

function JsonViewer({
    value,
}: {
    value: JsonValue | null;
}) {
    if (
        value === null ||
        value === undefined
    ) {
        return (
            <div
                className={
                    styles.emptyData
                }
            >
                Nenhuma informação registrada.
            </div>
        );
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return (
                <div
                    className={
                        styles.emptyData
                    }
                >
                    Nenhuma informação registrada.
                </div>
            );
        }

        return (
            <div
                className={
                    styles.jsonArray
                }
            >
                {value.map(
                    (item, index) => (
                        <div
                            key={index}
                            className={
                                styles.jsonArrayItem
                            }
                        >
                            <strong>
                                Item {index + 1}
                            </strong>

                            <JsonViewer
                                value={item}
                            />
                        </div>
                    ),
                )}
            </div>
        );
    }

    if (
        typeof value === "object"
    ) {
        const entries =
            Object.entries(value);

        if (entries.length === 0) {
            return (
                <div
                    className={
                        styles.emptyData
                    }
                >
                    Nenhuma informação registrada.
                </div>
            );
        }

        return (
            <div
                className={
                    styles.jsonGrid
                }
            >
                {entries.map(
                    ([
                        key,
                        itemValue,
                    ]) => (
                        <div
                            key={key}
                            className={
                                styles.jsonItem
                            }
                        >
                            <span>
                                {formatKey(
                                    key,
                                )}
                            </span>

                            {typeof itemValue ===
                                "object" &&
                                itemValue !==
                                null ? (
                                <JsonViewer
                                    value={
                                        itemValue
                                    }
                                />
                            ) : (
                                <strong>
                                    {typeof itemValue ===
                                        "boolean"
                                        ? itemValue
                                            ? "Sim"
                                            : "Não"
                                        : String(
                                            itemValue ??
                                            "—",
                                        )}
                                </strong>
                            )}
                        </div>
                    ),
                )}
            </div>
        );
    }

    return (
        <div
            className={
                styles.singleValue
            }
        >
            {typeof value === "boolean"
                ? value
                    ? "Sim"
                    : "Não"
                : String(value)}
        </div>
    );
}

function DetailSection({
    title,
    description,
    icon,
    children,
    color,
}: {
    title: string;
    description: string;
    icon: ReactNode;
    children: ReactNode;
    color: string;
}) {
    return (
        <section
            className={
                styles.detailSection
            }
            style={
                {
                    "--section-color":
                        color,
                } as CSSProperties
            }
        >
            <div
                className={
                    styles.detailSectionHeader
                }
            >
                <div
                    className={
                        styles.sectionIcon
                    }
                >
                    {icon}
                </div>

                <div>
                    <h3>{title}</h3>

                    <p>{description}</p>
                </div>
            </div>

            {children}
        </section>
    );
}

function CalculationLinesTable({
    lines,
    isCashFlow,
    isForensicAnalysis,
}: {
    lines: CalculationLine[];
    isCashFlow: boolean;
    isForensicAnalysis: boolean;
}) {
    return (
        <section
            className={
                styles.linesCard
            }
        >
            <div
                className={
                    styles.linesHeader
                }
            >
                <div>
                    <span>
                        Memória detalhada
                    </span>

                    <h3>
                        Linhas do cálculo
                    </h3>
                </div>

                <strong>
                    {lines.length} registros
                </strong>
            </div>

            <div
                className={
                    styles.tableContainer
                }
            >
                {isCashFlow ? (
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Período</th>
                                <th>Descrição</th>
                                <th>Entrada</th>
                                <th>Saída</th>
                                <th>Saldo inicial</th>
                                <th>Saldo final</th>
                            </tr>
                        </thead>

                        <tbody>
                            {lines.map(
                                (line) => (
                                    <tr
                                        key={
                                            line.id
                                        }
                                    >
                                        <td>
                                            {
                                                line.sequence
                                            }
                                        </td>

                                        <td>
                                            {getMetadataPrimitive(
                                                line.metadata,
                                                "period",
                                            ) ??
                                                "—"}
                                        </td>

                                        <td>
                                            {line.label ??
                                                "Lançamento"}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.credit,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.debit,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.openingBalance,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.closingBalance,
                                            )}
                                        </td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                ) : isForensicAnalysis ? (
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Etapa</th>
                                <th>Saldo inicial</th>
                                <th>Adição</th>
                                <th>Correção</th>
                                <th>Juros de mora</th>
                                <th>Multa</th>
                                <th>Honorários</th>
                                <th>Pagamento</th>
                                <th>Saldo final</th>
                            </tr>
                        </thead>

                        <tbody>
                            {lines.map(
                                (line) => (
                                    <tr
                                        key={
                                            line.id
                                        }
                                    >
                                        <td>
                                            {
                                                line.sequence
                                            }
                                        </td>

                                        <td>
                                            {line.label ??
                                                "Etapa da apuração"}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.openingBalance,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.debit,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.monetaryCorrection,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.interest,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.fine,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.fee,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.payment ??
                                                line.credit,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.closingBalance,
                                            )}
                                        </td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Descrição</th>
                                <th>Competência</th>
                                <th>Saldo inicial</th>
                                <th>Juros</th>
                                <th>Amortização</th>
                                <th>Prestação</th>
                                <th>Pagamento</th>
                                <th>Saldo final</th>
                            </tr>
                        </thead>

                        <tbody>
                            {lines.map(
                                (line) => (
                                    <tr
                                        key={
                                            line.id
                                        }
                                    >
                                        <td>
                                            {
                                                line.sequence
                                            }
                                        </td>

                                        <td>
                                            {line.label ??
                                                "Parcela"}
                                        </td>

                                        <td>
                                            {formatDate(
                                                line.competence ??
                                                line.dueDate,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.openingBalance,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.interest,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.amortization,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.installment,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.payment,
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                line.closingBalance,
                                            )}
                                        </td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
}

export default function CalculationDetails({
    calculationId,
}: CalculationDetailsProps) {
    const [
        calculation,
        setCalculation,
    ] =
        useState<CalculationRecord | null>(
            null,
        );

    const [
        selectedVersion,
        setSelectedVersion,
    ] = useState<
        number | null
    >(null);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    const loadCalculation =
        useCallback(async () => {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const response =
                    await fetch(
                        `/api/calculations/${encodeURIComponent(
                            calculationId,
                        )}`,
                        {
                            method: "GET",
                            cache: "no-store",
                        },
                    );

                const payload =
                    (await response.json()) as CalculationResponse;

                if (
                    !response.ok ||
                    !payload.calculation
                ) {
                    throw new Error(
                        payload.message ??
                        "Não foi possível carregar o cálculo.",
                    );
                }

                setCalculation(
                    payload.calculation,
                );

                setSelectedVersion(
                    payload.calculation
                        .revisions[0]
                        ?.version ?? null,
                );
            } catch (error) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Não foi possível carregar o cálculo.",
                );
            } finally {
                setIsLoading(false);
            }
        }, [calculationId]);

    useEffect(() => {
        void loadCalculation();
    }, [loadCalculation]);

    const selectedRevision =
        useMemo(() => {
            if (!calculation) {
                return null;
            }

            return (
                calculation.revisions.find(
                    (revision) =>
                        revision.version ===
                        selectedVersion,
                ) ??
                calculation
                    .revisions[0] ??
                null
            );
        }, [
            calculation,
            selectedVersion,
        ]);

    if (isLoading) {
        return (
            <div
                className={
                    styles.loadingState
                }
            >
                <Loader2
                    className={
                        styles.spin
                    }
                    size={34}
                />

                <strong>
                    Carregando memória de cálculo...
                </strong>
            </div>
        );
    }

    if (
        errorMessage ||
        !calculation
    ) {
        return (
            <div
                className={
                    styles.errorState
                }
            >
                <CircleAlert
                    size={36}
                />

                <strong>
                    Cálculo não encontrado
                </strong>

                <p>{errorMessage}</p>

                <Link href="/historico">
                    <ArrowLeft
                        size={17}
                    />

                    Voltar ao histórico
                </Link>
            </div>
        );
    }

    const title =
        calculation.title ??
        getTypeLabel(
            calculation.type,
        );

    const normalizedType =
        normalizeType(
            calculation.type,
        );

    const isCashFlow = [
        "FLUXO_DE_CAIXA",
        "FLUXO_CAIXA",
    ].includes(normalizedType);

    const isForensicAnalysis =
        normalizedType ===
        "ANALISE_PERICIAL";

    const calculationRoute =
        getCalculationRoute(
            calculation.type,
        );

    const canReopen =
        supportsReopening(
            calculation.type,
        );

    const moduleRoute =
        calculationRoute
            ? canReopen &&
                selectedRevision
                ? `${calculationRoute}?calculationId=${encodeURIComponent(
                    calculation.id,
                )}&version=${selectedRevision.version}`
                : calculationRoute
            : null;

    const reportRoute =
        selectedRevision
            ? `/laudos/novo?calculationId=${encodeURIComponent(
                calculation.id,
            )}&version=${selectedRevision.version}`
            : null;

    return (
        <div
            className={styles.container}
        >
            <section
                className={styles.summaryCard}
            >
                <div
                    className={styles.summaryTop}
                >
                    <div
                        className={styles.titleArea}
                    >
                        <div
                            className={styles.calculationIcon}
                        >
                            <Calculator
                                size={27}
                            />
                        </div>

                        <div>
                            <span
                                className={styles.statusBadge}
                                data-status={calculation.status}
                            >
                                {getStatusLabel(calculation.status,)}
                            </span>

                            <h2>{title}</h2>

                            <p>
                                {getTypeLabel(calculation.type,)}
                            </p>
                        </div>
                    </div>

                    <div
                        className={
                            styles.actions
                        }
                    >
                        <EditCalculationModal
                            calculationId={
                                calculation.id
                            }
                            itemName={title}
                            onUpdated={
                                loadCalculation
                            }
                        />

                        {moduleRoute && (
                            <Link
                                href={
                                    moduleRoute
                                }
                                className={
                                    styles.moduleButton
                                }
                            >
                                <Calculator
                                    size={15}
                                />

                                {canReopen
                                    ? "Reabrir versão"
                                    : "Abrir módulo"}
                            </Link>
                        )}

                        {reportRoute && (
                            <Link
                                href={
                                    reportRoute
                                }
                                className={
                                    styles.moduleButton
                                }
                            >
                                <FilePlus2
                                    size={15}
                                />

                                Gerar laudo
                            </Link>
                        )}

                        <DeleteEntityButton
                            endpoint={`/api/calculations/${encodeURIComponent(
                                calculation.id,
                            )}/delete`}
                            itemName={title}
                            entityLabel="cálculo"
                            redirectTo="/historico"
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
                        styles.summaryGrid
                    }
                >
                    <div>
                        <CalendarDays
                            size={19}
                        />

                        <span>
                            Data-base
                        </span>

                        <strong>
                            {formatDate(
                                calculation.referenceDate,
                            )}
                        </strong>
                    </div>

                    <div>
                        <History
                            size={19}
                        />

                        <span>
                            Versão atual
                        </span>

                        <strong>
                            {
                                calculation.currentVersion
                            }
                        </strong>
                    </div>

                    <div>
                        <FileText
                            size={19}
                        />

                        <span>Moeda</span>

                        <strong>
                            {
                                calculation.currency
                            }
                        </strong>
                    </div>

                    <div>
                        <CheckCircle2
                            size={19}
                        />

                        <span>
                            Última atualização
                        </span>

                        <strong>
                            {formatDateTime(
                                calculation.updatedAt,
                            )}
                        </strong>
                    </div>
                </div>

                <div
                    className={
                        styles.relationships
                    }
                >
                    <div>
                        {calculation.client
                            ?.type ===
                            "COMPANY" ? (
                            <Building2
                                size={21}
                            />
                        ) : (
                            <UserRound
                                size={21}
                            />
                        )}

                        <div>
                            <span>
                                Cliente
                            </span>

                            <strong>
                                {calculation
                                    .client
                                    ?.name ??
                                    "Nenhum cliente vinculado"}
                            </strong>

                            {calculation
                                .client
                                ?.tradeName && (
                                    <small>
                                        {
                                            calculation
                                                .client
                                                .tradeName
                                        }
                                    </small>
                                )}
                        </div>
                    </div>

                    <div>
                        <Landmark
                            size={21}
                        />

                        <div>
                            <span>
                                Processo
                            </span>

                            <strong>
                                {calculation
                                    .legalProcess
                                    ?.title ??
                                    calculation
                                        .legalProcess
                                        ?.caseNumber ??
                                    "Nenhum processo vinculado"}
                            </strong>

                            {calculation
                                .legalProcess
                                ?.court && (
                                    <small>
                                        {
                                            calculation
                                                .legalProcess
                                                .court
                                        }
                                    </small>
                                )}
                        </div>
                    </div>
                </div>
            </section>

            <div
                className={
                    styles.navigationRow
                }
            >
                <Link
                    href="/historico"
                    className={
                        styles.backButton
                    }
                >
                    <ArrowLeft
                        size={17}
                    />

                    Voltar ao histórico
                </Link>

                <button
                    type="button"
                    className={
                        styles.refreshButton
                    }
                    onClick={() =>
                        void loadCalculation()
                    }
                >
                    <RefreshCw
                        size={17}
                    />

                    Atualizar dados
                </button>
            </div>

            <section
                className={
                    styles.revisionCard
                }
            >
                <div
                    className={
                        styles.revisionHeader
                    }
                >
                    <div>
                        <span>
                            Controle de versões
                        </span>

                        <h3>
                            Revisões do cálculo
                        </h3>
                    </div>

                    <strong>
                        {
                            calculation
                                .revisions
                                .length
                        }{" "}
                        {calculation
                            .revisions
                            .length === 1
                            ? "versão"
                            : "versões"}
                    </strong>
                </div>

                <div
                    className={
                        styles.revisionButtons
                    }
                >
                    {calculation.revisions.map(
                        (revision) => (
                            <button
                                key={
                                    revision.id
                                }
                                type="button"
                                data-active={
                                    selectedRevision?.version ===
                                    revision.version
                                }
                                onClick={() =>
                                    setSelectedVersion(
                                        revision.version,
                                    )
                                }
                            >
                                <History
                                    size={16}
                                />

                                <span>
                                    Versão{" "}
                                    {
                                        revision.version
                                    }

                                    <small>
                                        {formatDateTime(
                                            revision.createdAt,
                                        )}
                                    </small>
                                </span>
                            </button>
                        ),
                    )}
                </div>
            </section>

            {selectedRevision ? (
                <div
                    className={
                        styles.detailsGrid
                    }
                >
                    <DetailSection
                        title="Dados de entrada"
                        description="Informações utilizadas para produzir o cálculo."
                        icon={
                            <FileInput
                                size={22}
                            />
                        }
                        color="#2563eb"
                    >
                        <JsonViewer
                            value={
                                selectedRevision.input
                            }
                        />
                    </DetailSection>

                    <DetailSection
                        title="Resultados"
                        description="Valores produzidos pelo mecanismo de cálculo."
                        icon={
                            <Calculator
                                size={22}
                            />
                        }
                        color="#16a34a"
                    >
                        <JsonViewer
                            value={
                                selectedRevision.result
                            }
                        />
                    </DetailSection>

                    <DetailSection
                        title="Resumo"
                        description="Síntese dos principais valores encontrados."
                        icon={
                            <ListChecks
                                size={22}
                            />
                        }
                        color="#7c3aed"
                    >
                        <JsonViewer
                            value={
                                selectedRevision.summary
                            }
                        />
                    </DetailSection>

                    <DetailSection
                        title="Premissas"
                        description="Condições consideradas no desenvolvimento."
                        icon={
                            <Scale
                                size={22}
                            />
                        }
                        color="#d97706"
                    >
                        <JsonViewer
                            value={
                                selectedRevision.premises
                            }
                        />
                    </DetailSection>

                    <DetailSection
                        title="Metodologia"
                        description="Método empregado na realização do cálculo."
                        icon={
                            <FlaskConical
                                size={22}
                            />
                        }
                        color="#0891b2"
                    >
                        <JsonViewer
                            value={
                                selectedRevision.methodology
                            }
                        />
                    </DetailSection>

                    <DetailSection
                        title="Fórmulas"
                        description="Expressões matemáticas utilizadas."
                        icon={
                            <Sigma
                                size={22}
                            />
                        }
                        color="#e11d48"
                    >
                        <JsonViewer
                            value={
                                selectedRevision.formulas
                            }
                        />
                    </DetailSection>

                    <DetailSection
                        title="Avisos"
                        description="Alertas e observações produzidos pelo sistema."
                        icon={
                            <CircleAlert
                                size={22}
                            />
                        }
                        color="#dc2626"
                    >
                        <JsonViewer
                            value={
                                selectedRevision.warnings
                            }
                        />
                    </DetailSection>

                    <DetailSection
                        title="Informações da revisão"
                        description="Dados técnicos e de integridade da versão."
                        icon={
                            <FunctionSquare
                                size={22}
                            />
                        }
                        color="#0d9488"
                    >
                        <div
                            className={
                                styles.revisionInformation
                            }
                        >
                            <div>
                                <span>
                                    Versão
                                </span>

                                <strong>
                                    {
                                        selectedRevision.version
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Motor
                                </span>

                                <strong>
                                    {
                                        selectedRevision.engineVersion
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Situação
                                </span>

                                <strong>
                                    {getRevisionStatusLabel(
                                        selectedRevision.status,
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Data-base
                                </span>

                                <strong>
                                    {formatDate(
                                        selectedRevision.referenceDate,
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Finalização
                                </span>

                                <strong>
                                    {formatDateTime(
                                        selectedRevision.finalizedAt,
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Hash de integridade
                                </span>

                                <strong>
                                    {selectedRevision.integrityHash ??
                                        "Ainda não gerado"}
                                </strong>
                            </div>
                        </div>

                        {selectedRevision.notes && (
                            <div
                                className={
                                    styles.notes
                                }
                            >
                                <span>
                                    Observações
                                </span>

                                <p>
                                    {
                                        selectedRevision.notes
                                    }
                                </p>
                            </div>
                        )}
                    </DetailSection>
                </div>
            ) : (
                <div
                    className={
                        styles.emptyRevision
                    }
                >
                    Nenhuma revisão registrada
                    para este cálculo.
                </div>
            )}

            {selectedRevision &&
                selectedRevision.lines
                    .length > 0 && (
                    <CalculationLinesTable
                        lines={
                            selectedRevision.lines
                        }
                        isCashFlow={
                            isCashFlow
                        }
                        isForensicAnalysis={
                            isForensicAnalysis
                        }
                    />
                )}
        </div>
    );
}