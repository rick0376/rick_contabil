// src/lib/financial-analysis/vehicle-financing.types.ts

export type VehicleFinancingMarketRateMode = "automatic" | "manual";

export type VehicleFinancingFormState = {
    contractType: string;
    operationType: string;
    operationNumber: string;
    amortizationSystem: string;
    contractIssuePlace: string;
    proposalValidity: string;
    correspondentName: string;
    correspondentDocument: string;

    creditorName: string;
    creditorDocument: string;
    creditorAddress: string;

    clientName: string;
    clientDocument: string;
    clientPhone: string;
    clientMobile: string;
    clientEmail: string;
    clientAddress: string;
    clientCity: string;
    clientState: string;
    clientZipCode: string;

    guarantors: string;
    otherGuarantorsAnnex: string;

    vehicleBrand: string;
    vehicleModel: string;
    vehicleChassis: string;
    vehicleModelYear: string;
    vehicleFuel: string;
    vehicleCondition: string;
    otherAssetsAnnex: string;
    dealerName: string;
    dealerDocument: string;

    vehicleValue: string;
    accessoriesServices: string;
    downPayment: string;
    netCreditAmount: string;
    ipva: string;
    trafficFines: string;
    licensing: string;
    dispatcherFee: string;
    contractSubtotal: string;

    iof: string;
    iofFinanced: string;
    iofAdditional: string;
    totalTaxes: string;
    cadastroFee: string;
    appraisalFee: string;
    totalFees: string;
    insurance: string;
    contractRegistration: string;
    notaryContractRegistration: string;
    premiumInstallmentCapitalization: string;
    otherFinancedCharges: string;
    declaredFinancedCapital: string;
    financedWithTaxesAmount: string;

    installmentBaseValue: string;
    boletoFee: string;
    chargedInstallment: string;
    installments: string;
    intermediateInstallmentsValue: string;
    totalInstallmentsValue: string;
    paymentMethod: string;

    signatureDate: string;
    firstDueDate: string;
    finalDueDate: string;

    contractedMonthlyRatePercent: string;
    contractedAnnualRatePercent: string;
    cetMonthlyRatePercent: string;
    cetAnnualRatePercent: string;

    insuranceContracted: string;
    insuranceChargingMethod: string;
    insurerName: string;
    insurerDocument: string;
    susepNumber: string;
    insuranceProposalNumber: string;
    insuranceProductType: string;

    bankAccountType: string;
    bankName: string;
    bankAgency: string;
    bankAccount: string;

    signatureDateTime: string;
    signatureGeolocation: string;
    signatureSessionId: string;

    moraRatePercent: string;
    fineRatePercent: string;
    permanenceCommissionRatePercent: string;
    capitalizationClause: string;
    contractNotes: string;

    marketRateMode: VehicleFinancingMarketRateMode;
    marketMonthlyRatePercent: string;
    marketReferenceMonth: string;
    marketSeriesCode: string;
    marketSource: string;
    marketRetrievedAt: string;
    marketNotes: string;
};

