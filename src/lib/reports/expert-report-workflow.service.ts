// src/lib/reports/expert-report-workflow.service.ts

import {
    AuditAction,
    ExpertReportRevisionStatus,
    ExpertReportStatus,
    Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
    createIntegrityHash,
    toCanonicalJson,
    type CanonicalJson,
} from "./expert-report-hash";
import {
    ExpertReportServiceError,
} from "./expert-report.service";

type RequestMetadata = {
    ipAddress?: string | null;
    userAgent?: string | null;
};

type ReportWorkflowOptions = {
    userId: string;
    reportId: string;
    requestMetadata?: RequestMetadata;
};

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

async function loadOwnedReport(
    userId: string,
    reportId: string,
) {
    const report =
        await prisma.expertReport.findFirst({
            where: {
                id: reportId,
                userId,
                deletedAt: null,
            },
        });

    if (!report) {
        throw new ExpertReportServiceError(
            "Laudo não encontrado.",
            404,
            "REPORT_NOT_FOUND",
        );
    }

    if (
        report.status ===
        ExpertReportStatus.ARCHIVED
    ) {
        throw new ExpertReportServiceError(
            "O laudo está arquivado.",
            409,
            "REPORT_ARCHIVED",
        );
    }

    return report;
}

async function loadCurrentRevision(
    reportId: string,
    currentVersion: number,
) {
    const revision =
        await prisma.expertReportRevision.findFirst({
            where: {
                expertReportId: reportId,
                version: currentVersion,
            },

            include: {
                sections: {
                    orderBy: {
                        position: "asc",
                    },
                },

                calculationLinks: {
                    orderBy: {
                        position: "asc",
                    },
                },
            },
        });

    if (!revision) {
        throw new ExpertReportServiceError(
            "A revisão atual do laudo não foi encontrada.",
            409,
            "CURRENT_REVISION_NOT_FOUND",
        );
    }

    return revision;
}

function validateFinalization(
    revision: Awaited<
        ReturnType<
            typeof loadCurrentRevision
        >
    >,
) {
    if (
        revision.status ===
        ExpertReportRevisionStatus.FINALIZED
    ) {
        throw new ExpertReportServiceError(
            "Esta revisão já está finalizada.",
            409,
            "REVISION_ALREADY_FINALIZED",
        );
    }

    if (
        revision.status !==
        ExpertReportRevisionStatus.IN_REVIEW
    ) {
        throw new ExpertReportServiceError(
            "Salve o laudo como “Em revisão” antes de finalizá-lo.",
            409,
            "REVISION_NOT_IN_REVIEW",
        );
    }

    const visibleSections =
        revision.sections.filter(
            (section) =>
                section.isVisible,
        );

    if (visibleSections.length === 0) {
        throw new ExpertReportServiceError(
            "O laudo não possui seções visíveis.",
            400,
            "REPORT_WITHOUT_VISIBLE_SECTIONS",
        );
    }

    const conclusion =
        visibleSections.find(
            (section) =>
                section.type ===
                "CONCLUSION",
        );

    if (
        !conclusion?.plainText?.trim()
    ) {
        throw new ExpertReportServiceError(
            "Preencha a conclusão técnica antes de finalizar.",
            400,
            "CONCLUSION_REQUIRED",
        );
    }

    const signature =
        visibleSections.find(
            (section) =>
                section.type ===
                "SIGNATURE",
        );

    if (
        !signature?.plainText?.trim()
    ) {
        throw new ExpertReportServiceError(
            "Preencha a identificação do profissional antes de finalizar.",
            400,
            "SIGNATURE_REQUIRED",
        );
    }
}

