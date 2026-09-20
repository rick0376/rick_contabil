// src/lib/reports/expert-report.service.ts

import {
    AuditAction,
    ExpertReportRevisionStatus,
    ExpertReportStatus,
    Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
    createIntegrityHash,
    type CanonicalJson,
    toCanonicalJson,
} from "./expert-report-hash";
import {
    type ExpertReportCreateInput,
} from "./expert-report.schema";
import {
    buildInitialExpertReportSections,
    EXPERT_REPORT_TEMPLATE_VERSION,
} from "./expert-report-template";

type CreateReportRequestMetadata = {
    ipAddress?: string | null;
    userAgent?: string | null;
};

type CreateExpertReportOptions = {
    userId: string;
    input: ExpertReportCreateInput;
    requestMetadata?: CreateReportRequestMetadata;
};

export class ExpertReportServiceError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(
        message: string,
        status: number,
        code: string,
    ) {
        super(message);

        this.name =
            "ExpertReportServiceError";

        this.status = status;
        this.code = code;
    }
}

function parseDate(
    value: string | undefined,
) {
    if (!value) {
        return null;
    }

    return new Date(
        `${value}T12:00:00.000Z`,
    );
}

function formatDateInput(
    value: Date | null,
) {
    if (!value) {
        return null;
    }

    return value
        .toISOString()
        .slice(0, 10);
}

function nullableJson(
    value: CanonicalJson | null,
):
    | Prisma.InputJsonValue
    | Prisma.NullableJsonNullValueInput {
    return value === null
        ? Prisma.JsonNull
        : (value as Prisma.InputJsonValue);
}

function requiredJson(
    value: CanonicalJson,
) {
    return value as Prisma.InputJsonValue;
}

function getDefaultPlace(
    professionalProfile: {
        city: string | null;
        state: string | null;
    } | null,
) {
    if (!professionalProfile) {
        return null;
    }

    return [
        professionalProfile.city,
        professionalProfile.state,
    ]
        .filter(Boolean)
        .join(" - ") || null;
}

function getDefaultTitle(
    calculationTitle: string | null,
    calculationType: string,
) {
    const sourceTitle =
        calculationTitle ??
        calculationType;

    return `Laudo Pericial Contábil - ${sourceTitle}`;
}

