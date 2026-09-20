// src/lib/financial-analysis/vehicle-financing.engine.ts

import { addMonthsClamped, compareIsoDates, getExpectedFinalDueDate, isValidIsoDate } from "./vehicle-financing.dates";
import type {
    VehicleFinancingAnalysisResult,
    VehicleFinancingFormState,
    VehicleFinancingInput,
    VehicleFinancingMarketRateMode,
    VehicleFinancingScheduleRow,
} from "./vehicle-financing.types";

const RATE_TOLERANCE = 0.000000000000001;
const MONEY_TOLERANCE = 0.00000001;

export function parseLocalizedNumber(value: string) {
    const cleaned = value.trim().replace(/\s/g, "").replace(/R\$/gi, "").replace(/%/g, "");
    if (!cleaned) return 0;
    const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
    return Number(normalized);
}

function parseOptionalNumber(value: string) {
    if (!value.trim()) return null;
    const parsed = parseLocalizedNumber(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function assertFiniteNonNegative(value: number, label: string) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${label} deve ser um número igual ou maior que zero.`);
}

function assertFinitePositive(value: number, label: string) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} deve ser maior que zero.`);
}

function isMarketRateMode(value: string): value is VehicleFinancingMarketRateMode {
    return value === "automatic" || value === "manual";
}

function calculatePricePayment(principal: number, rate: number, installments: number) {
    if (rate === 0) return principal / installments;
    return principal * (rate / (1 - Math.pow(1 + rate, -installments)));
}

function calculateRateFromPayment(principal: number, payment: number, installments: number) {
    const paymentWithoutInterest = principal / installments;
    if (payment < paymentWithoutInterest - MONEY_TOLERANCE) {
        throw new Error("A parcela cobrada é insuficiente para amortizar o capital dentro da quantidade de parcelas informada.");
    }
    if (Math.abs(payment - paymentWithoutInterest) <= MONEY_TOLERANCE) return 0;

    let lowerRate = 0;
    let upperRate = 0.01;
    while (calculatePricePayment(principal, upperRate, installments) < payment && upperRate < 100) upperRate *= 2;
    if (calculatePricePayment(principal, upperRate, installments) < payment) {
        throw new Error("Não foi possível encontrar uma taxa compatível com os dados informados.");
    }

    for (let iteration = 0; iteration < 250; iteration += 1) {
        const middleRate = (lowerRate + upperRate) / 2;
        const calculatedPayment = calculatePricePayment(principal, middleRate, installments);
        if (Math.abs(calculatedPayment - payment) < RATE_TOLERANCE) return middleRate;
        if (calculatedPayment > payment) upperRate = middleRate;
        else lowerRate = middleRate;
    }
    return (lowerRate + upperRate) / 2;
}

function calculateEquivalentAnnualRate(monthlyRate: number) {
    return (Math.pow(1 + monthlyRate, 12) - 1) * 100;
}

function buildPriceSchedule({ principal, payment, rate, installments, firstDueDate }: {
    principal: number;
    payment: number;
    rate: number;
    installments: number;
    firstDueDate: string;
}) {
    const rows: VehicleFinancingScheduleRow[] = [];
    let balance = principal;

    for (let installmentNumber = 1; installmentNumber <= installments; installmentNumber += 1) {
        const openingBalance = balance;
        const interest = openingBalance * rate;
        let currentPayment = payment;
        let amortization = currentPayment - interest;

        if (amortization <= 0) throw new Error("A parcela informada não é suficiente para amortizar o financiamento.");
        if (installmentNumber === installments || amortization > openingBalance) {
            amortization = openingBalance;
            currentPayment = interest + amortization;
        }

        balance = openingBalance - amortization;
        if (Math.abs(balance) < MONEY_TOLERANCE) balance = 0;
        const dueDate = addMonthsClamped(firstDueDate, installmentNumber - 1);

        rows.push({
            installmentNumber,
            remainingInstallments: installments - installmentNumber + 1,
            dueDate,
            paymentDate: dueDate,
            openingBalance,
            rate,
            interest,
            amortization,
            payment: currentPayment,
            closingBalance: Math.max(0, balance),
        });
    }
    return rows;
}