function buildRevisionIntegrityHash({
    reportId,
    version,
    status,
    title,
    reportNumber,
    purpose,
    referenceDate,
    place,
    issuedAt,
    finalizedAt,
    templateVersion,
    notes,
    sourceSnapshot,
    clientSnapshot,
    legalProcessSnapshot,
    professionalSnapshot,
    questionsSnapshot,
    sourceDocumentsSnapshot,
    sections,
    calculationLinks,
}: {
    reportId: string;
    version: number;
    status: ExpertReportRevisionStatus;
    title: string;
    reportNumber: string | null;
    purpose: string | null;
    referenceDate: Date | null;
    place: string | null;
    issuedAt: Date | null;
    finalizedAt: Date | null;
    templateVersion: string;
    notes: string | null;
    sourceSnapshot: unknown;
    clientSnapshot: unknown;
    legalProcessSnapshot: unknown;
    professionalSnapshot: unknown;
    questionsSnapshot: unknown;
    sourceDocumentsSnapshot: unknown;

    sections: Array<{
        type: string;
        title: string;
        plainText: string | null;
        content: unknown;
        position: number;
        isVisible: boolean;
        isAutoGenerated: boolean;
    }>;

    calculationLinks: Array<{
        calculationId: string;
        calculationRevisionId: string;
        position: number;
        notes: string | null;
        snapshot: unknown;
    }>;
}) {
    return createIntegrityHash({
        reportId,
        version,
        status,
        title,
        reportNumber,
        purpose,
        referenceDate,
        place,
        issuedAt,
        finalizedAt,
        templateVersion,
        notes,

        sourceSnapshot:
            toCanonicalJson(
                sourceSnapshot,
            ),

        clientSnapshot:
            toCanonicalJson(
                clientSnapshot,
            ),

        legalProcessSnapshot:
            toCanonicalJson(
                legalProcessSnapshot,
            ),

        professionalSnapshot:
            toCanonicalJson(
                professionalSnapshot,
            ),

        questionsSnapshot:
            toCanonicalJson(
                questionsSnapshot,
            ),

        sourceDocumentsSnapshot:
            toCanonicalJson(
                sourceDocumentsSnapshot,
            ),

        sections: sections.map(
            (section) => ({
                type: section.type,
                title: section.title,
                plainText:
                    section.plainText,

                content:
                    toCanonicalJson(
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

        calculationLinks:
            calculationLinks.map(
                (link) => ({
                    calculationId:
                        link.calculationId,

                    calculationRevisionId:
                        link.calculationRevisionId,

                    position:
                        link.position,

                    notes:
                        link.notes,

                    snapshot:
                        toCanonicalJson(
                            link.snapshot,
                        ),
                }),
            ),
    });
}

export async function finalizeCurrentExpertReportRevision({
    userId,
    reportId,
    requestMetadata,
}: ReportWorkflowOptions) {
    const report =
        await loadOwnedReport(
            userId,
            reportId,
        );

    const currentRevision =
        await loadCurrentRevision(
            report.id,
            report.currentVersion,
        );

    validateFinalization(
        currentRevision,
    );

    const finalizedAt =
        new Date();

    const issuedAt =
        currentRevision.issuedAt ??
        finalizedAt;

    const integrityHash =
        buildRevisionIntegrityHash({
            reportId: report.id,

            version:
                currentRevision.version,

            status:
                ExpertReportRevisionStatus.FINALIZED,

            title:
                currentRevision.title,

            reportNumber:
                currentRevision.reportNumber,

            purpose:
                currentRevision.purpose,

            referenceDate:
                currentRevision.referenceDate,

            place:
                currentRevision.place,

            issuedAt,
            finalizedAt,

            templateVersion:
                currentRevision.templateVersion,

            notes:
                currentRevision.notes,

            sourceSnapshot:
                currentRevision.sourceSnapshot,

            clientSnapshot:
                currentRevision.clientSnapshot,

            legalProcessSnapshot:
                currentRevision.legalProcessSnapshot,

            professionalSnapshot:
                currentRevision.professionalSnapshot,

            questionsSnapshot:
                currentRevision.questionsSnapshot,

            sourceDocumentsSnapshot:
                currentRevision.sourceDocumentsSnapshot,

            sections:
                currentRevision.sections,

            calculationLinks:
                currentRevision.calculationLinks,
        });

    return prisma.$transaction(
        async (transaction) => {
            await transaction.expertReportRevision.update({
                where: {
                    id: currentRevision.id,
                },

                data: {
                    status:
                        ExpertReportRevisionStatus.FINALIZED,

                    issuedAt,
                    finalizedAt,
                    integrityHash,
                },
            });

            await transaction.expertReport.update({
                where: {
                    id: report.id,
                },

                data: {
                    title:
                        currentRevision.title,

                    reportNumber:
                        currentRevision.reportNumber,

                    purpose:
                        currentRevision.purpose,

                    referenceDate:
                        currentRevision.referenceDate,

                    place:
                        currentRevision.place,

                    issuedAt,

                    status:
                        ExpertReportStatus.FINALIZED,
                },
            });

            await transaction.auditEvent.create({
                data: {
                    userId,

                    entityType:
                        "ExpertReport",

                    entityId:
                        report.id,

                    action:
                        AuditAction.FINALIZE,

                    description:
                        `Laudo ${currentRevision.title}, revisão ${currentRevision.version}, finalizado.`,

                    previousData: {
                        reportStatus:
                            report.status,

                        revisionStatus:
                            currentRevision.status,

                        integrityHash:
                            currentRevision.integrityHash,

                        issuedAt:
                            currentRevision.issuedAt?.toISOString() ??
                            null,

                        finalizedAt:
                            currentRevision.finalizedAt?.toISOString() ??
                            null,
                    },

                    newData: {
                        reportStatus:
                            ExpertReportStatus.FINALIZED,

                        revisionStatus:
                            ExpertReportRevisionStatus.FINALIZED,

                        reportVersion:
                            currentRevision.version,

                        integrityHash,
                        issuedAt:
                            issuedAt.toISOString(),

                        finalizedAt:
                            finalizedAt.toISOString(),
                    },

                    ipAddress:
                        requestMetadata?.ipAddress ??
                        null,

                    userAgent:
                        requestMetadata?.userAgent ??
                        null,
                },
            });

            return transaction.expertReport.findFirstOrThrow({
                where: {
                    id: report.id,
                    userId,
                    deletedAt: null,
                },

                include: {
                    revisions: {
                        orderBy: {
                            version: "desc",
                        },

                        include: {
                            sections: {
                                orderBy: {
                                    position:
                                        "asc",
                                },
                            },

                            calculationLinks: {
                                orderBy: {
                                    position:
                                        "asc",
                                },
                            },
                        },
                    },
                },
            });
        },
    );
}

export async function createNewExpertReportRevision({
    userId,
    reportId,
    requestMetadata,
}: ReportWorkflowOptions) {
    const report =
        await loadOwnedReport(
            userId,
            reportId,
        );

    const currentRevision =
        await loadCurrentRevision(
            report.id,
            report.currentVersion,
        );

    if (
        currentRevision.status !==
        ExpertReportRevisionStatus.FINALIZED
    ) {
        throw new ExpertReportServiceError(
            "A revisão atual ainda não está finalizada. Continue editando a revisão existente.",
            409,
            "CURRENT_REVISION_NOT_FINALIZED",
        );
    }

    const nextVersion =
        currentRevision.version + 1;

    const sourceSnapshot =
        toCanonicalJson(
            currentRevision.sourceSnapshot,
        );

    const clientSnapshot =
        currentRevision.clientSnapshot ===
            null
            ? null
            : toCanonicalJson(
                currentRevision.clientSnapshot,
            );

    const legalProcessSnapshot =
        currentRevision.legalProcessSnapshot ===
            null
            ? null
            : toCanonicalJson(
                currentRevision.legalProcessSnapshot,
            );

    const professionalSnapshot =
        currentRevision.professionalSnapshot ===
            null
            ? null
            : toCanonicalJson(
                currentRevision.professionalSnapshot,
            );

    const questionsSnapshot =
        currentRevision.questionsSnapshot ===
            null
            ? null
            : toCanonicalJson(
                currentRevision.questionsSnapshot,
            );

    const sourceDocumentsSnapshot =
        currentRevision.sourceDocumentsSnapshot ===
            null
            ? null
            : toCanonicalJson(
                currentRevision.sourceDocumentsSnapshot,
            );

    const clonedSections =
        currentRevision.sections.map(
            (section) => ({
                type: section.type,
                title: section.title,
                plainText:
                    section.plainText,

                content:
                    section.content ===
                        null
                        ? null
                        : toCanonicalJson(
                            section.content,
                        ),

                position:
                    section.position,

                isVisible:
                    section.isVisible,

                isAutoGenerated:
                    section.isAutoGenerated,
            }),
        );

    const clonedCalculationLinks =
        currentRevision.calculationLinks.map(
            (link) => ({
                calculationId:
                    link.calculationId,

                calculationRevisionId:
                    link.calculationRevisionId,

                position:
                    link.position,

                notes:
                    link.notes,

                snapshot:
                    toCanonicalJson(
                        link.snapshot,
                    ),
            }),
        );

    const integrityHash =
        buildRevisionIntegrityHash({
            reportId:
                report.id,

            version:
                nextVersion,

            status:
                ExpertReportRevisionStatus.DRAFT,

            title:
                currentRevision.title,

            reportNumber:
                currentRevision.reportNumber,

            purpose:
                currentRevision.purpose,

            referenceDate:
                currentRevision.referenceDate,

            place:
                currentRevision.place,

            issuedAt: null,
            finalizedAt: null,

            templateVersion:
                currentRevision.templateVersion,

            notes:
                currentRevision.notes,

            sourceSnapshot,
            clientSnapshot,
            legalProcessSnapshot,
            professionalSnapshot,
            questionsSnapshot,
            sourceDocumentsSnapshot,

            sections:
                clonedSections,

            calculationLinks:
                clonedCalculationLinks,
        });

    try {
        return await prisma.$transaction(
            async (transaction) => {
                const newRevision =
                    await transaction.expertReportRevision.create({
                        data: {
                            expertReportId:
                                report.id,

                            createdById:
                                userId,

                            version:
                                nextVersion,

                            status:
                                ExpertReportRevisionStatus.DRAFT,

                            title:
                                currentRevision.title,

                            reportNumber:
                                currentRevision.reportNumber,

                            purpose:
                                currentRevision.purpose,

                            referenceDate:
                                currentRevision.referenceDate,

                            place:
                                currentRevision.place,

                            issuedAt:
                                null,

                            templateVersion:
                                currentRevision.templateVersion,

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

                            integrityHash,

                            notes:
                                currentRevision.notes,

                            finalizedAt:
                                null,

                            sections: {
                                create:
                                    clonedSections.map(
                                        (section) => ({
                                            type:
                                                section.type,

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
                                create:
                                    clonedCalculationLinks.map(
                                        (link) => ({
                                            calculationId:
                                                link.calculationId,

                                            calculationRevisionId:
                                                link.calculationRevisionId,

                                            position:
                                                link.position,

                                            notes:
                                                link.notes,

                                            snapshot:
                                                requiredJson(
                                                    link.snapshot,
                                                ),
                                        }),
                                    ),
                            },
                        },
                    });

                await transaction.expertReport.update({
                    where: {
                        id: report.id,
                    },

                    data: {
                        currentVersion:
                            nextVersion,

                        status:
                            ExpertReportStatus.DRAFT,

                        issuedAt:
                            null,
                    },
                });

                await transaction.auditEvent.create({
                    data: {
                        userId,

                        entityType:
                            "ExpertReportRevision",

                        entityId:
                            newRevision.id,

                        action:
                            AuditAction.CREATE,

                        description:
                            `Revisão ${nextVersion} criada para o laudo ${currentRevision.title}.`,

                        newData: {
                            reportId:
                                report.id,

                            sourceRevisionId:
                                currentRevision.id,

                            sourceVersion:
                                currentRevision.version,

                            newRevisionId:
                                newRevision.id,

                            newVersion:
                                nextVersion,

                            status:
                                ExpertReportRevisionStatus.DRAFT,

                            integrityHash,

                            calculationLinks:
                                clonedCalculationLinks.length,

                            sectionCount:
                                clonedSections.length,
                        },

                        ipAddress:
                            requestMetadata?.ipAddress ??
                            null,

                        userAgent:
                            requestMetadata?.userAgent ??
                            null,
                    },
                });

                return transaction.expertReport.findFirstOrThrow({
                    where: {
                        id: report.id,
                        userId,
                        deletedAt: null,
                    },

                    include: {
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

                                calculationLinks: {
                                    orderBy: {
                                        position:
                                            "asc",
                                    },
                                },
                            },
                        },
                    },
                });
            },
        );
    } catch (error) {
        if (
            error instanceof
            Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            throw new ExpertReportServiceError(
                "Outra revisão foi criada ao mesmo tempo. Atualize a página e tente novamente.",
                409,
                "REVISION_VERSION_CONFLICT",
            );
        }

        throw error;
    }
}