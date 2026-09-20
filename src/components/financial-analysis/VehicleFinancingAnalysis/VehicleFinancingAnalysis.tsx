// src/components/financial-analysis/VehicleFinancingAnalysis/VehicleFinancingAnalysis.tsx
"use client";
import {
    ArrowLeft,
    ArrowRight,
    Calculator,
    CheckCircle2,
    CircleAlert,
    FileSearch2,
    History,
    Landmark,
    Loader2,
    Printer,
    RotateCcw,
    TableProperties,
    TestTube2,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import SaveCalculationModal from "@/components/calculations/SaveCalculationModal/SaveCalculationModal";
import {
    getStringValue,
    loadCalculationRevision,
    type ReopenedCalculation,
} from "@/lib/calculations/reopen-calculation";
import {
    analyzeVehicleFinancing,
    createVehicleFinancingInput,
} from "@/lib/financial-analysis/vehicle-financing.engine";
import type {
    VehicleFinancingAnalysisResult,
    VehicleFinancingFormState,
    VehicleFinancingScheduleRow,
} from "@/lib/financial-analysis/vehicle-financing.types";
import {
    printProfessionalDocument,
    type CalculationPrintRow,
    type ProfessionalPrintDocument,
    type ProfessionalPrintSection,
    type ProfessionalPrintTable,
} from "@/lib/printing/calculation-print";
import styles from "./styles.module.scss";
type VehicleFinancingAnalysisProps = {
    calculationId?: string;
    calculationVersion?: number;
};
type AnalysisStep = 1 | 2 | 3 | 4 | 5;
type RateComparisonStatus = "higher" | "lower" | "equal";
type RateComparison = {
    status: RateComparisonStatus;
    title: string;
    description: string;
    badge: string;
    differencePercentagePoints: number;
};
function getRateComparison(
    effectiveRatePercent: number,
    contractedRatePercent: number,
): RateComparison {
    const tolerancePercentagePoints = 0.0001;
    const differencePercentagePoints =
        effectiveRatePercent - contractedRatePercent;
    if (Math.abs(differencePercentagePoints) <= tolerancePercentagePoints) {
        return {
            status: "equal",
            title: "Taxa calculada compatível com a taxa contratada",
            description:
                "A taxa efetivamente encontrada está dentro da tolerância adotada em relação à taxa mensal pactuada no contrato.",
            badge: "Taxas compatíveis",
            differencePercentagePoints,
        };
    }
    if (differencePercentagePoints > 0) {
        return {
            status: "higher",
            title: "Taxa calculada maior que a taxa contratada",
            description:
                "A taxa que reproduz a parcela cobrada ficou acima da taxa mensal informada no contrato, indicando possível cobrança superior ao pactuado.",
            badge: "Acima do contratado",
            differencePercentagePoints,
        };
    }
    return {
        status: "lower",
        title: "Taxa calculada menor que a taxa contratada",
        description:
            "A taxa que reproduz a parcela cobrada ficou abaixo da taxa mensal informada no contrato. O resultado deve ser conferido com os demais componentes da operação.",
        badge: "Abaixo do contratado",
        differencePercentagePoints,
    };
}
type BacenVehicleRateResponse = {
    seriesCode?: number;
    seriesName?: string;
    referenceMonth?: string;
    observationDate?: string | null;
    monthlyRatePercent?: number;
    source?: string;
    retrievedAt?: string;
    message?: string;
};
function getMarketRateComparison(
    effectiveRatePercent: number,
    marketRatePercent: number,
): RateComparison {
    const tolerancePercentagePoints =
        0.0001;
    const differencePercentagePoints =
        effectiveRatePercent -
        marketRatePercent;
    if (
        Math.abs(
            differencePercentagePoints,
        ) <= tolerancePercentagePoints
    ) {
        return {
            status: "equal",
            title:
                "Taxa calculada compatível com a taxa média de mercado",
            description:
                "A taxa efetivamente encontrada está dentro da tolerância adotada em relação à taxa média mensal utilizada como referência.",
            badge:
                "Compatível com a referência",
            differencePercentagePoints,
        };
    }
    if (
        differencePercentagePoints >
        0
    ) {
        return {
            status: "higher",
            title:
                "Taxa calculada acima da taxa média de mercado",
            description:
                "A taxa que reproduz a parcela cobrada ficou acima da referência de mercado selecionada. O resultado é um indicador técnico comparativo e não constitui, isoladamente, conclusão jurídica sobre abusividade.",
            badge:
                "Acima da referência",
            differencePercentagePoints,
        };
    }
    return {
        status: "lower",
        title:
            "Taxa calculada abaixo da taxa média de mercado",
        description:
            "A taxa que reproduz a parcela cobrada ficou abaixo da referência de mercado selecionada. A análise deve considerar a modalidade, o período, o risco da operação e os demais componentes contratuais.",
        badge:
            "Abaixo da referência",
        differencePercentagePoints,
    };
}
const emptyForm: VehicleFinancingFormState = {
    contractType: "CDC - Cédula de Crédito Bancário",
    operationType: "Financiamento de veículo",
    operationNumber: "",
    amortizationSystem: "Tabela Price",
    contractIssuePlace: "",
    proposalValidity: "",
    correspondentName: "",
    correspondentDocument: "",
    creditorName: "",
    creditorDocument: "",
    creditorAddress: "",
    clientName: "",
    clientDocument: "",
    clientPhone: "",
    clientMobile: "",
    clientEmail: "",
    clientAddress: "",
    clientCity: "",
    clientState: "",
    clientZipCode: "",
    guarantors: "",
    otherGuarantorsAnnex: "Não informado",
    vehicleBrand: "",
    vehicleModel: "",
    vehicleChassis: "",
    vehicleModelYear: "",
    vehicleFuel: "",
    vehicleCondition: "",
    otherAssetsAnnex: "Não informado",
    dealerName: "",
    dealerDocument: "",
    vehicleValue: "",
    accessoriesServices: "",
    downPayment: "",
    netCreditAmount: "",
    ipva: "",
    trafficFines: "",
    licensing: "",
    dispatcherFee: "",
    contractSubtotal: "",
    iof: "",
    iofFinanced: "",
    iofAdditional: "",
    totalTaxes: "",
    cadastroFee: "",
    appraisalFee: "",
    totalFees: "",
    insurance: "",
    contractRegistration: "",
    notaryContractRegistration: "",
    premiumInstallmentCapitalization: "",
    otherFinancedCharges: "",
    declaredFinancedCapital: "",
    financedWithTaxesAmount: "",
    installmentBaseValue: "",
    boletoFee: "",
    chargedInstallment: "",
    installments: "",
    intermediateInstallmentsValue: "",
    totalInstallmentsValue: "",
    paymentMethod: "",
    signatureDate: "",
    firstDueDate: "",
    finalDueDate: "",
    contractedMonthlyRatePercent: "",
    contractedAnnualRatePercent: "",
    cetMonthlyRatePercent: "",
    cetAnnualRatePercent: "",
    insuranceContracted: "Não informado",
    insuranceChargingMethod: "",
    insurerName: "",
    insurerDocument: "",
    susepNumber: "",
    insuranceProposalNumber: "",
    insuranceProductType: "",
    bankAccountType: "",
    bankName: "",
    bankAgency: "",
    bankAccount: "",
    signatureDateTime: "",
    signatureGeolocation: "",
    signatureSessionId: "",
    moraRatePercent: "",
    fineRatePercent: "",
    permanenceCommissionRatePercent: "",
    capitalizationClause: "Não informado",
    contractNotes: "",
    marketRateMode: "automatic",
    marketMonthlyRatePercent: "",
    marketReferenceMonth: "",
    marketSeriesCode: "25471",
    marketSource: "Banco Central do Brasil — SGS",
    marketRetrievedAt: "",
    marketNotes: "",
};

const exampleForm: VehicleFinancingFormState = {
    ...emptyForm,
    operationNumber: "690150825",
    vehicleValue: "59.000,00",
    accessoriesServices: "216,10",
    downPayment: "25.000,00",
    iof: "0,00",
    cadastroFee: "749,00",
    appraisalFee: "485,00",
    insurance: "1.356,60",
    contractRegistration: "151,04",
    premiumInstallmentCapitalization: "0,00",
    otherFinancedCharges: "0,00",
    declaredFinancedCapital: "36.957,74",
    installmentBaseValue: "0,00",
    boletoFee: "0,00",
    chargedInstallment: "1.107,02",
    installments: "48",
    signatureDate: "2020-05-29",
    firstDueDate: "2020-06-29",
    finalDueDate: "2024-05-29",
    contractedMonthlyRatePercent: "1,57",
    contractedAnnualRatePercent: "20,52",
    cetMonthlyRatePercent: "1,96",
    cetAnnualRatePercent: "26,22",
    moraRatePercent: "1,00",
    fineRatePercent: "2,00",
    contractNotes: "Caso prático de financiamento de veículo.",
    marketNotes: "Taxa média mensal da modalidade de aquisição de veículos para pessoas físicas.",
};

const formKeys = Object.keys(emptyForm) as Array<keyof VehicleFinancingFormState>;

type MoneyField =
    | "vehicleValue" | "accessoriesServices" | "downPayment" | "netCreditAmount"
    | "ipva" | "trafficFines" | "licensing" | "dispatcherFee" | "contractSubtotal"
    | "iof" | "iofFinanced" | "iofAdditional" | "totalTaxes" | "cadastroFee" | "appraisalFee"
    | "totalFees" | "insurance" | "contractRegistration" | "notaryContractRegistration" | "premiumInstallmentCapitalization"
    | "otherFinancedCharges" | "declaredFinancedCapital" | "financedWithTaxesAmount" | "installmentBaseValue"
    | "boletoFee" | "chargedInstallment" | "intermediateInstallmentsValue"
    | "totalInstallmentsValue";

function formatMoneyInput(value: string) {
    const clean = value.replace(/[^\d,]/g, "");
    if (!clean) return "";
    const commaIndex = clean.indexOf(",");
    const integerRaw = commaIndex >= 0 ? clean.slice(0, commaIndex) : clean;
    const decimalRaw = commaIndex >= 0 ? clean.slice(commaIndex + 1).replace(/,/g, "").slice(0, 2) : "";
    const integerDigits = (integerRaw || "0").replace(/^0+(?=\d)/, "");
    const integerFormatted = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return commaIndex >= 0 ? `${integerFormatted},${decimalRaw}` : integerFormatted;
}

function formatDocumentInput(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 11) {
        return digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return digits.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatPhoneInput(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function formatZipCodeInput(value: string) {
    return value.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}
function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
}
function formatRate(value: number, digits = 6) {
    return new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: digits,
    }).format(value);
}
function formatDate(value: string) {
    const parts = value.split("-");
    if (parts.length !== 3) {
        return value;
    }
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
function formatReferenceMonth(
    value: string,
) {
    const match =
        /^(\d{4})-(\d{2})$/.exec(
            value,
        );
    if (!match) {
        return value || "Não informado";
    }
    return `${match[2]}/${match[1]}`;
}
function formatDateTime(
    value: string | null,
) {
    if (!value) {
        return "Não informado";
    }
    const date =
        new Date(value);
    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }
    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            dateStyle:
                "short",
            timeStyle:
                "short",
        },
    ).format(date);
}
function getFormFromRevision(input: Record<string, unknown>) {
    const nextForm = {
        ...emptyForm,
    };
    const mutableForm =
        nextForm as unknown as
        Record<string, string>;
    for (const key of formKeys) {
        mutableForm[key] =
            getStringValue(
                input,
                key,
                emptyForm[key],
            );
    }
    nextForm.marketRateMode =
        mutableForm.marketRateMode ===
            "manual"
            ? "manual"
            : "automatic";
    return nextForm;
}
function SummaryItem({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div
            className={highlight ? styles.highlightSummaryItem : styles.summaryItem}
        >
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}
function ScheduleTable({
    title,
    description,
    rows,
    rateLabel,
}: {
    title: string;
    description: string;
    rows: VehicleFinancingScheduleRow[];
    rateLabel: string;
}) {
    const totalPayment = rows.reduce((total, row) => total + row.payment, 0);
    const totalInterest = rows.reduce((total, row) => total + row.interest, 0);
    const totalAmortization = rows.reduce(
        (total, row) => total + row.amortization,
        0,
    );
    return (
        <section className={styles.tableCard}>
            <div className={styles.tableHeader}>
                <div>
                    <span>{rateLabel}</span>
                    <h3>{title}</h3>
                    <p>{description}</p>
                </div>
                <TableProperties size={25} />
            </div>
            <div className={styles.tableWrapper}>
                <table>
                    <thead>
                        <tr>
                            <th>Restantes</th>
                            <th>Nº</th>
                            <th>Vencimento</th>
                            <th>Saldo inicial</th>
                            <th>Juros</th>
                            <th>Amortização</th>
                            <th>Parcela</th>
                            <th>Saldo final</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.installmentNumber}>
                                <td>{row.remainingInstallments}</td>
                                <td>{row.installmentNumber}</td>
                                <td>{formatDate(row.dueDate)}</td>
                                <td>{formatCurrency(row.openingBalance)}</td>
                                <td>{formatCurrency(row.interest)}</td>
                                <td>{formatCurrency(row.amortization)}</td>
                                <td>{formatCurrency(row.payment)}</td>
                                <td>{formatCurrency(row.closingBalance)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={4}>Totais</td>
                            <td>{formatCurrency(totalInterest)}</td>
                            <td>{formatCurrency(totalAmortization)}</td>
                            <td>{formatCurrency(totalPayment)}</td>
                            <td>{formatCurrency(rows.at(-1)?.closingBalance ?? 0)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </section>
    );
}
type VehiclePrintKind =
    | "contract"
    | "effective"
    | "contracted"
    | "market"
    | "differences"
    | "complete";
function formatFormCurrency(value: string) {
    const normalized = value.trim().replace(/\s/g, "").replace(/R\$/gi, "").replace(/\./g, "").replace(",", ".");
    const numericValue = Number(normalized);
    if (!value.trim() || !Number.isFinite(numericValue)) {
        return "Não informado";
    }
    return formatCurrency(numericValue);
}
function displayText(value: string, fallback = "Não informado") {
    return value.trim() || fallback;
}
function displayPercent(value: string, suffix: string) {
    return value.trim() ? `${value.trim()}${suffix}` : "Não informado";
}
function toPrintTone(status: RateComparisonStatus) {
    if (status === "higher") {
        return "danger" as const;
    }
    if (status === "lower") {
        return "warning" as const;
    }
    return "success" as const;
}
function buildSchedulePrintTable(rows: VehicleFinancingScheduleRow[]): ProfessionalPrintTable {
    const totalPayment = rows.reduce((total, row) => total + row.payment, 0);
    const totalInterest = rows.reduce((total, row) => total + row.interest, 0);
    const totalAmortization = rows.reduce((total, row) => total + row.amortization, 0);
    return {
        compact: true,
        columns: [
            { key: "remaining", label: "Restantes", align: "center" },
            { key: "number", label: "Nº", align: "center" },
            { key: "dueDate", label: "Vencimento", align: "center" },
            { key: "openingBalance", label: "Saldo inicial", align: "right" },
            { key: "interest", label: "Juros", align: "right" },
            { key: "amortization", label: "Amortização", align: "right" },
            { key: "payment", label: "Parcela", align: "right" },
            { key: "closingBalance", label: "Saldo final", align: "right" },
        ],
        rows: rows.map((row) => ({
            remaining: String(row.remainingInstallments),
            number: String(row.installmentNumber),
            dueDate: formatDate(row.dueDate),
            openingBalance: formatCurrency(row.openingBalance),
            interest: formatCurrency(row.interest),
            amortization: formatCurrency(row.amortization),
            payment: formatCurrency(row.payment),
            closingBalance: formatCurrency(row.closingBalance),
        })),
        footer: {
            remaining: "Totais",
            number: "",
            dueDate: "",
            openingBalance: "",
            interest: formatCurrency(totalInterest),
            amortization: formatCurrency(totalAmortization),
            payment: formatCurrency(totalPayment),
            closingBalance: formatCurrency(rows.at(-1)?.closingBalance ?? 0),
        },
    };
}
function buildComparisonPrintTable(
    analysis: VehicleFinancingAnalysisResult,
): ProfessionalPrintTable {
    return {
        compact: true,
        columns: [
            { key: "number", label: "Nº", align: "center" },
            { key: "dueDate", label: "Vencimento", align: "center" },
            { key: "contractual", label: "Parcela contratual", align: "right" },
            { key: "market", label: "Parcela de mercado", align: "right" },
            { key: "charged", label: "Parcela cobrada", align: "right" },
            { key: "differenceContracted", label: "Dif. cobrada × contratada", align: "right" },
            { key: "differenceMarket", label: "Dif. cobrada × mercado", align: "right" },
        ],
        rows: analysis.comparison.map((row) => ({
            number: String(row.installmentNumber),
            dueDate: formatDate(row.dueDate),
            contractual: formatCurrency(row.contractualPayment),
            market: formatCurrency(row.marketPayment),
            charged: formatCurrency(row.chargedPayment),
            differenceContracted: formatCurrency(row.differenceChargedVsContracted),
            differenceMarket: formatCurrency(row.differenceChargedVsMarket),
        })),
        footer: {
            number: "Totais",
            dueDate: "",
            contractual: formatCurrency(analysis.totalContractual),
            market: formatCurrency(analysis.totalMarket),
            charged: formatCurrency(analysis.totalCharged),
            differenceContracted: formatCurrency(analysis.totalDifference),
            differenceMarket: formatCurrency(analysis.marketTotalDifference),
        },
    };
}
function hasPrintValue(value: string) {
    const normalized = value.trim().toLowerCase();
    return Boolean(normalized && normalized !== "não informado");
}

function textPrintRow(label: string, value: string, highlight = false): CalculationPrintRow | null {
    return hasPrintValue(value) ? { label, value: value.trim(), highlight } : null;
}

function moneyPrintRow(label: string, value: string, highlight = false): CalculationPrintRow | null {
    return value.trim() ? { label, value: formatFormCurrency(value), highlight } : null;
}

function datePrintRow(label: string, value: string): CalculationPrintRow | null {
    return value ? { label, value: formatDate(value) } : null;
}

function compactPrintRows(...rows: Array<CalculationPrintRow | null>) {
    return rows.filter((row): row is CalculationPrintRow => Boolean(row));
}

function optionalPrintSection(title: string, rows: CalculationPrintRow[], columns: 1 | 2 | 3 | 4 = 2, note?: string): ProfessionalPrintSection | null {
    const meaningfulNote = note && hasPrintValue(note) ? note.trim() : undefined;
    if (rows.length === 0 && !meaningfulNote) return null;
    return { title, rows: rows.length > 0 ? rows : undefined, columns, note: meaningfulNote };
}

function buildContractPrintSections(form: VehicleFinancingFormState): ProfessionalPrintSection[] {
    const sections: Array<ProfessionalPrintSection | null> = [
        optionalPrintSection("Identificação da operação", compactPrintRows(
            textPrintRow("Tipo de contrato", form.contractType),
            textPrintRow("Tipo de operação", form.operationType),
            textPrintRow("Número da operação/proposta", form.operationNumber),
            textPrintRow("Sistema de amortização", form.amortizationSystem),
            textPrintRow("Local de emissão", form.contractIssuePlace),
            textPrintRow("Prazo de validade", form.proposalValidity),
            textPrintRow("Correspondente", form.correspondentName),
            textPrintRow("CNPJ/CPF do correspondente", form.correspondentDocument),
        )),
        optionalPrintSection("Credor", compactPrintRows(
            textPrintRow("Nome/Razão social", form.creditorName),
            textPrintRow("CNPJ/CPF", form.creditorDocument),
            textPrintRow("Endereço", form.creditorAddress),
        )),
        optionalPrintSection("Cliente / emitente", compactPrintRows(
            textPrintRow("Nome/Razão social", form.clientName),
            textPrintRow("CNPJ/CPF", form.clientDocument),
            textPrintRow("Telefone", form.clientPhone),
            textPrintRow("Celular", form.clientMobile),
            textPrintRow("E-mail", form.clientEmail),
            textPrintRow("Endereço", form.clientAddress),
            textPrintRow("Cidade", form.clientCity),
            textPrintRow("UF", form.clientState),
            textPrintRow("CEP", form.clientZipCode),
        )),
        optionalPrintSection("Garantidores", compactPrintRows(
            textPrintRow("Garantidores solidários", form.guarantors),
            textPrintRow("Outros garantidores em anexo", form.otherGuarantorsAnnex),
        )),
        optionalPrintSection("Veículo e garantia", compactPrintRows(
            textPrintRow("Marca", form.vehicleBrand),
            textPrintRow("Modelo", form.vehicleModel),
            textPrintRow("Chassi/Nº de série", form.vehicleChassis),
            textPrintRow("Ano/modelo", form.vehicleModelYear),
            textPrintRow("Combustível", form.vehicleFuel),
            textPrintRow("Condição", form.vehicleCondition),
            textPrintRow("Outros bens/garantias em anexo", form.otherAssetsAnnex),
            textPrintRow("Concessionária/Loja", form.dealerName),
            textPrintRow("CNPJ/CPF da loja", form.dealerDocument),
        )),
        optionalPrintSection("Composição do financiamento", compactPrintRows(
            moneyPrintRow("Valor do veículo", form.vehicleValue),
            moneyPrintRow("Acessórios e serviços", form.accessoriesServices),
            moneyPrintRow("Entrada", form.downPayment),
            moneyPrintRow("Valor líquido do crédito", form.netCreditAmount),
            moneyPrintRow("IPVA financiado", form.ipva),
            moneyPrintRow("Multas de trânsito", form.trafficFines),
            moneyPrintRow("Licenciamento", form.licensing),
            moneyPrintRow("Despachante", form.dispatcherFee),
            moneyPrintRow("Sub-total informado", form.contractSubtotal),
            moneyPrintRow("IOF total", form.iof),
            moneyPrintRow("IOF financiado", form.iofFinanced),
            moneyPrintRow("IOF adicional", form.iofAdditional),
            moneyPrintRow("Total de impostos informado", form.totalTaxes),
            moneyPrintRow("Tarifa de cadastro", form.cadastroFee),
            moneyPrintRow("Avaliação do bem", form.appraisalFee),
            moneyPrintRow("Total de tarifas informado", form.totalFees),
            moneyPrintRow("Seguro prestamista", form.insurance),
            moneyPrintRow("Registro do contrato", form.contractRegistration),
            moneyPrintRow("Registro em cartório", form.notaryContractRegistration),
            moneyPrintRow("Capitalização premiável", form.premiumInstallmentCapitalization),
            moneyPrintRow("Outros encargos financiados", form.otherFinancedCharges),
            moneyPrintRow("Capital total declarado", form.declaredFinancedCapital, true),
            moneyPrintRow("Valor financiado com impostos", form.financedWithTaxesAmount),
        )),
        optionalPrintSection("Condições de pagamento", compactPrintRows(
            moneyPrintRow("Valor-base da parcela", form.installmentBaseValue),
            moneyPrintRow("Tarifa do boleto", form.boletoFee),
            moneyPrintRow("Parcela total cobrada", form.chargedInstallment, true),
            textPrintRow("Quantidade de parcelas", form.installments),
            moneyPrintRow("Parcelas intermediárias", form.intermediateInstallmentsValue),
            moneyPrintRow("Valor total das parcelas", form.totalInstallmentsValue),
            textPrintRow("Forma de pagamento", form.paymentMethod),
            datePrintRow("Assinatura do contrato", form.signatureDate),
            datePrintRow("Primeira prestação", form.firstDueDate),
            datePrintRow("Vencimento final informado", form.finalDueDate),
        )),
        optionalPrintSection("Taxas pactuadas e custo efetivo total", compactPrintRows(
            textPrintRow("Taxa mensal contratada", form.contractedMonthlyRatePercent ? `${form.contractedMonthlyRatePercent}% a.m.` : "", true),
            textPrintRow("Taxa anual contratada", form.contractedAnnualRatePercent ? `${form.contractedAnnualRatePercent}% a.a.` : ""),
            textPrintRow("CET mensal", form.cetMonthlyRatePercent ? `${form.cetMonthlyRatePercent}% a.m.` : ""),
            textPrintRow("CET anual", form.cetAnnualRatePercent ? `${form.cetAnnualRatePercent}% a.a.` : ""),
        )),
        optionalPrintSection("Seguro", compactPrintRows(
            textPrintRow("Seguro contratado", form.insuranceContracted),
            textPrintRow("Forma de cobrança", form.insuranceChargingMethod),
            textPrintRow("Seguradora", form.insurerName),
            textPrintRow("CNPJ da seguradora", form.insurerDocument),
            textPrintRow("Número SUSEP", form.susepNumber),
            textPrintRow("Proposta do seguro", form.insuranceProposalNumber),
            textPrintRow("Produto/modalidade", form.insuranceProductType),
        )),
        optionalPrintSection("Dados bancários", compactPrintRows(
            textPrintRow("Tipo de conta", form.bankAccountType),
            textPrintRow("Banco", form.bankName),
            textPrintRow("Agência", form.bankAgency),
            textPrintRow("Conta", form.bankAccount),
        )),
        optionalPrintSection("Assinatura eletrônica", compactPrintRows(
            textPrintRow("Data e hora", form.signatureDateTime),
            textPrintRow("Geolocalização", form.signatureGeolocation),
            textPrintRow("ID da sessão", form.signatureSessionId),
        )),
        optionalPrintSection("Encargos moratórios", compactPrintRows(
            textPrintRow("Juros de mora", form.moraRatePercent ? `${form.moraRatePercent}%` : ""),
            textPrintRow("Multa moratória", form.fineRatePercent ? `${form.fineRatePercent}%` : ""),
            textPrintRow("Comissão de permanência", form.permanenceCommissionRatePercent ? `${form.permanenceCommissionRatePercent}%` : ""),
            textPrintRow("Cláusula de capitalização", form.capitalizationClause),
        )),
        optionalPrintSection("Referência de mercado", compactPrintRows(
            textPrintRow("Origem", form.marketRateMode === "automatic" ? "Banco Central do Brasil" : "Informação manual"),
            textPrintRow("Taxa média mensal", form.marketMonthlyRatePercent ? `${form.marketMonthlyRatePercent}% a.m.` : ""),
            textPrintRow("Mês de referência", form.marketReferenceMonth ? formatReferenceMonth(form.marketReferenceMonth) : ""),
            textPrintRow("Série ou identificação", form.marketSeriesCode),
            textPrintRow("Fonte", form.marketSource),
            textPrintRow("Data da consulta", form.marketRetrievedAt ? formatDateTime(form.marketRetrievedAt) : ""),
        ), 2, form.marketNotes),
        optionalPrintSection("Observações contratuais", [], 2, form.contractNotes),
    ];
    return sections.filter((section): section is ProfessionalPrintSection => Boolean(section));
}

function buildVehiclePrintDocument({
    kind,
    form,
    analysis,
    rateComparison,
    marketRateComparison,
}: {
    kind: VehiclePrintKind;
    form: VehicleFinancingFormState;
    analysis: VehicleFinancingAnalysisResult | null;
    rateComparison: RateComparison | null;
    marketRateComparison: RateComparison | null;
}): ProfessionalPrintDocument {
    const commonMetadata: CalculationPrintRow[] = [
        { label: "Operação", value: displayText(form.operationNumber) },
        { label: "Contrato", value: displayText(form.contractType) },
        {
            label: "Assinatura",
            value: form.signatureDate ? formatDate(form.signatureDate) : "Não informado",
        },
        { label: "Sistema", value: displayText(form.amortizationSystem) },
    ];
    if (kind === "contract") {
        return {
            title: "Dados do contrato",
            subtitle: "Análise de Financiamento de Veículo",
            documentType: "Formulário contratual",
            orientation: "portrait",
            metadata: commonMetadata,
            sections: buildContractPrintSections(form),
            footerText: "Dados transcritos do instrumento contratual",
        };
    }
    if (!analysis) {
        throw new Error("Execute a análise antes de imprimir esta etapa.");
    }
    const effectiveStatus = rateComparison
        ? {
            title: rateComparison.title,
            description: rateComparison.description,
            badge: rateComparison.badge,
            tone: toPrintTone(rateComparison.status),
            rows: [
                {
                    label: "Taxa calculada",
                    value: `${formatRate(analysis.effectiveMonthlyRatePercent, 8)}% a.m.`,
                },
                {
                    label: "Taxa contratada",
                    value: `${formatRate(analysis.contractedMonthlyRatePercent, 8)}% a.m.`,
                },
                {
                    label: "Diferença",
                    value: `${formatRate(Math.abs(rateComparison.differencePercentagePoints), 8)} p.p.`,
                },
            ],
        }
        : undefined;
    const marketStatus = marketRateComparison
        ? {
            title: marketRateComparison.title,
            description: marketRateComparison.description,
            badge: marketRateComparison.badge,
            tone: toPrintTone(marketRateComparison.status),
            rows: [
                {
                    label: "Taxa calculada",
                    value: `${formatRate(analysis.effectiveMonthlyRatePercent, 8)}% a.m.`,
                },
                {
                    label: "Taxa de mercado",
                    value: `${formatRate(analysis.marketMonthlyRatePercent, 8)}% a.m.`,
                },
                {
                    label: "Diferença",
                    value: `${formatRate(Math.abs(marketRateComparison.differencePercentagePoints), 8)} p.p.`,
                },
                {
                    label: "Diferença relativa",
                    value:
                        analysis.effectiveVsMarketRateRelativePercent === null
                            ? "Não disponível"
                            : `${formatRate(analysis.effectiveVsMarketRateRelativePercent, 6)}%`,
                },
            ],
        }
        : undefined;
    const effectiveSummary: CalculationPrintRow[] = [
        { label: "Capital utilizado", value: formatCurrency(analysis.capitalComposition.principalUsed) },
        { label: "Parcela cobrada", value: formatCurrency(analysis.chargedInstallment) },
        {
            label: "Taxa efetiva precisa",
            value: `${formatRate(analysis.effectiveMonthlyRatePercent, 8)}% a.m.`,
            highlight: true,
        },
        {
            label: "Taxa efetiva exibida",
            value: `${formatRate(analysis.effectiveMonthlyRatePercent, 2)}% a.m.`,
        },
        {
            label: "Taxa anual equivalente",
            value: `${formatRate(analysis.effectiveAnnualRatePercent, 6)}% a.a.`,
        },
        { label: "Total de juros", value: formatCurrency(analysis.effectiveTotalInterest) },
    ];
    const contractedSummary: CalculationPrintRow[] = [
        {
            label: "Taxa contratada",
            value: `${formatRate(analysis.contractedMonthlyRatePercent, 6)}% a.m.`,
        },
        {
            label: "Taxa anual equivalente",
            value: `${formatRate(analysis.contractedEquivalentAnnualRatePercent, 6)}% a.a.`,
        },
        {
            label: "Parcela contratual",
            value: formatCurrency(analysis.contractualInstallment),
            highlight: true,
        },
        { label: "Total contratual", value: formatCurrency(analysis.totalContractual) },
        { label: "Juros contratuais", value: formatCurrency(analysis.contractedTotalInterest) },
        { label: "Vencimento final calculado", value: formatDate(analysis.expectedFinalDueDate) },
    ];
    const marketSummary: CalculationPrintRow[] = [
        {
            label: "Taxa média mensal",
            value: `${formatRate(analysis.marketMonthlyRatePercent, 8)}% a.m.`,
            highlight: true,
        },
        {
            label: "Taxa anual equivalente",
            value: `${formatRate(analysis.marketEquivalentAnnualRatePercent, 6)}% a.a.`,
        },
        { label: "Parcela pela taxa média", value: formatCurrency(analysis.marketInstallment) },
        { label: "Total pela taxa média", value: formatCurrency(analysis.totalMarket) },
        { label: "Juros pela taxa média", value: formatCurrency(analysis.marketTotalInterest) },
        { label: "Mês de referência", value: formatReferenceMonth(analysis.marketReferenceMonth) },
        { label: "Série", value: analysis.marketSeriesCode },
        { label: "Fonte", value: analysis.marketSource },
        { label: "Data da consulta", value: formatDateTime(analysis.marketRetrievedAt) },
    ];
    const differenceSummary: CalculationPrintRow[] = [
        { label: "Parcela contratual", value: formatCurrency(analysis.contractualInstallment) },
        { label: "Parcela pela taxa de mercado", value: formatCurrency(analysis.marketInstallment) },
        { label: "Parcela cobrada", value: formatCurrency(analysis.chargedInstallment) },
        {
            label: "Diferença por parcela × contratada",
            value: formatCurrency(analysis.differencePerInstallment),
            highlight: true,
        },
        {
            label: "Diferença total × contratada",
            value: formatCurrency(analysis.totalDifference),
            highlight: true,
        },
        {
            label: "Diferença por parcela × mercado",
            value: formatCurrency(analysis.marketDifferencePerInstallment),
        },
        { label: "Diferença total × mercado", value: formatCurrency(analysis.marketTotalDifference) },
        { label: "Total cobrado", value: formatCurrency(analysis.totalCharged) },
    ];
    const methodologySection: ProfessionalPrintSection = {
        title: "Memória de cálculo",
        formulas: [
            "i = TAXA(n; PMT; PV)",
            "PMT = PV × i ÷ [1 − (1 + i)⁻ⁿ]",
            "Juros = Saldo inicial × taxa",
            "Amortização = Parcela − Juros",
            "Saldo final = Saldo inicial − Amortização",
        ],
        substitutions: [
            `PV = ${formatCurrency(analysis.capitalComposition.principalUsed)}`,
            `PMT cobrada = ${formatCurrency(analysis.chargedInstallment)}`,
            `n = ${analysis.effectiveSchedule.length} parcelas`,
            `i efetiva = ${formatRate(analysis.effectiveMonthlyRatePercent, 8)}% a.m.`,
            `i contratada = ${formatRate(analysis.contractedMonthlyRatePercent, 8)}% a.m.`,
            `i mercado = ${formatRate(analysis.marketMonthlyRatePercent, 8)}% a.m.`,
        ],
    };
    if (kind === "effective") {
        return {
            title: "Taxa efetivamente aplicada",
            subtitle: "Análise de Financiamento de Veículo",
            documentType: "Memória técnica",
            orientation: "landscape",
            metadata: commonMetadata,
            sections: [
                { title: "Dados utilizados e resultado", rows: effectiveSummary, columns: 3 },
                ...(effectiveStatus
                    ? [{ title: "Comparativo automático", status: effectiveStatus } as ProfessionalPrintSection]
                    : []),
                methodologySection,
                {
                    title: "Evolução conforme a taxa calculada",
                    description: "Tabela Price reconstituída com a taxa que produz a parcela efetivamente cobrada.",
                    table: buildSchedulePrintTable(analysis.effectiveSchedule),
                    pageBreakBefore: true,
                },
                {
                    title: "Observações",
                    note:
                        "O resultado reproduz matematicamente o fluxo informado. A classificação jurídica da cobrança depende da análise do contrato e do processo.",
                },
            ],
            footerText: "Memória da taxa efetivamente aplicada",
        };
    }
    if (kind === "contracted") {
        return {
            title: "Evolução pela taxa contratada",
            subtitle: "Análise de Financiamento de Veículo",
            documentType: "Memória técnica",
            orientation: "landscape",
            metadata: commonMetadata,
            sections: [
                { title: "Resumo do cenário contratado", rows: contractedSummary, columns: 3 },
                methodologySection,
                {
                    title: "Evolução conforme a taxa contratada",
                    description: "Tabela Price calculada pela taxa mensal informada no instrumento contratual.",
                    table: buildSchedulePrintTable(analysis.contractedSchedule),
                    pageBreakBefore: true,
                },
            ],
            footerText: "Memória do cenário pela taxa contratada",
        };
    }
    if (kind === "market") {
        return {
            title: "Taxa média de mercado",
            subtitle: "Referência utilizada na Análise de Financiamento de Veículo",
            documentType: "Referência Banco Central",
            orientation: "landscape",
            metadata: commonMetadata,
            sections: [
                { title: "Identificação da referência", rows: marketSummary, columns: 3 },
                ...(marketStatus
                    ? [{ title: "Comparativo com a taxa calculada", status: marketStatus } as ProfessionalPrintSection]
                    : []),
                {
                    title: "Fonte e observações",
                    note: `${analysis.marketSource}. ${analysis.marketNotes || "Sem observações adicionais."}`,
                },
                methodologySection,
                {
                    title: "Evolução conforme a taxa média de mercado",
                    description: "Tabela Price calculada com a referência mensal selecionada.",
                    table: buildSchedulePrintTable(analysis.marketSchedule),
                    pageBreakBefore: true,
                },
            ],
            footerText: "Memória do cenário pela taxa média de mercado",
        };
    }
    if (kind === "differences") {
        return {
            title: "Comparação das prestações",
            subtitle: "Análise de Financiamento de Veículo",
            documentType: "Quadro comparativo",
            orientation: "landscape",
            metadata: commonMetadata,
            sections: [
                { title: "Resumo das diferenças", rows: differenceSummary, columns: 4 },
                ...(effectiveStatus
                    ? [{ title: "Taxa calculada × taxa contratada", status: effectiveStatus } as ProfessionalPrintSection]
                    : []),
                ...(marketStatus
                    ? [{ title: "Taxa calculada × taxa de mercado", status: marketStatus } as ProfessionalPrintSection]
                    : []),
                {
                    title: "Diferenças por prestação",
                    description:
                        "Os totais são apurados com precisão interna, sem multiplicar valores previamente arredondados.",
                    table: buildComparisonPrintTable(analysis),
                    pageBreakBefore: true,
                },
                {
                    title: "Avisos e ressalvas",
                    note:
                        analysis.warnings.length > 0
                            ? analysis.warnings.join(" | ")
                            : "Não foram emitidos avisos adicionais pelo motor de cálculo.",
                },
            ],
            footerText: "Quadro comparativo das prestações",
        };
    }
    const completeSections: ProfessionalPrintSection[] = [
        ...buildContractPrintSections(form),
        { title: "Resumo da taxa efetivamente aplicada", rows: effectiveSummary, columns: 3 },
        ...(effectiveStatus
            ? [{ title: "Comparação com a taxa contratada", status: effectiveStatus } as ProfessionalPrintSection]
            : []),
        { title: "Resumo da taxa média de mercado", rows: marketSummary, columns: 3 },
        ...(marketStatus
            ? [{ title: "Comparação com a taxa de mercado", status: marketStatus } as ProfessionalPrintSection]
            : []),
        { title: "Resumo das diferenças", rows: differenceSummary, columns: 4 },
        methodologySection,
        {
            title: "Evolução pela taxa calculada",
            table: buildSchedulePrintTable(analysis.effectiveSchedule),
            pageBreakBefore: true,
        },
        {
            title: "Evolução pela taxa contratada",
            table: buildSchedulePrintTable(analysis.contractedSchedule),
            pageBreakBefore: true,
        },
        {
            title: "Evolução pela taxa média de mercado",
            table: buildSchedulePrintTable(analysis.marketSchedule),
            pageBreakBefore: true,
        },
        {
            title: "Diferenças por prestação",
            table: buildComparisonPrintTable(analysis),
            pageBreakBefore: true,
        },
        {
            title: "Conclusão técnica preliminar",
            note:
                "A memória apresenta, de forma comparativa, o fluxo efetivamente cobrado, o cenário calculado pela taxa contratada e o cenário calculado pela taxa média de mercado. A eventual qualificação jurídica da divergência deve considerar o contrato, a modalidade, o risco da operação e os elementos do processo.",
        },
        {
            title: "Avisos e ressalvas",
            note:
                analysis.warnings.length > 0
                    ? analysis.warnings.join(" | ")
                    : "Não foram emitidos avisos adicionais pelo motor de cálculo.",
        },
    ];
    return {
        title: "Análise completa de financiamento de veículo",
        subtitle: "Memória técnica consolidada",
        documentType: "Relatório consolidado",
        orientation: "landscape",
        metadata: commonMetadata,
        sections: completeSections,
        footerText: "Relatório consolidado gerado automaticamente",
    };
}
export default function VehicleFinancingAnalysis({
    calculationId,
    calculationVersion,
}: VehicleFinancingAnalysisProps) {
    const [form, setForm] = useState<VehicleFinancingFormState>(emptyForm);
    const [step, setStep] = useState<AnalysisStep>(1);
    const [analysis, setAnalysis] =
        useState<VehicleFinancingAnalysisResult | null>(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [reopenedCalculation, setReopenedCalculation] =
        useState<ReopenedCalculation | null>(null);
    const [isLoadingCalculation, setIsLoadingCalculation] = useState(
        Boolean(calculationId),
    );
    const [loadError, setLoadError] = useState("");
    const [
        isLoadingMarketRate,
        setIsLoadingMarketRate,
    ] = useState(false);
    const [
        marketRateError,
        setMarketRateError,
    ] = useState("");
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
                    expectedType: "ANALISE_FINANCIAMENTO_VEICULO",
                    requestedVersion: calculationVersion,
                });
                if (!isActive) {
                    return;
                }
                setForm(getFormFromRevision(loaded.input));
                setAnalysis(null);
                setStep(1);
                setErrorMessage("");
                setReopenedCalculation(loaded);
            } catch (error) {
                if (!isActive) {
                    return;
                }
                setReopenedCalculation(null);
                setLoadError(
                    error instanceof Error
                        ? error.message
                        : "Não foi possível carregar a análise.",
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
    const titleSuffix = form.operationNumber.trim()
        ? ` — Operação ${form.operationNumber.trim()}`
        : "";
    const rateComparison = useMemo(
        () =>
            analysis
                ? getRateComparison(
                    analysis.effectiveMonthlyRatePercent,
                    analysis.contractedMonthlyRatePercent,
                )
                : null,
        [analysis],
    );
    const marketRateComparison = useMemo(
        () =>
            analysis
                ? getMarketRateComparison(
                    analysis.effectiveMonthlyRatePercent,
                    analysis.marketMonthlyRatePercent,
                )
                : null,
        [analysis],
    );
    const saveLines = useMemo(() => {
        if (!analysis) {
            return [];
        }
        return analysis.effectiveSchedule.map((effectiveRow, index) => {
            const contractedRow =
                analysis.contractedSchedule[index];
            const marketRow =
                analysis.marketSchedule[index];
            const comparisonRow =
                analysis.comparison[index];
            return {
                sequence: effectiveRow.installmentNumber,
                label: `Prestação ${effectiveRow.installmentNumber}`,
                dueDate: effectiveRow.dueDate,
                paymentDate: effectiveRow.paymentDate,
                openingBalance: effectiveRow.openingBalance,
                interestRate: analysis.effectiveMonthlyRate,
                interest: effectiveRow.interest,
                amortization: effectiveRow.amortization,
                installment: effectiveRow.payment,
                payment: effectiveRow.payment,
                closingBalance: effectiveRow.closingBalance,
                metadata: {
                    module: "ANALISE_FINANCIAMENTO_VEICULO",
                    system: "PRICE",
                    installmentNumber: effectiveRow.installmentNumber,
                    remainingInstallments: effectiveRow.remainingInstallments,
                    effectiveScenario: {
                        openingBalance: effectiveRow.openingBalance,
                        interestRate: analysis.effectiveMonthlyRate,
                        interest: effectiveRow.interest,
                        amortization: effectiveRow.amortization,
                        payment: effectiveRow.payment,
                        closingBalance: effectiveRow.closingBalance,
                    },
                    contractedScenario: {
                        openingBalance: contractedRow.openingBalance,
                        interestRate: analysis.contractedMonthlyRate,
                        interest: contractedRow.interest,
                        amortization: contractedRow.amortization,
                        payment: contractedRow.payment,
                        closingBalance: contractedRow.closingBalance,
                    },
                    marketScenario: {
                        openingBalance: marketRow.openingBalance,
                        interestRate: analysis.marketMonthlyRate,
                        interest: marketRow.interest,
                        amortization: marketRow.amortization,
                        payment: marketRow.payment,
                        closingBalance: marketRow.closingBalance,
                    },
                    contractualPayment:
                        comparisonRow.contractualPayment,
                    marketPayment:
                        comparisonRow.marketPayment,
                    chargedPayment:
                        comparisonRow.chargedPayment,
                    differenceChargedVsContracted:
                        comparisonRow.differenceChargedVsContracted,
                    differenceChargedVsMarket:
                        comparisonRow.differenceChargedVsMarket,
                    differenceContractedVsMarket:
                        comparisonRow.differenceContractedVsMarket,
                    difference:
                        comparisonRow.difference,
                    effectiveMonthlyRatePercent:
                        analysis.effectiveMonthlyRatePercent,
                    contractedMonthlyRatePercent:
                        analysis.contractedMonthlyRatePercent,
                    marketMonthlyRatePercent:
                        analysis.marketMonthlyRatePercent,
                    marketReferenceMonth:
                        analysis.marketReferenceMonth,
                    marketSeriesCode:
                        analysis.marketSeriesCode,
                    marketSource:
                        analysis.marketSource,
                },
            };
        });
    }, [analysis]);
    function updateField<Key extends keyof VehicleFinancingFormState>(field: Key, value: VehicleFinancingFormState[Key]) {
        setForm((current) => ({ ...current, [field]: value }));
        setAnalysis(null);
        setStep(1);
        setErrorMessage("");
        setMarketRateError("");
    }

    function updateMoneyField(field: MoneyField, value: string) {
        updateField(field, formatMoneyInput(value));
    }
    async function resolveMarketRate(
        currentForm:
            VehicleFinancingFormState,
    ) {
        if (
            currentForm.marketRateMode ===
            "manual"
        ) {
            return {
                ...currentForm,
                marketReferenceMonth:
                    currentForm.marketReferenceMonth ||
                    currentForm.signatureDate.slice(
                        0,
                        7,
                    ),
                marketSeriesCode:
                    currentForm.marketSeriesCode ||
                    "MANUAL",
                marketSource:
                    currentForm.marketSource ||
                    "Fonte informada manualmente",
                marketRetrievedAt:
                    currentForm.marketRetrievedAt ||
                    new Date().toISOString(),
            };
        }
        if (
            !currentForm.signatureDate
        ) {
            throw new Error(
                "Informe a data de assinatura do contrato para consultar a taxa média do Banco Central.",
            );
        }
        setIsLoadingMarketRate(
            true,
        );
        setMarketRateError("");
        try {
            const response =
                await fetch(
                    `/api/financial-analysis/bacen/vehicle-rate?date=${encodeURIComponent(
                        currentForm.signatureDate,
                    )}`,
                    {
                        method:
                            "GET",
                        cache:
                            "no-store",
                    },
                );
            const payload =
                (await response.json()) as BacenVehicleRateResponse;
            if (
                !response.ok
            ) {
                throw new Error(
                    payload.message ??
                    "Não foi possível consultar a taxa média no Banco Central.",
                );
            }
            if (
                typeof payload.monthlyRatePercent !==
                "number" ||
                !Number.isFinite(
                    payload.monthlyRatePercent,
                ) ||
                !payload.referenceMonth
            ) {
                throw new Error(
                    "O Banco Central retornou dados incompletos para a taxa média.",
                );
            }
            return {
                ...currentForm,
                marketMonthlyRatePercent:
                    String(
                        payload.monthlyRatePercent,
                    ).replace(
                        ".",
                        ",",
                    ),
                marketReferenceMonth:
                    payload.referenceMonth,
                marketSeriesCode:
                    String(
                        payload.seriesCode ??
                        25471,
                    ),
                marketSource:
                    payload.source ??
                    "Banco Central do Brasil — SGS",
                marketRetrievedAt:
                    payload.retrievedAt ??
                    new Date().toISOString(),
                marketNotes:
                    currentForm.marketNotes ||
                    payload.seriesName ||
                    "Taxa média mensal da modalidade de aquisição de veículos para pessoas físicas.",
            };
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Não foi possível consultar a taxa média no Banco Central.";
            setMarketRateError(
                message,
            );
            throw error;
        } finally {
            setIsLoadingMarketRate(
                false,
            );
        }
    }
    async function calculateAnalysis(
        currentForm:
            VehicleFinancingFormState,
        targetStep:
            AnalysisStep,
    ) {
        const resolvedForm =
            await resolveMarketRate(
                currentForm,
            );
        const input =
            createVehicleFinancingInput(
                resolvedForm,
            );
        const result =
            analyzeVehicleFinancing(
                input,
            );
        setForm(
            resolvedForm,
        );
        setAnalysis(
            result,
        );
        setStep(
            targetStep,
        );
    }
    async function handleAnalyze(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setErrorMessage("");
        setMarketRateError("");
        setAnalysis(null);
        try {
            await calculateAnalysis(
                form,
                2,
            );
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Não foi possível realizar a análise.",
            );
        }
    }
    async function handleRefreshMarketRate() {
        if (
            form.marketRateMode !==
            "automatic"
        ) {
            setMarketRateError(
                "A atualização automática está disponível somente quando a origem da taxa estiver definida como Banco Central.",
            );
            return;
        }
        setErrorMessage("");
        setMarketRateError("");
        try {
            await calculateAnalysis(
                form,
                4,
            );
        } catch (error) {
            setMarketRateError(
                error instanceof Error
                    ? error.message
                    : "Não foi possível atualizar a taxa média.",
            );
        }
    }
    function handleLoadExample() {
        setForm(exampleForm);
        setAnalysis(null);
        setStep(1);
        setErrorMessage("");
        setMarketRateError("");
    }
    function handleClear() {
        setForm(emptyForm);
        setAnalysis(null);
        setStep(1);
        setErrorMessage("");
        setMarketRateError("");
    }
    function goToStep(nextStep: AnalysisStep) {
        if (nextStep > 1 && !analysis) {
            return;
        }
        setStep(nextStep);
    }
    function handlePrintSection(kind: VehiclePrintKind) {
        try {
            const documentData = buildVehiclePrintDocument({
                kind,
                form,
                analysis,
                rateComparison,
                marketRateComparison,
            });
            const printResult = printProfessionalDocument(documentData);
            if (!printResult.ok) {
                setErrorMessage(printResult.error ?? "Não foi possível abrir a impressão.");
            }
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Não foi possível preparar o documento para impressão.",
            );
        }
    }
    return (
        <section className={styles.wrapper}>
            {isLoadingCalculation && (
                <div className={styles.notice}>
                    <Loader2 className={styles.spin} size={22} />
                    <div>
                        <strong>Carregando análise</strong>
                        <span>Preparando os dados da revisão escolhida.</span>
                    </div>
                </div>
            )}
            {loadError && (
                <div className={styles.errorNotice}>
                    <CircleAlert size={21} />
                    <div>
                        <strong>Não foi possível reabrir a análise</strong>
                        <span>{loadError}</span>
                    </div>
                </div>
            )}
            {reopenedCalculation && !isLoadingCalculation && (
                <div className={styles.notice}>
                    <History size={22} />
                    <div>
                        <strong>
                            {reopenedCalculation.title} — versão{" "}
                            {reopenedCalculation.sourceVersion}
                        </strong>
                        <span>
                            Os dados do contrato foram carregados. Execute novamente a análise
                            para gerar a versão {reopenedCalculation.currentVersion + 1}.
                        </span>
                    </div>
                </div>
            )}
            <nav className={styles.stepper} aria-label="Etapas da análise">
                <button
                    type="button"
                    data-active={step === 1}
                    onClick={() => goToStep(1)}
                >
                    <span>1</span>
                    Dados do contrato
                </button>
                <button
                    type="button"
                    data-active={step === 2}
                    disabled={!analysis}
                    onClick={() => goToStep(2)}
                >
                    <span>2</span>
                    Taxa calculada
                </button>
                <button
                    type="button"
                    data-active={step === 3}
                    disabled={!analysis}
                    onClick={() => goToStep(3)}
                >
                    <span>3</span>
                    Taxa contratada
                </button>
                <button
                    type="button"
                    data-active={step === 4}
                    disabled={!analysis}
                    onClick={() => goToStep(4)}
                >
                    <span>4</span>
                    Taxa Bacen
                </button>
                <button
                    type="button"
                    data-active={step === 5}
                    disabled={!analysis}
                    onClick={() => goToStep(5)}
                >
                    <span>5</span>
                    Diferenças
                </button>
            </nav>
            {analysis && (
                <section className={styles.consolidatedActionBar}>
                    <div className={styles.consolidatedActionText}>
                        <Printer size={23} />
                        <div>
                            <span>Relatório consolidado</span>
                            <strong>Imprimir análise completa / Salvar PDF</strong>
                            <p>
                                Gera um documento formal com contrato, taxas, comparações,
                                tabelas e conclusão técnica preliminar.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className={styles.consolidatedPrintButton}
                        onClick={() => handlePrintSection("complete")}
                    >
                        <Printer size={18} />
                        Imprimir análise completa
                    </button>
                </section>
            )}
            {step === 1 && (
                <form
                    className={styles.formCard}
                    onSubmit={handleAnalyze}
                >
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>
                            <Landmark size={25} />
                        </div>
                        <div>
                            <span>Etapa 1</span>
                            <h2>Dados pactuados no contrato</h2>
                            <p>
                                Transcreva as condições financeiras constantes no instrumento
                                contratual.
                            </p>
                        </div>
                        <button
                            type="button"
                            className={styles.printButton}
                            data-print-hidden="true"
                            onClick={() =>
                                handlePrintSection("contract")
                            }
                        >
                            <Printer size={18} />
                            Imprimir / Salvar PDF
                        </button>
                    </div>
                    <fieldset>
                        <legend>Identificação da operação</legend>
                        <div className={styles.formGrid}>
                            <label>Tipo de contrato<input type="text" value={form.contractType} onChange={(event) => updateField("contractType", event.target.value)} /></label>
                            <label>Tipo de operação<input type="text" value={form.operationType} onChange={(event) => updateField("operationType", event.target.value)} /></label>
                            <label>Número da operação/proposta<input type="text" value={form.operationNumber} onChange={(event) => updateField("operationNumber", event.target.value)} /></label>
                            <label>Sistema de amortização<select value={form.amortizationSystem} onChange={(event) => updateField("amortizationSystem", event.target.value)}><option value="Tabela Price">Tabela Price</option><option value="Não informado">Não informado</option></select></label>
                            <label>Local de emissão<input type="text" value={form.contractIssuePlace} placeholder="Cidade/UF" onChange={(event) => updateField("contractIssuePlace", event.target.value)} /></label>
                            <label>Prazo de validade da proposta<input type="text" value={form.proposalValidity} placeholder="Ex.: 1 dia" onChange={(event) => updateField("proposalValidity", event.target.value)} /></label>
                            <label className={styles.wideField}>Correspondente / loja intermediadora<input type="text" value={form.correspondentName} onChange={(event) => updateField("correspondentName", event.target.value)} /></label>
                            <label>CNPJ/CPF do correspondente<input type="text" inputMode="numeric" value={form.correspondentDocument} onChange={(event) => updateField("correspondentDocument", formatDocumentInput(event.target.value))} /></label>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>Credor</legend>
                        <div className={styles.formGrid}>
                            <label className={styles.wideField}>Nome / razão social<input type="text" value={form.creditorName} onChange={(event) => updateField("creditorName", event.target.value)} /></label>
                            <label>CNPJ/CPF<input type="text" inputMode="numeric" value={form.creditorDocument} onChange={(event) => updateField("creditorDocument", formatDocumentInput(event.target.value))} /></label>
                            <label className={styles.fullGridField}>Endereço<input type="text" value={form.creditorAddress} onChange={(event) => updateField("creditorAddress", event.target.value)} /></label>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>Cliente / emitente</legend>
                        <div className={styles.formGrid}>
                            <label className={styles.wideField}>Nome / razão social<input type="text" value={form.clientName} onChange={(event) => updateField("clientName", event.target.value)} /></label>
                            <label>CNPJ/CPF<input type="text" inputMode="numeric" value={form.clientDocument} onChange={(event) => updateField("clientDocument", formatDocumentInput(event.target.value))} /></label>
                            <label>Telefone<input type="text" inputMode="tel" value={form.clientPhone} onChange={(event) => updateField("clientPhone", formatPhoneInput(event.target.value))} /></label>
                            <label>Celular<input type="text" inputMode="tel" value={form.clientMobile} onChange={(event) => updateField("clientMobile", formatPhoneInput(event.target.value))} /></label>
                            <label>E-mail<input type="email" value={form.clientEmail} onChange={(event) => updateField("clientEmail", event.target.value)} /></label>
                            <label className={styles.fullGridField}>Endereço<input type="text" value={form.clientAddress} onChange={(event) => updateField("clientAddress", event.target.value)} /></label>
                            <label>Cidade<input type="text" value={form.clientCity} onChange={(event) => updateField("clientCity", event.target.value)} /></label>
                            <label>UF<input type="text" maxLength={2} value={form.clientState} onChange={(event) => updateField("clientState", event.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase())} /></label>
                            <label>CEP<input type="text" inputMode="numeric" value={form.clientZipCode} onChange={(event) => updateField("clientZipCode", formatZipCodeInput(event.target.value))} /></label>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>Garantidores solidários</legend>
                        <div className={styles.formGrid}>
                            <label className={styles.wideField}>Garantidores<textarea rows={3} value={form.guarantors} placeholder="Nome, CPF/CNPJ, endereço e demais dados" onChange={(event) => updateField("guarantors", event.target.value)} /></label>
                            <label>Há outros garantidores em anexo?<select value={form.otherGuarantorsAnnex} onChange={(event) => updateField("otherGuarantorsAnnex", event.target.value)}><option value="Não informado">Não informado</option><option value="Sim">Sim</option><option value="Não">Não</option></select></label>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>Veículo, garantia e concessionária</legend>
                        <div className={styles.formGrid}>
                            <label>Marca<input type="text" value={form.vehicleBrand} onChange={(event) => updateField("vehicleBrand", event.target.value)} /></label>
                            <label className={styles.wideField}>Modelo<input type="text" value={form.vehicleModel} onChange={(event) => updateField("vehicleModel", event.target.value)} /></label>
                            <label>Chassi / nº de série<input type="text" maxLength={30} value={form.vehicleChassis} onChange={(event) => updateField("vehicleChassis", event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())} /></label>
                            <label>Ano / modelo<input type="text" value={form.vehicleModelYear} placeholder="Ex.: 2020 / 2021" onChange={(event) => updateField("vehicleModelYear", event.target.value)} /></label>
                            <label>Combustível<input type="text" value={form.vehicleFuel} onChange={(event) => updateField("vehicleFuel", event.target.value)} /></label>
                            <label>Condição<select value={form.vehicleCondition} onChange={(event) => updateField("vehicleCondition", event.target.value)}><option value="">Não informado</option><option value="Novo">Novo</option><option value="Usado">Usado</option></select></label>
                            <label>Outros bens/garantias em anexo?<select value={form.otherAssetsAnnex} onChange={(event) => updateField("otherAssetsAnnex", event.target.value)}><option value="Não informado">Não informado</option><option value="Sim">Sim</option><option value="Não">Não</option></select></label>
                            <label className={styles.wideField}>Concessionária / loja<input type="text" value={form.dealerName} onChange={(event) => updateField("dealerName", event.target.value)} /></label>
                            <label>CNPJ/CPF da loja<input type="text" inputMode="numeric" value={form.dealerDocument} onChange={(event) => updateField("dealerDocument", formatDocumentInput(event.target.value))} /></label>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>Composição do financiamento</legend>
                        <div className={styles.formGrid}>
                            <label>
                                Valor do veículo
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.vehicleValue}
                                    placeholder="0,00"
                                    onChange={(event) =>
                                        updateMoneyField("vehicleValue", event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                Acessórios e serviços
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.accessoriesServices}
                                    placeholder="0,00"
                                    onChange={(event) =>
                                        updateMoneyField("accessoriesServices", event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                Entrada
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.downPayment}
                                    placeholder="0,00"
                                    onChange={(event) =>
                                        updateMoneyField("downPayment", event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                Valor líquido do crédito
                                <input type="text" inputMode="decimal" value={form.netCreditAmount} placeholder="0,00" onChange={(event) => updateMoneyField("netCreditAmount", event.target.value)} />
                            </label>
                            <label>
                                IPVA financiado
                                <input type="text" inputMode="decimal" value={form.ipva} placeholder="0,00" onChange={(event) => updateMoneyField("ipva", event.target.value)} />
                            </label>
                            <label>
                                Multas de trânsito
                                <input type="text" inputMode="decimal" value={form.trafficFines} placeholder="0,00" onChange={(event) => updateMoneyField("trafficFines", event.target.value)} />
                            </label>
                            <label>
                                Licenciamento
                                <input type="text" inputMode="decimal" value={form.licensing} placeholder="0,00" onChange={(event) => updateMoneyField("licensing", event.target.value)} />
                            </label>
                            <label>
                                Despachante
                                <input type="text" inputMode="decimal" value={form.dispatcherFee} placeholder="0,00" onChange={(event) => updateMoneyField("dispatcherFee", event.target.value)} />
                            </label>
                            <label>
                                Sub-total informado no contrato
                                <input type="text" inputMode="decimal" value={form.contractSubtotal} placeholder="0,00" onChange={(event) => updateMoneyField("contractSubtotal", event.target.value)} />
                            </label>
                            <label>
                                IOF total
                                <input type="text" inputMode="decimal" value={form.iof} placeholder="0,00" onChange={(event) => updateMoneyField("iof", event.target.value)} />
                            </label>
                            <label>
                                IOF financiado
                                <input type="text" inputMode="decimal" value={form.iofFinanced} placeholder="0,00" onChange={(event) => updateMoneyField("iofFinanced", event.target.value)} />
                            </label>
                            <label>
                                IOF adicional
                                <input type="text" inputMode="decimal" value={form.iofAdditional} placeholder="0,00" onChange={(event) => updateMoneyField("iofAdditional", event.target.value)} />
                            </label>
                            <label>
                                Total de impostos informado
                                <input type="text" inputMode="decimal" value={form.totalTaxes} placeholder="0,00" onChange={(event) => updateMoneyField("totalTaxes", event.target.value)} />
                            </label>
                            <label>
                                Tarifa de cadastro
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.cadastroFee}
                                    placeholder="0,00"
                                    onChange={(event) =>
                                        updateMoneyField("cadastroFee", event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                Avaliação do bem
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.appraisalFee}
                                    placeholder="0,00"
                                    onChange={(event) =>
                                        updateMoneyField("appraisalFee", event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                Total de tarifas informado
                                <input type="text" inputMode="decimal" value={form.totalFees} placeholder="0,00" onChange={(event) => updateMoneyField("totalFees", event.target.value)} />
                            </label>
                            <label>
                                Seguro prestamista
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.insurance}
                                    placeholder="0,00"
                                    onChange={(event) =>
                                        updateMoneyField("insurance", event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                Registro do contrato
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.contractRegistration}
                                    placeholder="0,00"
                                    onChange={(event) =>
                                        updateMoneyField("contractRegistration", event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                Registro de contrato em cartório
                                <input type="text" inputMode="decimal" value={form.notaryContractRegistration} placeholder="0,00" onChange={(event) => updateMoneyField("notaryContractRegistration", event.target.value)} />
                            </label>
                            <label>
                                Capitalização premiável
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.premiumInstallmentCapitalization}
                                    placeholder="0,00"
                                    onChange={(event) =>
                                        updateMoneyField("premiumInstallmentCapitalization", event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                Outros encargos financiados
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.otherFinancedCharges}
                                    placeholder="0,00"
                                    onChange={(event) =>
                                        updateMoneyField("otherFinancedCharges", event.target.value)
                                    }
                                />
                            </label>
                            <label className={styles.emphasisField}>
                                Capital total declarado
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.declaredFinancedCapital}
                                    placeholder="0,00"
                                    onChange={(event) =>
                                        updateMoneyField("declaredFinancedCapital", event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                Valor financiado com impostos
                                <input type="text" inputMode="decimal" value={form.financedWithTaxesAmount} placeholder="0,00" onChange={(event) => updateMoneyField("financedWithTaxesAmount", event.target.value)} />
                            </label>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>Condições de pagamento</legend>
                        <div className={styles.formGrid}>
                            <label>
                                Valor-base da parcela
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.installmentBaseValue}
                                    placeholder="0,00"
                                    onChange={(event) =>
                                        updateMoneyField("installmentBaseValue", event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                Tarifa do boleto
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.boletoFee}
                                    placeholder="0,00"
                                    onChange={(event) =>
                                        updateMoneyField("boletoFee", event.target.value)
                                    }
                                />
                            </label>
                            <label className={styles.emphasisField}>
                                Parcela total cobrada
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.chargedInstallment}
                                    placeholder="0,00"
                                    onChange={(event) =>
                                        updateMoneyField("chargedInstallment", event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                Quantidade de parcelas
                                <input
                                    type="number"
                                    min="1"
                                    max="1200"
                                    step="1"
                                    value={form.installments}
                                    onChange={(event) =>
                                        updateField("installments", event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                Parcelas intermediárias
                                <input type="text" inputMode="decimal" value={form.intermediateInstallmentsValue} placeholder="0,00" onChange={(event) => updateMoneyField("intermediateInstallmentsValue", event.target.value)} />
                            </label>
                            <label>
                                Valor total das parcelas
                                <input type="text" inputMode="decimal" value={form.totalInstallmentsValue} placeholder="0,00" onChange={(event) => updateMoneyField("totalInstallmentsValue", event.target.value)} />
                            </label>
                            <label>
                                Forma de pagamento
                                <input type="text" value={form.paymentMethod} placeholder="Ex.: Boleto/Carnê" onChange={(event) => updateField("paymentMethod", event.target.value)} />
                            </label>
                            <label>
                                Assinatura do contrato
                                <input
                                    type="date"
                                    value={form.signatureDate}
                                    onChange={(event) =>
                                        updateField("signatureDate", event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                Primeira prestação
                                <input
                                    type="date"
                                    value={form.firstDueDate}
                                    onChange={(event) =>
                                        updateField("firstDueDate", event.target.value)
                                    }
                                />
                            </label>
                            <label>
                                Vencimento final informado
                                <input
                                    type="date"
                                    value={form.finalDueDate}
                                    onChange={(event) =>
                                        updateField("finalDueDate", event.target.value)
                                    }
                                />
                            </label>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>Taxas pactuadas e CET</legend>
                        <div className={styles.formGrid}>
                            <label className={styles.emphasisField}>
                                Taxa mensal contratada
                                <div className={styles.percentField}>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.contractedMonthlyRatePercent}
                                        placeholder="0,00"
                                        onChange={(event) =>
                                            updateField(
                                                "contractedMonthlyRatePercent",
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <span>% a.m.</span>
                                </div>
                            </label>
                            <label>
                                Taxa anual contratada
                                <div className={styles.percentField}>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.contractedAnnualRatePercent}
                                        placeholder="0,00"
                                        onChange={(event) =>
                                            updateField(
                                                "contractedAnnualRatePercent",
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <span>% a.a.</span>
                                </div>
                            </label>
                            <label>
                                CET mensal
                                <div className={styles.percentField}>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.cetMonthlyRatePercent}
                                        placeholder="0,00"
                                        onChange={(event) =>
                                            updateField("cetMonthlyRatePercent", event.target.value)
                                        }
                                    />
                                    <span>% a.m.</span>
                                </div>
                            </label>
                            <label>
                                CET anual
                                <div className={styles.percentField}>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.cetAnnualRatePercent}
                                        placeholder="0,00"
                                        onChange={(event) =>
                                            updateField("cetAnnualRatePercent", event.target.value)
                                        }
                                    />
                                    <span>% a.a.</span>
                                </div>
                            </label>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>Seguro</legend>
                        <div className={styles.formGrid}>
                            <label>Seguro contratado<select value={form.insuranceContracted} onChange={(event) => updateField("insuranceContracted", event.target.value)}><option value="Não informado">Não informado</option><option value="Sim">Sim</option><option value="Não">Não</option></select></label>
                            <label>Forma de cobrança<input type="text" value={form.insuranceChargingMethod} placeholder="Ex.: Financiado" onChange={(event) => updateField("insuranceChargingMethod", event.target.value)} /></label>
                            <label className={styles.wideField}>Seguradora<input type="text" value={form.insurerName} onChange={(event) => updateField("insurerName", event.target.value)} /></label>
                            <label>CNPJ da seguradora<input type="text" inputMode="numeric" value={form.insurerDocument} onChange={(event) => updateField("insurerDocument", formatDocumentInput(event.target.value))} /></label>
                            <label>Número SUSEP<input type="text" value={form.susepNumber} onChange={(event) => updateField("susepNumber", event.target.value)} /></label>
                            <label>Proposta do seguro<input type="text" value={form.insuranceProposalNumber} onChange={(event) => updateField("insuranceProposalNumber", event.target.value)} /></label>
                            <label className={styles.wideField}>Produto / modalidade<input type="text" value={form.insuranceProductType} onChange={(event) => updateField("insuranceProductType", event.target.value)} /></label>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>Dados bancários</legend>
                        <div className={styles.formGrid}>
                            <label>Tipo de conta<input type="text" value={form.bankAccountType} onChange={(event) => updateField("bankAccountType", event.target.value)} /></label>
                            <label>Banco<input type="text" value={form.bankName} onChange={(event) => updateField("bankName", event.target.value)} /></label>
                            <label>Agência<input type="text" value={form.bankAgency} onChange={(event) => updateField("bankAgency", event.target.value)} /></label>
                            <label>Conta<input type="text" value={form.bankAccount} onChange={(event) => updateField("bankAccount", event.target.value)} /></label>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>Assinatura eletrônica</legend>
                        <div className={styles.formGrid}>
                            <label>Data e hora<input type="text" value={form.signatureDateTime} placeholder="Ex.: 01/11/2024 10:11:36" onChange={(event) => updateField("signatureDateTime", event.target.value)} /></label>
                            <label>Geolocalização<input type="text" value={form.signatureGeolocation} placeholder="Latitude, longitude" onChange={(event) => updateField("signatureGeolocation", event.target.value)} /></label>
                            <label>ID da sessão<input type="text" value={form.signatureSessionId} onChange={(event) => updateField("signatureSessionId", event.target.value)} /></label>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>Referência de mercado</legend>
                        <div className={styles.formGrid}>
                            <label>
                                Origem da taxa média
                                <select
                                    value={form.marketRateMode}
                                    onChange={(event) =>
                                        updateField(
                                            "marketRateMode",
                                            event.target.value as
                                            VehicleFinancingFormState["marketRateMode"],
                                        )
                                    }
                                >
                                    <option value="automatic">
                                        Consultar Banco Central
                                    </option>
                                    <option value="manual">
                                        Informar manualmente
                                    </option>
                                </select>
                            </label>
                            <label className={styles.emphasisField}>
                                Taxa média mensal
                                <div className={styles.percentField}>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.marketMonthlyRatePercent}
                                        placeholder={
                                            form.marketRateMode === "automatic"
                                                ? "Consultada ao analisar"
                                                : "0,00"
                                        }
                                        readOnly={form.marketRateMode === "automatic"}
                                        onChange={(event) =>
                                            updateField(
                                                "marketMonthlyRatePercent",
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <span>% a.m.</span>
                                </div>
                            </label>
                            <label>
                                Mês de referência
                                <input
                                    type="month"
                                    value={form.marketReferenceMonth}
                                    readOnly={form.marketRateMode === "automatic"}
                                    onChange={(event) =>
                                        updateField(
                                            "marketReferenceMonth",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <label>
                                Série ou identificação
                                <input
                                    type="text"
                                    value={form.marketSeriesCode}
                                    readOnly={form.marketRateMode === "automatic"}
                                    onChange={(event) =>
                                        updateField(
                                            "marketSeriesCode",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <label className={styles.marketSourceField}>
                                Fonte da taxa
                                <input
                                    type="text"
                                    value={form.marketSource}
                                    readOnly={form.marketRateMode === "automatic"}
                                    onChange={(event) =>
                                        updateField(
                                            "marketSource",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>
                        <label className={styles.fullField}>
                            Observações sobre a referência
                            <textarea
                                rows={3}
                                value={form.marketNotes}
                                placeholder="Registre a modalidade, a fonte consultada ou observações técnicas."
                                onChange={(event) =>
                                    updateField(
                                        "marketNotes",
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <div className={styles.marketReferenceNotice}>
                            {form.marketRateMode === "automatic"
                                ? "A taxa será consultada pela data de assinatura do contrato na série mensal de aquisição de veículos para pessoas físicas."
                                : "No modo manual, informe a taxa mensal, o mês de referência e a fonte documental utilizada."}
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>Encargos moratórios</legend>
                        <div className={styles.formGrid}>
                            <label>
                                Juros de mora
                                <div className={styles.percentField}>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.moraRatePercent}
                                        placeholder="0,00"
                                        onChange={(event) =>
                                            updateField("moraRatePercent", event.target.value)
                                        }
                                    />
                                    <span>%</span>
                                </div>
                            </label>
                            <label>
                                Multa moratória
                                <div className={styles.percentField}>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.fineRatePercent}
                                        placeholder="0,00"
                                        onChange={(event) =>
                                            updateField("fineRatePercent", event.target.value)
                                        }
                                    />
                                    <span>%</span>
                                </div>
                            </label>
                            <label>
                                Comissão de permanência
                                <div className={styles.percentField}>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.permanenceCommissionRatePercent}
                                        placeholder="0,00"
                                        onChange={(event) =>
                                            updateField(
                                                "permanenceCommissionRatePercent",
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <span>%</span>
                                </div>
                            </label>
                            <label>
                                Cláusula de capitalização
                                <select
                                    value={form.capitalizationClause}
                                    onChange={(event) =>
                                        updateField("capitalizationClause", event.target.value)
                                    }
                                >
                                    <option value="Não informado">Não informado</option>
                                    <option value="Sim">Sim</option>
                                    <option value="Não">Não</option>
                                </select>
                            </label>
                        </div>
                        <label className={styles.fullField}>
                            Observações do contrato
                            <textarea
                                rows={4}
                                value={form.contractNotes}
                                onChange={(event) =>
                                    updateField("contractNotes", event.target.value)
                                }
                            />
                        </label>
                    </fieldset>
                    {(errorMessage || marketRateError) && (
                        <div className={styles.formError} role="alert">
                            <CircleAlert size={20} />
                            <span>
                                {errorMessage || marketRateError}
                            </span>
                        </div>
                    )}
                    <div data-print-hidden="true" className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.exampleButton}
                            onClick={handleLoadExample}
                        >
                            <TestTube2 size={18} />
                            Carregar exemplo
                        </button>
                        <button
                            type="button"
                            className={styles.clearButton}
                            onClick={handleClear}
                        >
                            <RotateCcw size={18} />
                            Limpar
                        </button>
                        <button
                            type="submit"
                            className={styles.analyzeButton}
                            disabled={isLoadingMarketRate}
                        >
                            {isLoadingMarketRate ? (
                                <Loader2
                                    className={styles.spin}
                                    size={19}
                                />
                            ) : (
                                <Calculator size={19} />
                            )}
                            {isLoadingMarketRate
                                ? "Consultando Banco Central..."
                                : "Analisar financiamento"}
                        </button>
                    </div>
                </form>
            )}
            {analysis && step === 2 && (
                <div className={styles.resultSection}>
                    <section className={styles.resultHero}>
                        <div>
                            <span>Etapa 2</span>
                            <h2>Taxa efetivamente aplicada</h2>
                            <p>
                                Taxa encontrada a partir do capital financiado, da parcela
                                cobrada e da quantidade de prestações.
                            </p>
                        </div>
                        <div className={styles.resultHeroActions}>
                            <CheckCircle2 size={32} />
                            <button
                                type="button"
                                className={styles.printButton}
                                data-print-hidden="true"
                                onClick={() =>
                                    handlePrintSection("effective")
                                }
                            >
                                <Printer size={18} />
                                Imprimir / Salvar PDF
                            </button>
                        </div>
                    </section>
                    <div className={styles.summaryGrid}>
                        <SummaryItem
                            label="Capital utilizado"
                            value={formatCurrency(analysis.capitalComposition.principalUsed)}
                        />
                        <SummaryItem
                            label="Parcela cobrada"
                            value={formatCurrency(analysis.chargedInstallment)}
                        />
                        <SummaryItem
                            label="Taxa efetiva precisa"
                            value={`${formatRate(
                                analysis.effectiveMonthlyRatePercent,
                                8,
                            )}% a.m.`}
                            highlight
                        />
                        <SummaryItem
                            label="Taxa efetiva exibida"
                            value={`${formatRate(
                                analysis.effectiveMonthlyRatePercent,
                                2,
                            )}% a.m.`}
                        />
                        <SummaryItem
                            label="Taxa anual equivalente"
                            value={`${formatRate(
                                analysis.effectiveAnnualRatePercent,
                                6,
                            )}% a.a.`}
                        />
                        <SummaryItem
                            label="Total de juros"
                            value={formatCurrency(analysis.effectiveTotalInterest)}
                        />
                    </div>
                    {rateComparison && (
                        <section
                            className={`${styles.rateAlertCard} ${rateComparison.status === "higher"
                                ? styles.rateAlertHigher
                                : rateComparison.status === "lower"
                                    ? styles.rateAlertLower
                                    : styles.rateAlertEqual
                                }`}
                        >
                            <div className={styles.rateAlertTop}>
                                <div className={styles.rateAlertIcon}>
                                    {rateComparison.status === "equal" ? (
                                        <CheckCircle2 size={25} />
                                    ) : (
                                        <CircleAlert size={25} />
                                    )}
                                </div>
                                <div className={styles.rateAlertContent}>
                                    <span>Comparativo automático</span>
                                    <h3>{rateComparison.title}</h3>
                                    <p>{rateComparison.description}</p>
                                </div>
                                <strong className={styles.rateAlertBadge}>
                                    {rateComparison.badge}
                                </strong>
                            </div>
                            <div className={styles.rateAlertGrid}>
                                <div>
                                    <span>Taxa calculada</span>
                                    <strong>
                                        {formatRate(analysis.effectiveMonthlyRatePercent, 8)}% a.m.
                                    </strong>
                                </div>
                                <div>
                                    <span>Taxa contratada</span>
                                    <strong>
                                        {formatRate(analysis.contractedMonthlyRatePercent, 8)}% a.m.
                                    </strong>
                                </div>
                                <div>
                                    <span>Diferença em pontos percentuais</span>
                                    <strong>
                                        {rateComparison.differencePercentagePoints > 0
                                            ? "+"
                                            : rateComparison.differencePercentagePoints < 0
                                                ? "−"
                                                : ""}
                                        {formatRate(
                                            Math.abs(rateComparison.differencePercentagePoints),
                                            8,
                                        )}{" "}
                                        p.p.
                                    </strong>
                                </div>
                            </div>
                        </section>
                    )}
                    <ScheduleTable
                        title="Evolução conforme a taxa calculada"
                        description="Tabela Price reconstituída com a taxa que produz a parcela efetivamente cobrada."
                        rows={analysis.effectiveSchedule}
                        rateLabel={`${formatRate(
                            analysis.effectiveMonthlyRatePercent,
                            8,
                        )}% ao mês`}
                    />
                    <div data-print-hidden="true" className={styles.navigationActions}>
                        <button
                            type="button"
                            className={styles.previousButton}
                            onClick={() => goToStep(1)}
                        >
                            <ArrowLeft size={18} />
                            Contrato
                        </button>
                        <button
                            type="button"
                            className={styles.nextButton}
                            onClick={() => goToStep(3)}
                        >
                            Taxa contratada
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}
            {analysis && step === 3 && (
                <div className={styles.resultSection}>
                    <section className={styles.resultHero}>
                        <div>
                            <span>Etapa 3</span>
                            <h2>Evolução pela taxa contratada</h2>
                            <p>
                                Prestação e evolução Price recalculadas com a taxa mensal
                                expressamente informada no contrato.
                            </p>
                        </div>
                        <div className={styles.resultHeroActions}>
                            <FileSearch2 size={32} />
                            <button
                                type="button"
                                className={styles.printButton}
                                data-print-hidden="true"
                                onClick={() =>
                                    handlePrintSection("contracted")
                                }
                            >
                                <Printer size={18} />
                                Imprimir / Salvar PDF
                            </button>
                        </div>
                    </section>
                    <div className={styles.summaryGrid}>
                        <SummaryItem
                            label="Taxa contratada"
                            value={`${formatRate(
                                analysis.contractedMonthlyRatePercent,
                                6,
                            )}% a.m.`}
                        />
                        <SummaryItem
                            label="Taxa anual equivalente"
                            value={`${formatRate(
                                analysis.contractedEquivalentAnnualRatePercent,
                                6,
                            )}% a.a.`}
                        />
                        <SummaryItem
                            label="Parcela contratual"
                            value={formatCurrency(analysis.contractualInstallment)}
                            highlight
                        />
                        <SummaryItem
                            label="Total contratual"
                            value={formatCurrency(analysis.totalContractual)}
                        />
                        <SummaryItem
                            label="Juros contratuais"
                            value={formatCurrency(analysis.contractedTotalInterest)}
                        />
                        <SummaryItem
                            label="Vencimento final calculado"
                            value={formatDate(analysis.expectedFinalDueDate)}
                        />
                    </div>
                    <ScheduleTable
                        title="Evolução conforme a taxa contratada"
                        description="Tabela Price calculada pela taxa pactuada no instrumento contratual."
                        rows={analysis.contractedSchedule}
                        rateLabel={`${formatRate(
                            analysis.contractedMonthlyRatePercent,
                            6,
                        )}% ao mês`}
                    />
                    <div data-print-hidden="true" className={styles.navigationActions}>
                        <button
                            type="button"
                            className={styles.previousButton}
                            onClick={() => goToStep(2)}
                        >
                            <ArrowLeft size={18} />
                            Taxa calculada
                        </button>
                        <button
                            type="button"
                            className={styles.nextButton}
                            onClick={() => goToStep(4)}
                        >
                            Taxa média Bacen
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}
            {analysis && step === 4 && (
                <div
                    className={styles.resultSection}
                >
                    <section className={styles.resultHero}>
                        <div>
                            <span>Etapa 4</span>
                            <h2>
                                Taxa média de mercado —
                                Banco Central
                            </h2>
                            <p>
                                Evolução Price calculada com a taxa média mensal
                                adotada como referência para a modalidade e o
                                período do contrato.
                            </p>
                        </div>
                        <div className={styles.resultHeroActions}>
                            <Landmark size={32} />
                            <button
                                type="button"
                                className={styles.printButton}
                                data-print-hidden="true"
                                onClick={() =>
                                    handlePrintSection("market")
                                }
                            >
                                <Printer size={18} />
                                Imprimir / Salvar PDF
                            </button>
                        </div>
                    </section>
                    <div className={styles.summaryGrid}>
                        <SummaryItem
                            label="Taxa média mensal"
                            value={`${formatRate(
                                analysis.marketMonthlyRatePercent,
                                8,
                            )}% a.m.`}
                            highlight
                        />
                        <SummaryItem
                            label="Taxa anual equivalente"
                            value={`${formatRate(
                                analysis.marketEquivalentAnnualRatePercent,
                                6,
                            )}% a.a.`}
                        />
                        <SummaryItem
                            label="Parcela pela taxa média"
                            value={formatCurrency(
                                analysis.marketInstallment,
                            )}
                        />
                        <SummaryItem
                            label="Total pela taxa média"
                            value={formatCurrency(
                                analysis.totalMarket,
                            )}
                        />
                        <SummaryItem
                            label="Juros pela taxa média"
                            value={formatCurrency(
                                analysis.marketTotalInterest,
                            )}
                        />
                        <SummaryItem
                            label="Mês de referência"
                            value={formatReferenceMonth(
                                analysis.marketReferenceMonth,
                            )}
                        />
                        <SummaryItem
                            label="Diferença mensal cobrada"
                            value={formatCurrency(
                                analysis.marketDifferencePerInstallment,
                            )}
                            highlight
                        />
                        <SummaryItem
                            label="Diferença total estimada"
                            value={formatCurrency(
                                analysis.marketTotalDifference,
                            )}
                            highlight
                        />
                    </div>
                    {marketRateComparison && (
                        <section
                            className={`${styles.rateAlertCard} ${marketRateComparison.status === "higher"
                                ? styles.rateAlertHigher
                                : marketRateComparison.status === "lower"
                                    ? styles.rateAlertLower
                                    : styles.rateAlertEqual
                                }`}
                        >
                            <div className={styles.rateAlertTop}>
                                <div className={styles.rateAlertIcon}>
                                    {marketRateComparison.status === "equal" ? (
                                        <CheckCircle2 size={25} />
                                    ) : (
                                        <CircleAlert size={25} />
                                    )}
                                </div>
                                <div className={styles.rateAlertContent}>
                                    <span>
                                        Comparativo com a referência de mercado
                                    </span>
                                    <h3>
                                        {marketRateComparison.title}
                                    </h3>
                                    <p>
                                        {marketRateComparison.description}
                                    </p>
                                </div>
                                <strong className={styles.rateAlertBadge}>
                                    {marketRateComparison.badge}
                                </strong>
                            </div>
                            <div className={styles.rateAlertGrid}>
                                <div>
                                    <span>Taxa efetivamente aplicada</span>
                                    <strong>
                                        {formatRate(
                                            analysis.effectiveMonthlyRatePercent,
                                            8,
                                        )}% a.m.
                                    </strong>
                                </div>
                                <div>
                                    <span>Taxa média de mercado</span>
                                    <strong>
                                        {formatRate(
                                            analysis.marketMonthlyRatePercent,
                                            8,
                                        )}% a.m.
                                    </strong>
                                </div>
                                <div>
                                    <span>Diferença em pontos percentuais</span>
                                    <strong>
                                        {marketRateComparison.differencePercentagePoints > 0
                                            ? "+"
                                            : marketRateComparison.differencePercentagePoints < 0
                                                ? "−"
                                                : ""}
                                        {formatRate(
                                            Math.abs(
                                                marketRateComparison.differencePercentagePoints,
                                            ),
                                            8,
                                        )}{" "}
                                        p.p.
                                    </strong>
                                </div>
                            </div>
                        </section>
                    )}
                    <section className={styles.marketSourceCard}>
                        <div>
                            <span>Fonte da referência</span>
                            <h3>{analysis.marketSource}</h3>
                            <p>
                                Série ou identificação:{" "}
                                <strong>{analysis.marketSeriesCode}</strong>
                                {" · "}
                                mês de referência:{" "}
                                <strong>
                                    {formatReferenceMonth(
                                        analysis.marketReferenceMonth,
                                    )}
                                </strong>
                                {" · "}
                                consulta registrada em:{" "}
                                <strong>
                                    {formatDateTime(
                                        analysis.marketRetrievedAt,
                                    )}
                                </strong>
                            </p>
                            {analysis.marketNotes && (
                                <small>
                                    {analysis.marketNotes}
                                </small>
                            )}
                        </div>
                        {form.marketRateMode === "automatic" && (
                            <button
                                type="button"
                                className={styles.refreshMarketButton}
                                data-print-hidden="true"
                                disabled={isLoadingMarketRate}
                                onClick={handleRefreshMarketRate}
                            >
                                {isLoadingMarketRate ? (
                                    <Loader2
                                        className={styles.spin}
                                        size={18}
                                    />
                                ) : (
                                    <RotateCcw size={18} />
                                )}
                                {isLoadingMarketRate
                                    ? "Consultando..."
                                    : "Atualizar taxa Bacen"}
                            </button>
                        )}
                    </section>
                    {marketRateError && (
                        <div className={styles.formError} role="alert">
                            <CircleAlert size={20} />
                            <span>{marketRateError}</span>
                        </div>
                    )}
                    <ScheduleTable
                        title="Evolução conforme a taxa média de mercado"
                        description="Tabela Price calculada com a referência mensal selecionada para comparação técnica."
                        rows={analysis.marketSchedule}
                        rateLabel={`${formatRate(
                            analysis.marketMonthlyRatePercent,
                            8,
                        )}% ao mês`}
                    />
                    <div
                        data-print-hidden="true"
                        className={styles.navigationActions}
                    >
                        <button
                            type="button"
                            className={styles.previousButton}
                            onClick={() => goToStep(3)}
                        >
                            <ArrowLeft size={18} />
                            Taxa contratada
                        </button>
                        <button
                            type="button"
                            className={styles.nextButton}
                            onClick={() => goToStep(5)}
                        >
                            Comparar os cenários
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}
            {analysis && step === 5 && (
                <div className={styles.resultSection}>
                    <section className={styles.resultHero}>
                        <div>
                            <span>Etapa 5</span>
                            <h2>Diferença das prestações</h2>
                            <p>
                                Comparação entre o valor cobrado, a taxa contratada e a taxa média de mercado.
                            </p>
                        </div>
                        <div className={styles.resultHeroActions}>
                            <Calculator size={32} />
                            <button
                                type="button"
                                className={styles.printButton}
                                data-print-hidden="true"
                                onClick={() =>
                                    handlePrintSection("differences")
                                }
                            >
                                <Printer size={18} />
                                Imprimir / Salvar PDF
                            </button>
                        </div>
                    </section>
                    <div className={styles.summaryGrid}>
                        <SummaryItem
                            label="Taxa contratada"
                            value={`${formatRate(
                                analysis.contractedMonthlyRatePercent,
                                6,
                            )}% a.m.`}
                        />
                        <SummaryItem
                            label="Taxa média de mercado"
                            value={`${formatRate(
                                analysis.marketMonthlyRatePercent,
                                6,
                            )}% a.m.`}
                        />
                        <SummaryItem
                            label="Taxa efetivamente aplicada"
                            value={`${formatRate(
                                analysis.effectiveMonthlyRatePercent,
                                8,
                            )}% a.m.`}
                        />
                        <SummaryItem
                            label="Parcela contratual"
                            value={formatCurrency(
                                analysis.contractualInstallment,
                            )}
                        />
                        <SummaryItem
                            label="Parcela pela taxa média"
                            value={formatCurrency(
                                analysis.marketInstallment,
                            )}
                        />
                        <SummaryItem
                            label="Parcela cobrada"
                            value={formatCurrency(
                                analysis.chargedInstallment,
                            )}
                        />
                        <SummaryItem
                            label="Diferença cobrada × contratada"
                            value={formatCurrency(
                                analysis.differencePerInstallment,
                            )}
                            highlight
                        />
                        <SummaryItem
                            label="Diferença cobrada × mercado"
                            value={formatCurrency(
                                analysis.marketDifferencePerInstallment,
                            )}
                            highlight
                        />
                        <SummaryItem
                            label="Total cobrado"
                            value={formatCurrency(
                                analysis.totalCharged,
                            )}
                        />
                        <SummaryItem
                            label="Total contratual"
                            value={formatCurrency(
                                analysis.totalContractual,
                            )}
                        />
                        <SummaryItem
                            label="Total pela taxa média"
                            value={formatCurrency(
                                analysis.totalMarket,
                            )}
                        />
                        <SummaryItem
                            label="Diferença total × mercado"
                            value={formatCurrency(
                                analysis.marketTotalDifference,
                            )}
                            highlight
                        />
                    </div>
                    {analysis.warnings.length > 0 && (
                        <section className={styles.warningCard}>
                            <CircleAlert size={22} />
                            <div>
                                <strong>Avisos da análise</strong>
                                <ul>
                                    {analysis.warnings.map((warning) => (
                                        <li key={warning}>{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    )}
                    <section className={styles.tableCard}>
                        <div className={styles.tableHeader}>
                            <div>
                                <span>Comparação dos três cenários</span>
                                <h3>Diferenças por prestação</h3>
                                <p>
                                    Comparação entre a prestação cobrada, a prestação
                                    calculada pela taxa contratada e a prestação calculada
                                    pela taxa média de mercado.
                                </p>
                            </div>
                            <TableProperties size={25} />
                        </div>
                        <div className={styles.tableWrapper}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nº</th>
                                        <th>Vencimento</th>
                                        <th>Parcela contratual</th>
                                        <th>Parcela mercado</th>
                                        <th>Parcela cobrada</th>
                                        <th>Dif. cobrada × contratada</th>
                                        <th>Dif. cobrada × mercado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analysis.comparison.map((row) => (
                                        <tr key={row.installmentNumber}>
                                            <td>{row.installmentNumber}</td>
                                            <td>{formatDate(row.dueDate)}</td>
                                            <td>
                                                {formatCurrency(
                                                    row.contractualPayment,
                                                )}
                                            </td>
                                            <td>
                                                {formatCurrency(
                                                    row.marketPayment,
                                                )}
                                            </td>
                                            <td>
                                                {formatCurrency(
                                                    row.chargedPayment,
                                                )}
                                            </td>
                                            <td
                                                className={
                                                    row.differenceChargedVsContracted > 0
                                                        ? styles.positiveDifference
                                                        : styles.negativeDifference
                                                }
                                            >
                                                {formatCurrency(
                                                    row.differenceChargedVsContracted,
                                                )}
                                            </td>
                                            <td
                                                className={
                                                    row.differenceChargedVsMarket > 0
                                                        ? styles.positiveDifference
                                                        : styles.negativeDifference
                                                }
                                            >
                                                {formatCurrency(
                                                    row.differenceChargedVsMarket,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={2}>Totais</td>
                                        <td>
                                            {formatCurrency(
                                                analysis.totalContractual,
                                            )}
                                        </td>
                                        <td>
                                            {formatCurrency(
                                                analysis.totalMarket,
                                            )}
                                        </td>
                                        <td>
                                            {formatCurrency(
                                                analysis.totalCharged,
                                            )}
                                        </td>
                                        <td>
                                            {formatCurrency(
                                                analysis.totalDifference,
                                            )}
                                        </td>
                                        <td>
                                            {formatCurrency(
                                                analysis.marketTotalDifference,
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>
                    <section data-print-hidden="true" className={styles.saveCard}>
                        <div>
                            <span>Memória profissional</span>
                            <h3>Salvar análise no histórico</h3>
                            <p>
                                O contrato, os resultados, as fórmulas e todas as prestações
                                serão preservados na revisão.
                            </p>
                        </div>
                        <SaveCalculationModal
                            calculationType="ANALISE_FINANCIAMENTO_VEICULO"
                            defaultTitle={`Análise de Financiamento de Veículo${titleSuffix}`}
                            defaultDescription="Comparação entre a taxa efetivamente aplicada, a taxa contratada e a taxa média de mercado em financiamento de veículo."
                            engineVersion="vehicle-financing-1.1.0"
                            input={{
                                ...form,
                            }}
                            result={{
                                capitalComposition:
                                    analysis.capitalComposition,
                                effectiveMonthlyRate:
                                    analysis.effectiveMonthlyRate,
                                effectiveMonthlyRatePercent:
                                    analysis.effectiveMonthlyRatePercent,
                                effectiveAnnualRatePercent:
                                    analysis.effectiveAnnualRatePercent,
                                contractedMonthlyRate:
                                    analysis.contractedMonthlyRate,
                                contractedMonthlyRatePercent:
                                    analysis.contractedMonthlyRatePercent,
                                contractedEquivalentAnnualRatePercent:
                                    analysis.contractedEquivalentAnnualRatePercent,
                                marketMonthlyRate:
                                    analysis.marketMonthlyRate,
                                marketMonthlyRatePercent:
                                    analysis.marketMonthlyRatePercent,
                                marketEquivalentAnnualRatePercent:
                                    analysis.marketEquivalentAnnualRatePercent,
                                marketReferenceMonth:
                                    analysis.marketReferenceMonth,
                                marketSeriesCode:
                                    analysis.marketSeriesCode,
                                marketSource:
                                    analysis.marketSource,
                                marketRetrievedAt:
                                    analysis.marketRetrievedAt,
                                marketNotes:
                                    analysis.marketNotes,
                                chargedInstallment:
                                    analysis.chargedInstallment,
                                contractualInstallment:
                                    analysis.contractualInstallment,
                                marketInstallment:
                                    analysis.marketInstallment,
                                differencePerInstallment:
                                    analysis.differencePerInstallment,
                                marketDifferencePerInstallment:
                                    analysis.marketDifferencePerInstallment,
                                contractedVsMarketDifferencePerInstallment:
                                    analysis.contractedVsMarketDifferencePerInstallment,
                                totalCharged:
                                    analysis.totalCharged,
                                totalContractual:
                                    analysis.totalContractual,
                                totalMarket:
                                    analysis.totalMarket,
                                totalDifference:
                                    analysis.totalDifference,
                                marketTotalDifference:
                                    analysis.marketTotalDifference,
                                contractedVsMarketTotalDifference:
                                    analysis.contractedVsMarketTotalDifference,
                                effectiveTotalInterest:
                                    analysis.effectiveTotalInterest,
                                contractedTotalInterest:
                                    analysis.contractedTotalInterest,
                                marketTotalInterest:
                                    analysis.marketTotalInterest,
                                totalInterestDifference:
                                    analysis.totalInterestDifference,
                                effectiveVsMarketInterestDifference:
                                    analysis.effectiveVsMarketInterestDifference,
                                contractedVsMarketInterestDifference:
                                    analysis.contractedVsMarketInterestDifference,
                                effectiveVsMarketRateDifferencePercentagePoints:
                                    analysis.effectiveVsMarketRateDifferencePercentagePoints,
                                contractedVsMarketRateDifferencePercentagePoints:
                                    analysis.contractedVsMarketRateDifferencePercentagePoints,
                                effectiveVsMarketRateRelativePercent:
                                    analysis.effectiveVsMarketRateRelativePercent,
                                expectedFinalDueDate:
                                    analysis.expectedFinalDueDate,
                            }}
                            premises={{
                                amortizationSystem:
                                    "Sistema Francês de Amortização — Tabela Price",
                                periodicity:
                                    "Prestações mensais.",
                                paymentDates:
                                    "Considera-se o pagamento na mesma data do vencimento para fins das tabelas comparativas.",
                                precision:
                                    "Os cálculos são mantidos com precisão interna e arredondados apenas para apresentação.",
                                principalRule:
                                    "Quando informado, o capital total declarado no contrato é utilizado como principal da operação.",
                                marketReference:
                                    "A taxa média de mercado é utilizada como referência técnica comparativa e não constitui, isoladamente, conclusão jurídica sobre abusividade.",
                            }}
                            methodology={{
                                effectiveRate:
                                    "A taxa efetiva é encontrada numericamente a partir do capital financiado, da parcela cobrada e da quantidade de prestações.",
                                contractedScenario:
                                    "A parcela contratual é calculada pela fórmula do Sistema Price usando a taxa mensal pactuada.",
                                marketScenario:
                                    "A parcela de mercado é calculada pela fórmula do Sistema Price usando a taxa média mensal informada ou consultada no Banco Central.",
                                comparison:
                                    "Cada prestação cobrada é comparada com as prestações calculadas pela taxa contratada e pela taxa média de mercado.",
                                totalDifference:
                                    "As diferenças totais correspondem à soma das diferenças por prestação com precisão interna.",
                            }}
                            formulas={{
                                effectiveRate:
                                    "i = TAXA(n; PMT; PV)",
                                pricePayment:
                                    "PMT = PV × i ÷ [1 − (1 + i)⁻ⁿ]",
                                interest:
                                    "Juros = Saldo inicial × taxa",
                                amortization:
                                    "Amortização = Parcela − Juros",
                                closingBalance:
                                    "Saldo final = Saldo inicial − Amortização",
                                contractedDifference:
                                    "Diferença contratual = Parcela cobrada − Parcela pela taxa contratada",
                                marketDifference:
                                    "Diferença de mercado = Parcela cobrada − Parcela pela taxa média",
                                totalDifference:
                                    "Diferença total = soma das diferenças das prestações",
                            }}
                            summary={{
                                operationNumber:
                                    form.operationNumber,
                                principalUsed:
                                    analysis.capitalComposition.principalUsed,
                                installments:
                                    analysis.comparison.length,
                                contractedMonthlyRatePercent:
                                    analysis.contractedMonthlyRatePercent,
                                effectiveMonthlyRatePercent:
                                    analysis.effectiveMonthlyRatePercent,
                                marketMonthlyRatePercent:
                                    analysis.marketMonthlyRatePercent,
                                marketReferenceMonth:
                                    analysis.marketReferenceMonth,
                                marketSeriesCode:
                                    analysis.marketSeriesCode,
                                marketSource:
                                    analysis.marketSource,
                                chargedInstallment:
                                    analysis.chargedInstallment,
                                contractualInstallment:
                                    analysis.contractualInstallment,
                                marketInstallment:
                                    analysis.marketInstallment,
                                differencePerInstallment:
                                    analysis.differencePerInstallment,
                                marketDifferencePerInstallment:
                                    analysis.marketDifferencePerInstallment,
                                totalDifference:
                                    analysis.totalDifference,
                                marketTotalDifference:
                                    analysis.marketTotalDifference,
                                totalCharged:
                                    analysis.totalCharged,
                                totalContractual:
                                    analysis.totalContractual,
                                totalMarket:
                                    analysis.totalMarket,
                            }}
                            warnings={{
                                items:
                                    analysis.warnings,
                            }}
                            lines={saveLines}
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
                            onRevisionSaved={(version) =>
                                setReopenedCalculation(
                                    (current) =>
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
                    </section>
                    <div data-print-hidden="true" className={styles.navigationActions}>
                        <button
                            type="button"
                            className={styles.previousButton}
                            onClick={() => goToStep(4)}
                        >
                            <ArrowLeft size={18} />
                            Taxa média Bacen
                        </button>
                        <button
                            type="button"
                            className={styles.restartButton}
                            onClick={() => goToStep(1)}
                        >
                            <RotateCcw size={18} />
                            Revisar contrato
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}