function sumScheduleField(schedule: VehicleFinancingScheduleRow[], field: "payment" | "interest" | "amortization") {
    return schedule.reduce((total, row) => total + row[field], 0);
}

export function createVehicleFinancingInput(form: VehicleFinancingFormState): VehicleFinancingInput {
    const text = (value: string) => value.trim();
    const money = (value: string) => parseLocalizedNumber(value);
    const marketRateMode = isMarketRateMode(form.marketRateMode) ? form.marketRateMode : "automatic";

    const input: VehicleFinancingInput = {
        contractType: text(form.contractType),
        operationType: text(form.operationType),
        operationNumber: text(form.operationNumber),
        amortizationSystem: text(form.amortizationSystem) || "Tabela Price",
        contractIssuePlace: text(form.contractIssuePlace),
        proposalValidity: text(form.proposalValidity),
        correspondentName: text(form.correspondentName),
        correspondentDocument: text(form.correspondentDocument),

        creditorName: text(form.creditorName),
        creditorDocument: text(form.creditorDocument),
        creditorAddress: text(form.creditorAddress),

        clientName: text(form.clientName),
        clientDocument: text(form.clientDocument),
        clientPhone: text(form.clientPhone),
        clientMobile: text(form.clientMobile),
        clientEmail: text(form.clientEmail),
        clientAddress: text(form.clientAddress),
        clientCity: text(form.clientCity),
        clientState: text(form.clientState),
        clientZipCode: text(form.clientZipCode),

        guarantors: text(form.guarantors),
        otherGuarantorsAnnex: text(form.otherGuarantorsAnnex),

        vehicleBrand: text(form.vehicleBrand),
        vehicleModel: text(form.vehicleModel),
        vehicleChassis: text(form.vehicleChassis),
        vehicleModelYear: text(form.vehicleModelYear),
        vehicleFuel: text(form.vehicleFuel),
        vehicleCondition: text(form.vehicleCondition),
        otherAssetsAnnex: text(form.otherAssetsAnnex),
        dealerName: text(form.dealerName),
        dealerDocument: text(form.dealerDocument),

        vehicleValue: money(form.vehicleValue),
        accessoriesServices: money(form.accessoriesServices),
        downPayment: money(form.downPayment),
        netCreditAmount: money(form.netCreditAmount),
        ipva: money(form.ipva),
        trafficFines: money(form.trafficFines),
        licensing: money(form.licensing),
        dispatcherFee: money(form.dispatcherFee),
        contractSubtotal: money(form.contractSubtotal),

        iof: money(form.iof),
        iofFinanced: money(form.iofFinanced),
        iofAdditional: money(form.iofAdditional),
        totalTaxes: money(form.totalTaxes),
        iofBreakdownProvided: Boolean(form.iofFinanced.trim() || form.iofAdditional.trim()),
        cadastroFee: money(form.cadastroFee),
        appraisalFee: money(form.appraisalFee),
        totalFees: money(form.totalFees),
        insurance: money(form.insurance),
        contractRegistration: money(form.contractRegistration),
        notaryContractRegistration: money(form.notaryContractRegistration),
        premiumInstallmentCapitalization: money(form.premiumInstallmentCapitalization),
        otherFinancedCharges: money(form.otherFinancedCharges),
        declaredFinancedCapital: money(form.declaredFinancedCapital),
        financedWithTaxesAmount: money(form.financedWithTaxesAmount),

        installmentBaseValue: money(form.installmentBaseValue),
        boletoFee: money(form.boletoFee),
        chargedInstallment: money(form.chargedInstallment),
        installments: Number(form.installments),
        intermediateInstallmentsValue: money(form.intermediateInstallmentsValue),
        totalInstallmentsValue: money(form.totalInstallmentsValue),
        paymentMethod: text(form.paymentMethod),

        signatureDate: form.signatureDate,
        firstDueDate: form.firstDueDate,
        finalDueDate: form.finalDueDate || null,

        contractedMonthlyRatePercent: money(form.contractedMonthlyRatePercent),
        contractedAnnualRatePercent: parseOptionalNumber(form.contractedAnnualRatePercent),
        cetMonthlyRatePercent: parseOptionalNumber(form.cetMonthlyRatePercent),
        cetAnnualRatePercent: parseOptionalNumber(form.cetAnnualRatePercent),

        insuranceContracted: text(form.insuranceContracted),
        insuranceChargingMethod: text(form.insuranceChargingMethod),
        insurerName: text(form.insurerName),
        insurerDocument: text(form.insurerDocument),
        susepNumber: text(form.susepNumber),
        insuranceProposalNumber: text(form.insuranceProposalNumber),
        insuranceProductType: text(form.insuranceProductType),

        bankAccountType: text(form.bankAccountType),
        bankName: text(form.bankName),
        bankAgency: text(form.bankAgency),
        bankAccount: text(form.bankAccount),

        signatureDateTime: text(form.signatureDateTime),
        signatureGeolocation: text(form.signatureGeolocation),
        signatureSessionId: text(form.signatureSessionId),

        moraRatePercent: parseOptionalNumber(form.moraRatePercent),
        fineRatePercent: parseOptionalNumber(form.fineRatePercent),
        permanenceCommissionRatePercent: parseOptionalNumber(form.permanenceCommissionRatePercent),
        capitalizationClause: form.capitalizationClause,
        contractNotes: text(form.contractNotes),

        marketRateMode,
        marketMonthlyRatePercent: money(form.marketMonthlyRatePercent),
        marketReferenceMonth: text(form.marketReferenceMonth),
        marketSeriesCode: text(form.marketSeriesCode),
        marketSource: text(form.marketSource),
        marketRetrievedAt: text(form.marketRetrievedAt) || null,
        marketNotes: text(form.marketNotes),
    };

    validateVehicleFinancingInput(input);
    return input;
}