export async function createExpertReportFromCalculation({
    userId,
    input,
    requestMetadata,
}: CreateExpertReportOptions) {
    const calculation =
        await prisma.calculation.findFirst({
            where: {
                id: input.calculationId,
                userId,
                deletedAt: null,
            },

            include: {
                user: {
                    include: {
                        professionalProfile:
                            true,
                    },
                },

                client: {
                    include: {
                        addresses: {
                            orderBy: [
                                {
                                    isPrimary:
                                        "desc",
                                },
                                {
                                    createdAt:
                                        "asc",
                                },
                            ],
                        },
                    },
                },

                legalProcess: {
                    include: {
                        parties: {
                            orderBy: [
                                {
                                    isPrimary:
                                        "desc",
                                },
                                {
                                    createdAt:
                                        "asc",
                                },
                            ],

                            include: {
                                client: {
                                    include: {
                                        addresses:
                                        {
                                            orderBy:
                                                [
                                                    {
                                                        isPrimary:
                                                            "desc",
                                                    },
                                                    {
                                                        createdAt:
                                                            "asc",
                                                    },
                                                ],
                                        },
                                    },
                                },
                            },
                        },

                        questions: {
                            orderBy: [
                                {
                                    origin:
                                        "asc",
                                },
                                {
                                    sequence:
                                        "asc",
                                },
                            ],
                        },

                        documents: {
                            where: {
                                deletedAt:
                                    null,
                            },

                            orderBy: {
                                createdAt:
                                    "asc",
                            },
                        },
                    },
                },

                revisions: {
                    where:
                        input.calculationVersion
                            ? {
                                version:
                                    input.calculationVersion,
                            }
                            : undefined,

                    orderBy: {
                        version: "desc",
                    },

                    take: 1,

                    include: {
                        lines: {
                            orderBy: {
                                sequence:
                                    "asc",
                            },
                        },
                    },
                },
            },
        });

    if (!calculation) {
        throw new ExpertReportServiceError(
            "Cálculo não encontrado.",
            404,
            "CALCULATION_NOT_FOUND",
        );
    }

    const calculationRevision =
        calculation.revisions[0];

    if (!calculationRevision) {
        throw new ExpertReportServiceError(
            input.calculationVersion
                ? `A versão ${input.calculationVersion} do cálculo não foi encontrada.`
                : "O cálculo ainda não possui uma revisão disponível.",
            404,
            "CALCULATION_REVISION_NOT_FOUND",
        );
    }

    const professionalProfile =
        calculation.user
            .professionalProfile;

    const referenceDate =
        parseDate(
            input.referenceDate,
        ) ??
        calculationRevision.referenceDate ??
        calculation.referenceDate;

    const reportTitle =
        input.title ??
        getDefaultTitle(
            calculation.title,
            calculation.type,
        );

    const reportPurpose =
        input.purpose ??
        calculation.legalProcess
            ?.expertiseObject ??
        calculation.description ??
        "Apresentar a metodologia, as fórmulas e a memória de cálculo utilizadas na apuração contábil.";

    const reportPlace =
        input.place ??
        getDefaultPlace(
            professionalProfile,
        );

    const clientSnapshot =
        calculation.client
            ? toCanonicalJson({
                id: calculation.client.id,
                type: calculation.client.type,
                name: calculation.client.name,
                tradeName:
                    calculation.client
                        .tradeName,
                documentNumber:
                    calculation.client
                        .documentNumber,
                secondaryDocument:
                    calculation.client
                        .secondaryDocument,
                stateRegistration:
                    calculation.client
                        .stateRegistration,
                email:
                    calculation.client.email,
                phone:
                    calculation.client.phone,
                mobile:
                    calculation.client.mobile,
                addresses:
                    calculation.client
                        .addresses,
            })
            : null;

    const legalProcessSnapshot =
        calculation.legalProcess
            ? toCanonicalJson({
                id: calculation.legalProcess
                    .id,
                caseNumber:
                    calculation.legalProcess
                        .caseNumber,
                title:
                    calculation.legalProcess
                        .title,
                court:
                    calculation.legalProcess
                        .court,
                courtDivision:
                    calculation.legalProcess
                        .courtDivision,
                district:
                    calculation.legalProcess
                        .district,
                city:
                    calculation.legalProcess
                        .city,
                state:
                    calculation.legalProcess
                        .state,
                actionClass:
                    calculation.legalProcess
                        .actionClass,
                subject:
                    calculation.legalProcess
                        .subject,
                expertiseObject:
                    calculation.legalProcess
                        .expertiseObject,
                appointmentDate:
                    calculation.legalProcess
                        .appointmentDate,
                deadlineDate:
                    calculation.legalProcess
                        .deadlineDate,
                referenceDate:
                    calculation.legalProcess
                        .referenceDate,
                status:
                    calculation.legalProcess
                        .status,
                notes:
                    calculation.legalProcess
                        .notes,
                parties:
                    calculation.legalProcess
                        .parties.map(
                            (party) => ({
                                id: party.id,
                                role: party.role,
                                isPrimary:
                                    party.isPrimary,
                                notes:
                                    party.notes,
                                client: {
                                    id: party
                                        .client
                                        .id,
                                    type: party
                                        .client
                                        .type,
                                    name: party
                                        .client
                                        .name,
                                    tradeName:
                                        party
                                            .client
                                            .tradeName,
                                    documentNumber:
                                        party
                                            .client
                                            .documentNumber,
                                    addresses:
                                        party
                                            .client
                                            .addresses,
                                },
                            }),
                        ),
            })
            : null;

    const professionalSnapshot =
        professionalProfile
            ? toCanonicalJson({
                fullName:
                    professionalProfile
                        .fullName,
                cpf:
                    professionalProfile.cpf,
                crcNumber:
                    professionalProfile
                        .crcNumber,
                crcState:
                    professionalProfile
                        .crcState,
                crcCategory:
                    professionalProfile
                        .crcCategory,
                businessName:
                    professionalProfile
                        .businessName,
                email:
                    professionalProfile
                        .email,
                phone:
                    professionalProfile
                        .phone,
                whatsapp:
                    professionalProfile
                        .whatsapp,
                addressLine:
                    professionalProfile
                        .addressLine,
                addressNumber:
                    professionalProfile
                        .addressNumber,
                addressComplement:
                    professionalProfile
                        .addressComplement,
                district:
                    professionalProfile
                        .district,
                city:
                    professionalProfile
                        .city,
                state:
                    professionalProfile
                        .state,
                zipCode:
                    professionalProfile
                        .zipCode,
                reportClosingText:
                    professionalProfile
                        .reportClosingText,
                signatureName:
                    professionalProfile
                        .signatureName,
                signatureTitle:
                    professionalProfile
                        .signatureTitle,
            })
            : toCanonicalJson({
                fullName:
                    calculation.user.name,
                username:
                    calculation.user
                        .username,
            });

    const questionsSnapshot =
        toCanonicalJson(
            calculation.legalProcess
                ?.questions.map(
                    (question) => ({
                        id: question.id,
                        origin:
                            question.origin,
                        sequence:
                            question.sequence,
                        question:
                            question.question,
                        answer:
                            question.answer,
                        answeredAt:
                            question.answeredAt,
                    }),
                ) ?? [],
        );

    const sourceDocumentsSnapshot =
        toCanonicalJson(
            calculation.legalProcess
                ?.documents.map(
                    (document) => ({
                        id: document.id,
                        title:
                            document.title,
                        category:
                            document.category,
                        fileName:
                            document.fileName,
                        mimeType:
                            document.mimeType,
                        sizeBytes:
                            document.sizeBytes,
                        integrityHash:
                            document.integrityHash,
                        documentDate:
                            document.documentDate,
                        notes:
                            document.notes,
                    }),
                ) ?? [],
        );

    const revisionInput =
        toCanonicalJson(
            calculationRevision.input,
        );

    const revisionPremises =
        calculationRevision.premises
            ? toCanonicalJson(
                calculationRevision.premises,
            )
            : null;

    const revisionMethodology =
        calculationRevision.methodology
            ? toCanonicalJson(
                calculationRevision.methodology,
            )
            : null;

    const revisionFormulas =
        calculationRevision.formulas
            ? toCanonicalJson(
                calculationRevision.formulas,
            )
            : null;

    const revisionResult =
        toCanonicalJson(
            calculationRevision.result,
        );

    const revisionSummary =
        calculationRevision.summary
            ? toCanonicalJson(
                calculationRevision.summary,
            )
            : null;

    const revisionWarnings =
        calculationRevision.warnings
            ? toCanonicalJson(
                calculationRevision.warnings,
            )
            : null;

    const revisionLines =
        toCanonicalJson(
            calculationRevision.lines,
        );

    const calculationSnapshot =
        toCanonicalJson({
            calculation: {
                id: calculation.id,
                type: calculation.type,
                title: calculation.title,
                description:
                    calculation.description,
                status:
                    calculation.status,
                referenceDate:
                    calculation.referenceDate,
                currency:
                    calculation.currency,
                currentVersion:
                    calculation.currentVersion,
                clientId:
                    calculation.clientId,
                legalProcessId:
                    calculation.legalProcessId,
            },

            revision: {
                id: calculationRevision.id,
                version:
                    calculationRevision
                        .version,
                status:
                    calculationRevision
                        .status,
                engineVersion:
                    calculationRevision
                        .engineVersion,
                referenceDate:
                    calculationRevision
                        .referenceDate,
                input: revisionInput,
                premises:
                    revisionPremises,
                methodology:
                    revisionMethodology,
                formulas:
                    revisionFormulas,
                result:
                    revisionResult,
                summary:
                    revisionSummary,
                warnings:
                    revisionWarnings,
                notes:
                    calculationRevision
                        .notes,
                integrityHash:
                    calculationRevision
                        .integrityHash,
                finalizedAt:
                    calculationRevision
                        .finalizedAt,
                createdAt:
                    calculationRevision
                        .createdAt,
                lines: revisionLines,
            },
        });

    const sourceSnapshot =
        toCanonicalJson({
            calculationId:
                calculation.id,

            calculationRevisionId:
                calculationRevision.id,

            calculationVersion:
                calculationRevision.version,

            calculationType:
                calculation.type,

            calculationIntegrityHash:
                calculationRevision
                    .integrityHash,

            engineVersion:
                calculationRevision
                    .engineVersion,

            referenceDate,

            templateVersion:
                EXPERT_REPORT_TEMPLATE_VERSION,
        });

    const sections =
        buildInitialExpertReportSections({
            reportTitle,
            reportNumber:
                input.reportNumber ??
                null,
            purpose: reportPurpose,
            referenceDate:
                formatDateInput(
                    referenceDate,
                ),
            place: reportPlace,

            calculation: {
                id: calculation.id,
                type: calculation.type,
                title:
                    calculation.title,
                description:
                    calculation.description,
                currency:
                    calculation.currency,
            },

            revision: {
                id: calculationRevision.id,
                version:
                    calculationRevision
                        .version,
                engineVersion:
                    calculationRevision
                        .engineVersion,
                integrityHash:
                    calculationRevision
                        .integrityHash,
                input: revisionInput,
                premises:
                    revisionPremises,
                methodology:
                    revisionMethodology,
                formulas:
                    revisionFormulas,
                result:
                    revisionResult,
                summary:
                    revisionSummary,
                warnings:
                    revisionWarnings,
                lines: revisionLines,
            },

            clientSnapshot,
            legalProcessSnapshot,
            professionalSnapshot,
            questionsSnapshot,
            sourceDocumentsSnapshot,
        });

    const reportIntegrityHash =
        createIntegrityHash({
            templateVersion:
                EXPERT_REPORT_TEMPLATE_VERSION,

            version: 1,

            status:
                ExpertReportRevisionStatus.DRAFT,

            title: reportTitle,

            reportNumber:
                input.reportNumber ??
                null,

            purpose: reportPurpose,

            referenceDate,

            place: reportPlace,

            sourceSnapshot,
            clientSnapshot,
            legalProcessSnapshot,
            professionalSnapshot,
            questionsSnapshot,
            sourceDocumentsSnapshot,

            calculationSnapshot,

            sections: sections.map(
                (section) => ({
                    type: section.type,
                    title: section.title,
                    plainText:
                        section.plainText,
                    content:
                        section.content,
                    position:
                        section.position,
                    isVisible:
                        section.isVisible,
                    isAutoGenerated:
                        section.isAutoGenerated,
                }),
            ),
        });

    return prisma.$transaction(
        async (transaction) => {
            const report =
                await transaction.expertReport.create(
                    {
                        data: {
                            userId,

                            legalProcessId:
                                calculation.legalProcessId,

                            clientId:
                                calculation.clientId,

                            title:
                                reportTitle,

                            reportNumber:
                                input.reportNumber ??
                                null,

                            status:
                                ExpertReportStatus.DRAFT,

                            purpose:
                                reportPurpose,

                            referenceDate,

                            place:
                                reportPlace,

                            currentVersion: 1,

                            calculationLinks: {
                                create: {
                                    calculationId:
                                        calculation.id,

                                    calculationRevisionId:
                                        calculationRevision.id,

                                    position: 0,

                                    notes:
                                        "Cálculo de origem da primeira revisão do laudo.",
                                },
                            },
                        },
                    },
                );

            const reportRevision =
                await transaction.expertReportRevision.create(
                    {
                        data: {
                            expertReportId:
                                report.id,

                            createdById:
                                userId,

                            version: 1,

                            status:
                                ExpertReportRevisionStatus.DRAFT,

                            title:
                                reportTitle,

                            reportNumber:
                                input.reportNumber ??
                                null,

                            purpose:
                                reportPurpose,

                            referenceDate,

                            place:
                                reportPlace,

                            templateVersion:
                                EXPERT_REPORT_TEMPLATE_VERSION,

                            sourceSnapshot:
                                requiredJson(
                                    sourceSnapshot,
                                ),

                            clientSnapshot:
                                nullableJson(
                                    clientSnapshot,
                                ),

                            legalProcessSnapshot:
                                nullableJson(
                                    legalProcessSnapshot,
                                ),

                            professionalSnapshot:
                                nullableJson(
                                    professionalSnapshot,
                                ),

                            questionsSnapshot:
                                nullableJson(
                                    questionsSnapshot,
                                ),

                            sourceDocumentsSnapshot:
                                nullableJson(
                                    sourceDocumentsSnapshot,
                                ),

                            integrityHash:
                                reportIntegrityHash,

                            notes:
                                input.notes ??
                                null,

                            sections: {
                                create: sections.map(
                                    (
                                        section,
                                    ) => ({
                                        type: section.type,

                                        title:
                                            section.title,

                                        plainText:
                                            section.plainText,

                                        content:
                                            nullableJson(
                                                section.content,
                                            ),

                                        position:
                                            section.position,

                                        isVisible:
                                            section.isVisible,

                                        isAutoGenerated:
                                            section.isAutoGenerated,
                                    }),
                                ),
                            },

                            calculationLinks: {
                                create: {
                                    calculationId:
                                        calculation.id,

                                    calculationRevisionId:
                                        calculationRevision.id,

                                    position: 0,

                                    notes:
                                        "Snapshot imutável do cálculo utilizado nesta revisão.",

                                    snapshot:
                                        requiredJson(
                                            calculationSnapshot,
                                        ),
                                },
                            },
                        },
                    },
                );

            await transaction.auditEvent.create(
                {
                    data: {
                        userId,

                        entityType:
                            "ExpertReport",

                        entityId:
                            report.id,

                        action:
                            AuditAction.CREATE,

                        description: `Laudo ${reportTitle} criado a partir do cálculo ${calculation.title ?? calculation.type}, versão ${calculationRevision.version}.`,

                        newData: {
                            reportId:
                                report.id,

                            reportRevisionId:
                                reportRevision.id,

                            reportVersion: 1,

                            calculationId:
                                calculation.id,

                            calculationRevisionId:
                                calculationRevision.id,

                            calculationVersion:
                                calculationRevision.version,

                            templateVersion:
                                EXPERT_REPORT_TEMPLATE_VERSION,

                            integrityHash:
                                reportIntegrityHash,
                        },

                        ipAddress:
                            requestMetadata?.ipAddress ??
                            null,

                        userAgent:
                            requestMetadata?.userAgent ??
                            null,
                    },
                },
            );

            return transaction.expertReport.findFirstOrThrow(
                {
                    where: {
                        id: report.id,
                        userId,
                        deletedAt: null,
                    },

                    include: {
                        client: true,

                        legalProcess: true,

                        revisions: {
                            orderBy: {
                                version:
                                    "desc",
                            },

                            include: {
                                sections: {
                                    orderBy: {
                                        position:
                                            "asc",
                                    },
                                },

                                calculationLinks:
                                {
                                    include:
                                    {
                                        calculation:
                                            true,

                                        calculationRevision:
                                        {
                                            include:
                                            {
                                                lines: {
                                                    orderBy:
                                                    {
                                                        sequence:
                                                            "asc",
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            );
        },
    );
}