export type VehicleFinancingInput = {
    contractType: string;
    operationType: string;
    operationNumber: string;
    amortizationSystem: string;
    contractIssuePlace: string;
    proposalValidity: string;
    correspondentName: string;
    correspondentDocument: string;

    creditorName: string;
    creditorDocument: string;
    creditorAddress: string;

    clientName: string;
    clientDocument: string;
    clientPhone: string;
    clientMobile: string;
    clientEmail: string;
    clientAddress: string;
    clientCity: string;
    clientState: string;
    clientZipCode: string;

    guarantors: string;
    otherGuarantorsAnnex: string;

    vehicleBrand: string;
    vehicleModel: string;
    vehicleChassis: string;
    vehicleModelYear: string;
    vehicleFuel: string;
    vehicleCondition: string;
    otherAssetsAnnex: string;
    dealerName: string;
    dealerDocument: string;

    vehicleValue: number;
    accessoriesServices: number;
    downPayment: number;
    netCreditAmount: number;
    ipva: number;
    trafficFines: number;
    licensing: number;
    dispatcherFee: number;
    contractSubtotal: number;

    iof: number;
    iofFinanced: number;
    iofAdditional: number;
    totalTaxes: number;
    iofBreakdownProvided: boolean;
    cadastroFee: number;
    appraisalFee: number;
    totalFees: number;
    insurance: number;
    contractRegistration: number;
    notaryContractRegistration: number;
    premiumInstallmentCapitalization: number;
    otherFinancedCharges: number;
    declaredFinancedCapital: number;
    financedWithTaxesAmount: number;

    installmentBaseValue: number;
    boletoFee: number;
    chargedInstallment: number;
    installments: number;
    intermediateInstallmentsValue: number;
    totalInstallmentsValue: number;
    paymentMethod: string;

    signatureDate: string;
    firstDueDate: string;
    finalDueDate: string | null;

    contractedMonthlyRatePercent: number;
    contractedAnnualRatePercent: number | null;
    cetMonthlyRatePercent: number | null;
    cetAnnualRatePercent: number | null;

    insuranceContracted: string;
    insuranceChargingMethod: string;
    insurerName: string;
    insurerDocument: string;
    susepNumber: string;
    insuranceProposalNumber: string;
    insuranceProductType: string;

    bankAccountType: string;
    bankName: string;
    bankAgency: string;
    bankAccount: string;

    signatureDateTime: string;
    signatureGeolocation: string;
    signatureSessionId: string;

    moraRatePercent: number | null;
    fineRatePercent: number | null;
    permanenceCommissionRatePercent: number | null;
    capitalizationClause: string;
    contractNotes: string;

    marketRateMode: VehicleFinancingMarketRateMode;
    marketMonthlyRatePercent: number;
    marketReferenceMonth: string;
    marketSeriesCode: string;
    marketSource: string;
    marketRetrievedAt: string | null;
    marketNotes: string;
};

export type VehicleFinancingScheduleRow = {
    installmentNumber: number;
    remainingInstallments: number;
    dueDate: string;
    paymentDate: string;
    openingBalance: number;
    rate: number;
    interest: number;
    amortization: number;
    payment: number;
    closingBalance: number;
};

export type VehicleFinancingComparisonRow = {
    installmentNumber: number;
    dueDate: string;
    paymentDate: string;
    contractualPayment: number;
    marketPayment: number;
    chargedPayment: number;
    differenceChargedVsContracted: number;
    differenceChargedVsMarket: number;
    differenceContractedVsMarket: number;
    /** Mantido por compatibilidade com revisões anteriores. */
    difference: number;
};

export type VehicleFinancingCapitalComposition = {
    baseFinancing: number;
    calculatedFinancedCapital: number;
    declaredFinancedCapital: number;
    principalUsed: number;
    capitalDifference: number;
    totalIofUsed: number;
};

export type VehicleFinancingAnalysisResult = {
    capitalComposition: VehicleFinancingCapitalComposition;
    effectiveMonthlyRate: number;
    effectiveMonthlyRatePercent: number;
    effectiveAnnualRatePercent: number;
    contractedMonthlyRate: number;
    contractedMonthlyRatePercent: number;
    contractedEquivalentAnnualRatePercent: number;
    marketMonthlyRate: number;
    marketMonthlyRatePercent: number;
    marketEquivalentAnnualRatePercent: number;
    marketReferenceMonth: string;
    marketSeriesCode: string;
    marketSource: string;
    marketRetrievedAt: string | null;
    marketNotes: string;
    chargedInstallment: number;
    contractualInstallment: number;
    marketInstallment: number;
    differencePerInstallment: number;
    marketDifferencePerInstallment: number;
    contractedVsMarketDifferencePerInstallment: number;
    totalCharged: number;
    totalContractual: number;
    totalMarket: number;
    totalDifference: number;
    marketTotalDifference: number;
    contractedVsMarketTotalDifference: number;
    effectiveTotalInterest: number;
    contractedTotalInterest: number;
    marketTotalInterest: number;
    totalInterestDifference: number;
    effectiveVsMarketInterestDifference: number;
    contractedVsMarketInterestDifference: number;
    effectiveVsMarketRateDifferencePercentagePoints: number;
    contractedVsMarketRateDifferencePercentagePoints: number;
    effectiveVsMarketRateRelativePercent: number | null;
    expectedFinalDueDate: string;
    effectiveSchedule: VehicleFinancingScheduleRow[];
    contractedSchedule: VehicleFinancingScheduleRow[];
    marketSchedule: VehicleFinancingScheduleRow[];
    comparison: VehicleFinancingComparisonRow[];
    warnings: string[];
};