function validateVehicleFinancingInput(input: VehicleFinancingInput) {
    assertFinitePositive(input.vehicleValue, "O valor do veículo");
    [
        [input.accessoriesServices, "O valor dos acessórios e serviços"],
        [input.downPayment, "O valor da entrada"],
        [input.netCreditAmount, "O valor líquido do crédito"],
        [input.ipva, "O IPVA"],
        [input.trafficFines, "As multas de trânsito"],
        [input.licensing, "O licenciamento"],
        [input.dispatcherFee, "O despachante"],
        [input.contractSubtotal, "O sub-total do contrato"],
        [input.iof, "O IOF total"],
        [input.iofFinanced, "O IOF financiado"],
        [input.iofAdditional, "O IOF adicional"],
        [input.totalTaxes, "O total de impostos"],
        [input.cadastroFee, "A tarifa de cadastro"],
        [input.appraisalFee, "A tarifa de avaliação"],
        [input.totalFees, "O total de tarifas"],
        [input.insurance, "O seguro"],
        [input.contractRegistration, "O registro do contrato"],
        [input.notaryContractRegistration, "O registro em cartório"],
        [input.premiumInstallmentCapitalization, "A capitalização premiável"],
        [input.otherFinancedCharges, "Os demais encargos"],
        [input.declaredFinancedCapital, "O capital financiado declarado"],
        [input.financedWithTaxesAmount, "O valor financiado com impostos"],
        [input.installmentBaseValue, "O valor-base da parcela"],
        [input.boletoFee, "A tarifa do boleto"],
        [input.intermediateInstallmentsValue, "O valor das parcelas intermediárias"],
        [input.totalInstallmentsValue, "O valor total das parcelas"],
    ].forEach(([value, label]) => assertFiniteNonNegative(value as number, label as string));

    assertFinitePositive(input.chargedInstallment, "A parcela total cobrada");
    if (!Number.isInteger(input.installments) || input.installments <= 0 || input.installments > 1200) {
        throw new Error("A quantidade de parcelas deve ser um número inteiro entre 1 e 1.200.");
    }
    assertFiniteNonNegative(input.contractedMonthlyRatePercent, "A taxa mensal contratada");
    assertFinitePositive(input.marketMonthlyRatePercent, "A taxa média mensal de mercado");

    if (!/^\d{4}-\d{2}$/.test(input.marketReferenceMonth)) {
        throw new Error("Informe o mês de referência da taxa média no formato AAAA-MM.");
    }
    if (!input.marketSource) throw new Error("Informe a fonte da taxa média de mercado.");
    if (!isValidIsoDate(input.signatureDate)) throw new Error("Informe uma data válida para a assinatura do contrato.");
    if (!isValidIsoDate(input.firstDueDate)) throw new Error("Informe uma data válida para a primeira prestação.");
    if (compareIsoDates(input.firstDueDate, input.signatureDate) < 0) {
        throw new Error("A primeira prestação não pode vencer antes da assinatura do contrato.");
    }
    if (input.finalDueDate && !isValidIsoDate(input.finalDueDate)) {
        throw new Error("Informe uma data válida para o vencimento final.");
    }
}

