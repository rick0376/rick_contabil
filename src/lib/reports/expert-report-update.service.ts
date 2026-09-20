// src/lib/reports/expert-report-update.service.ts

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
import type {
    ExpertReportRevisionUpdateInput,
} from "./expert-report.schema";
import {
    ExpertReportServiceError,
} from "./expert-report.service";

type RequestMetadata = {
    ipAddress?: string | null;
    userAgent?: string | null;
};

type UpdateExpertReportOptions = {
    userId: string;
    reportId: string;
    input: ExpertReportRevisionUpdateInput;
    requestMetadata?: RequestMetadata;
};

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

function nullableJson(
    value: CanonicalJson | null,
):
    | Prisma.InputJsonValue
    | Prisma.NullableJsonNullValueInput {
    return value === null
        ? Prisma.JsonNull
        : (value as Prisma.InputJsonValue);
}

function validateSectionPositions(
    positions: number[],
) {
    const uniquePositions =
        new Set(positions);

    if (
        uniquePositions.size !==
        positions.length
    ) {
        throw new ExpertReportServiceError(
            "Existem seções com posições repetidas.",
            400,
            "DUPLICATE_SECTION_POSITION",
        );
    }
}

export async function updateCurrentExpertReportRevision({
    userId,
    reportId,
    input,
    requestMetadata,
}: UpdateExpertReportOptions) {
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
        ExpertReportStatus.FINALIZED
    ) {
        throw new ExpertReportServiceError(
            "O laudo está finalizado e não pode ser alterado.",
            409,
            "REPORT_FINALIZED",
        );
    }

    if (
        report.status ===
        ExpertReportStatus.ARCHIVED
    ) {
        throw new ExpertReportServiceError(
            "O laudo está arquivado e não pode ser alterado.",
            409,
            "REPORT_ARCHIVED",
        );
    }

    const currentRevision =
        await prisma.expertReportRevision.findFirst({
            where: {
                expertReportId: report.id,
                version:
                    report.currentVersion,
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

                    select: {
                        snapshot: true,
                        calculationId: true,
                        calculationRevisionId:
                            true,
                        position: true,
                    },
                },
            },
        });

    if (!currentRevision) {
        throw new ExpertReportServiceError(
            "A revisão atual do laudo não foi encontrada.",
            409,
            "CURRENT_REVISION_NOT_FOUND",
        );
    }

    if (
        currentRevision.status ===
        ExpertReportRevisionStatus.FINALIZED
    ) {
        throw new ExpertReportServiceError(
            "A revisão está finalizada. Crie uma nova revisão para fazer alterações.",
            409,
            "REVISION_FINALIZED",
        );
    }

    validateSectionPositions(
        input.sections.map(
            (section) =>
                section.position,
        ),
    );

    const orderedSections = [
        ...input.sections,
    ].sort(
        (left, right) =>
            left.position -
            right.position,
    );

    const revisionStatus =
        input.status === "IN_REVIEW"
            ? ExpertReportRevisionStatus.IN_REVIEW
            : ExpertReportRevisionStatus.DRAFT;

    const reportStatus =
        input.status === "IN_REVIEW"
            ? ExpertReportStatus.IN_REVIEW
            : ExpertReportStatus.DRAFT;

    const referenceDate =
        parseDate(
            input.referenceDate,
        );

    const normalizedSections =
        orderedSections.map(
            (section) => ({
                type: section.type,

                title:
                    section.title,

                plainText:
                    section.plainText ??
                    null,

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
        );

    const integrityHash =
        createIntegrityHash({
            templateVersion:
                currentRevision.templateVersion,

            reportId:
                report.id,

            revisionId:
                currentRevision.id,

            version:
                currentRevision.version,

            status:
                revisionStatus,

            title:
                input.title,

            reportNumber:
                input.reportNumber ??
                null,

            purpose:
                input.purpose ??
                null,

            referenceDate,

            place:
                input.place ??
                null,

            notes:
                input.notes ??
                null,

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

            calculationLinks:
                currentRevision.calculationLinks.map(
                    (link) => ({
                        calculationId:
                            link.calculationId,

                        calculationRevisionId:
                            link.calculationRevisionId,

                        position:
                            link.position,

                        snapshot:
                            link.snapshot,
                    }),
                ),

            sections:
                normalizedSections,
        });

    return prisma.$transaction(
        async (transaction) => {
            await transaction.expertReport.update({
                where: {
                    id: report.id,
                },

                data: {
                    title:
                        input.title,

                    reportNumber:
                        input.reportNumber ??
                        null,

                    purpose:
                        input.purpose ??
                        null,

                    referenceDate,

                    place:
                        input.place ??
                        null,

                    status:
                        reportStatus,
                },
            });

            await transaction.expertReportRevisionSection.deleteMany(
                {
                    where: {
                        expertReportRevisionId:
                            currentRevision.id,
                    },
                },
            );

            await transaction.expertReportRevision.update({
                where: {
                    id: currentRevision.id,
                },

                data: {
                    title:
                        input.title,

                    reportNumber:
                        input.reportNumber ??
                        null,

                    purpose:
                        input.purpose ??
                        null,

                    referenceDate,

                    place:
                        input.place ??
                        null,

                    status:
                        revisionStatus,

                    notes:
                        input.notes ??
                        null,

                    integrityHash,

                    finalizedAt: null,

                    sections: {
                        create:
                            normalizedSections.map(
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
                        AuditAction.UPDATE,

                    description: `Laudo ${input.title} atualizado na revisão ${currentRevision.version}.`,

                    previousData: {
                        title:
                            currentRevision.title,

                        reportNumber:
                            currentRevision.reportNumber,

                        purpose:
                            currentRevision.purpose,

                        referenceDate:
                            currentRevision.referenceDate?.toISOString() ??
                            null,

                        place:
                            currentRevision.place,

                        status:
                            currentRevision.status,

                        notes:
                            currentRevision.notes,

                        integrityHash:
                            currentRevision.integrityHash,

                        sectionCount:
                            currentRevision.sections.length,
                    },

                    newData: {
                        title:
                            input.title,

                        reportNumber:
                            input.reportNumber ??
                            null,

                        purpose:
                            input.purpose ??
                            null,

                        referenceDate:
                            referenceDate?.toISOString() ??
                            null,

                        place:
                            input.place ??
                            null,

                        status:
                            revisionStatus,

                        notes:
                            input.notes ??
                            null,

                        integrityHash,

                        sectionCount:
                            normalizedSections.length,
                    },

                    ipAddress:
                        requestMetadata?.ipAddress ??
                        null,

                    userAgent:
                        requestMetadata?.userAgent ??
                        null,
                },
            });

            const updatedReport =
                await transaction.expertReport.findFirst({
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
                                    orderBy: {
                                        position:
                                            "asc",
                                    },

                                    include: {
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
                });

            if (!updatedReport) {
                throw new ExpertReportServiceError(
                    "Não foi possível carregar o laudo atualizado.",
                    500,
                    "UPDATED_REPORT_NOT_FOUND",
                );
            }

            return updatedReport;
        },
    );
}