export function analyzeVehicleFinancing(input: VehicleFinancingInput): VehicleFinancingAnalysisResult {
    const calculatedBaseFinancing = input.vehicleValue + input.accessoriesServices - input.downPayment;
    const baseFinancing = input.netCreditAmount > 0 ? input.netCreditAmount : calculatedBaseFinancing;
    if (baseFinancing <= 0) throw new Error("O valor-base do financiamento deve ser maior que zero.");

    const totalIofUsed = input.iofBreakdownProvided ? input.iofFinanced + input.iofAdditional : input.iof;
    const calculatedFinancedCapital =
        baseFinancing + input.ipva + input.trafficFines + input.licensing + input.dispatcherFee + totalIofUsed +
        input.cadastroFee + input.appraisalFee + input.insurance + input.contractRegistration + input.notaryContractRegistration +
        input.premiumInstallmentCapitalization + input.otherFinancedCharges;

    const principalUsed = input.declaredFinancedCapital > 0 ? input.declaredFinancedCapital : calculatedFinancedCapital;
    assertFinitePositive(principalUsed, "O capital total financiado");

    const effectiveMonthlyRate = calculateRateFromPayment(principalUsed, input.chargedInstallment, input.installments);
    const contractedMonthlyRate = input.contractedMonthlyRatePercent / 100;
    const marketMonthlyRate = input.marketMonthlyRatePercent / 100;
    const contractualInstallment = calculatePricePayment(principalUsed, contractedMonthlyRate, input.installments);
    const marketInstallment = calculatePricePayment(principalUsed, marketMonthlyRate, input.installments);

    const effectiveSchedule = buildPriceSchedule({ principal: principalUsed, payment: input.chargedInstallment, rate: effectiveMonthlyRate, installments: input.installments, firstDueDate: input.firstDueDate });
    const contractedSchedule = buildPriceSchedule({ principal: principalUsed, payment: contractualInstallment, rate: contractedMonthlyRate, installments: input.installments, firstDueDate: input.firstDueDate });
    const marketSchedule = buildPriceSchedule({ principal: principalUsed, payment: marketInstallment, rate: marketMonthlyRate, installments: input.installments, firstDueDate: input.firstDueDate });

    const comparison = effectiveSchedule.map((effectiveRow, index) => {
        const contractedRow = contractedSchedule[index];
        const marketRow = marketSchedule[index];
        const differenceChargedVsContracted = effectiveRow.payment - contractedRow.payment;
        return {
            installmentNumber: effectiveRow.installmentNumber,
            dueDate: effectiveRow.dueDate,
            paymentDate: effectiveRow.paymentDate,
            contractualPayment: contractedRow.payment,
            marketPayment: marketRow.payment,
            chargedPayment: effectiveRow.payment,
            differenceChargedVsContracted,
            differenceChargedVsMarket: effectiveRow.payment - marketRow.payment,
            differenceContractedVsMarket: contractedRow.payment - marketRow.payment,
            difference: differenceChargedVsContracted,
        };
    });

    const totalCharged = sumScheduleField(effectiveSchedule, "payment");
    const totalContractual = sumScheduleField(contractedSchedule, "payment");
    const totalMarket = sumScheduleField(marketSchedule, "payment");
    const effectiveTotalInterest = sumScheduleField(effectiveSchedule, "interest");
    const contractedTotalInterest = sumScheduleField(contractedSchedule, "interest");
    const marketTotalInterest = sumScheduleField(marketSchedule, "interest");
    const totalDifference = comparison.reduce((total, row) => total + row.differenceChargedVsContracted, 0);
    const marketTotalDifference = comparison.reduce((total, row) => total + row.differenceChargedVsMarket, 0);
    const contractedVsMarketTotalDifference = comparison.reduce((total, row) => total + row.differenceContractedVsMarket, 0);

    const expectedFinalDueDate = getExpectedFinalDueDate(input.firstDueDate, input.installments);
    const effectiveMonthlyRatePercent = effectiveMonthlyRate * 100;
    const effectiveAnnualRatePercent = calculateEquivalentAnnualRate(effectiveMonthlyRate);
    const contractedEquivalentAnnualRatePercent = calculateEquivalentAnnualRate(contractedMonthlyRate);
    const marketEquivalentAnnualRatePercent = calculateEquivalentAnnualRate(marketMonthlyRate);
    const capitalDifference = input.declaredFinancedCapital > 0 ? input.declaredFinancedCapital - calculatedFinancedCapital : 0;
    const effectiveVsMarketRateDifferencePercentagePoints = effectiveMonthlyRatePercent - input.marketMonthlyRatePercent;
    const contractedVsMarketRateDifferencePercentagePoints = input.contractedMonthlyRatePercent - input.marketMonthlyRatePercent;
    const effectiveVsMarketRateRelativePercent = input.marketMonthlyRatePercent > 0
        ? (effectiveVsMarketRateDifferencePercentagePoints / input.marketMonthlyRatePercent) * 100
        : null;

    const warnings: string[] = [];
    if (input.netCreditAmount > 0 && Math.abs(input.netCreditAmount - calculatedBaseFinancing) > 0.01) {
        warnings.push(`O valor líquido do crédito difere de valor do veículo + acessórios − entrada em ${(input.netCreditAmount - calculatedBaseFinancing).toFixed(2)}.`);
    }
    if (input.iofBreakdownProvided && input.iof > 0 && Math.abs(input.iof - totalIofUsed) > 0.01) {
        warnings.push(`O IOF total informado difere da soma do IOF financiado e do IOF adicional em ${(input.iof - totalIofUsed).toFixed(2)}.`);
    }
    const calculatedContractSubtotal = input.vehicleValue + input.accessoriesServices + input.ipva + input.trafficFines + input.licensing + input.dispatcherFee + input.insurance + input.contractRegistration + input.notaryContractRegistration;
    if (input.contractSubtotal > 0 && Math.abs(input.contractSubtotal - calculatedContractSubtotal) > 0.01) {
        warnings.push(`O sub-total informado difere da soma dos componentes anteriores à entrada em ${(input.contractSubtotal - calculatedContractSubtotal).toFixed(2)}.`);
    }
    if (input.totalTaxes > 0 && Math.abs(input.totalTaxes - totalIofUsed) > 0.01) {
        warnings.push(`O total de impostos informado difere do IOF utilizado em ${(input.totalTaxes - totalIofUsed).toFixed(2)}.`);
    }
    const calculatedFees = input.cadastroFee + input.appraisalFee;
    if (input.totalFees > 0 && Math.abs(input.totalFees - calculatedFees) > 0.01) {
        warnings.push(`O total de tarifas informado difere da soma das tarifas de cadastro e avaliação em ${(input.totalFees - calculatedFees).toFixed(2)}.`);
    }
    if (input.financedWithTaxesAmount > 0 && input.declaredFinancedCapital > 0 && Math.abs(input.financedWithTaxesAmount - input.declaredFinancedCapital) > 0.01) {
        warnings.push(`O valor financiado com impostos difere do valor total do crédito em ${(input.financedWithTaxesAmount - input.declaredFinancedCapital).toFixed(2)}.`);
    }
    if (input.declaredFinancedCapital > 0 && Math.abs(capitalDifference) > 0.01) {
        warnings.push(`O capital total declarado difere da composição calculada em ${capitalDifference.toFixed(2)}.`);
    }
    if (input.totalInstallmentsValue > 0 && Math.abs(input.totalInstallmentsValue - totalCharged) > 0.01) {
        warnings.push(`O valor total das parcelas informado difere do total reconstruído em ${(input.totalInstallmentsValue - totalCharged).toFixed(2)}.`);
    }
    if (input.finalDueDate && input.finalDueDate !== expectedFinalDueDate) {
        warnings.push(`O vencimento final informado (${input.finalDueDate}) não corresponde ao vencimento calculado (${expectedFinalDueDate}).`);
    }
    if (input.contractedAnnualRatePercent !== null && Math.abs(input.contractedAnnualRatePercent - contractedEquivalentAnnualRatePercent) > 0.05) {
        warnings.push("A taxa anual contratada não corresponde exatamente à equivalência composta da taxa mensal informada.");
    }
    if (input.cetMonthlyRatePercent !== null && input.cetAnnualRatePercent !== null) {
        const equivalentCetAnnual = calculateEquivalentAnnualRate(input.cetMonthlyRatePercent / 100);
        if (Math.abs(input.cetAnnualRatePercent - equivalentCetAnnual) > 0.05) {
            warnings.push("O CET anual informado não corresponde exatamente à equivalência composta do CET mensal.");
        }
    }
    if (effectiveMonthlyRatePercent > input.contractedMonthlyRatePercent) {
        warnings.push("A taxa efetivamente encontrada é superior à taxa mensal contratada.");
    }
    if (effectiveMonthlyRatePercent > input.marketMonthlyRatePercent) {
        warnings.push("A taxa efetivamente encontrada é superior à taxa média de mercado adotada como referência. Essa comparação, isoladamente, não constitui conclusão jurídica sobre abusividade.");
    }
    if (totalDifference < -0.01) warnings.push("A parcela cobrada é inferior à parcela calculada pela taxa contratada.");

    return {
        capitalComposition: {
            baseFinancing,
            calculatedFinancedCapital,
            declaredFinancedCapital: input.declaredFinancedCapital,
            principalUsed,
            capitalDifference,
            totalIofUsed,
        },
        effectiveMonthlyRate,
        effectiveMonthlyRatePercent,
        effectiveAnnualRatePercent,
        contractedMonthlyRate,
        contractedMonthlyRatePercent: input.contractedMonthlyRatePercent,
        contractedEquivalentAnnualRatePercent,
        marketMonthlyRate,
        marketMonthlyRatePercent: input.marketMonthlyRatePercent,
        marketEquivalentAnnualRatePercent,
        marketReferenceMonth: input.marketReferenceMonth,
        marketSeriesCode: input.marketSeriesCode,
        marketSource: input.marketSource,
        marketRetrievedAt: input.marketRetrievedAt,
        marketNotes: input.marketNotes,
        chargedInstallment: input.chargedInstallment,
        contractualInstallment,
        marketInstallment,
        differencePerInstallment: input.chargedInstallment - contractualInstallment,
        marketDifferencePerInstallment: input.chargedInstallment - marketInstallment,
        contractedVsMarketDifferencePerInstallment: contractualInstallment - marketInstallment,
        totalCharged,
        totalContractual,
        totalMarket,
        totalDifference,
        marketTotalDifference,
        contractedVsMarketTotalDifference,
        effectiveTotalInterest,
        contractedTotalInterest,
        marketTotalInterest,
        totalInterestDifference: effectiveTotalInterest - contractedTotalInterest,
        effectiveVsMarketInterestDifference: effectiveTotalInterest - marketTotalInterest,
        contractedVsMarketInterestDifference: contractedTotalInterest - marketTotalInterest,
        effectiveVsMarketRateDifferencePercentagePoints,
        contractedVsMarketRateDifferencePercentagePoints,
        effectiveVsMarketRateRelativePercent,
        expectedFinalDueDate,
        effectiveSchedule,
        contractedSchedule,
        marketSchedule,
        comparison,
        warnings,
    };
}