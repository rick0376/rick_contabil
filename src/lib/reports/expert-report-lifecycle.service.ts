// src/lib/reports/expert-report-lifecycle.service.ts

import {
    AuditAction,
    ExpertReportRevisionStatus,
    ExpertReportStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
    ExpertReportServiceError,
} from "./expert-report.service";

type RequestMetadata = {
    ipAddress?: string | null;
    userAgent?: string | null;
};

type ReportLifecycleOptions = {
    userId: string;
    reportId: string;
    requestMetadata?: RequestMetadata;
};

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

    return report;
}

function getRestoredReportStatus(
    revisionStatus:
        ExpertReportRevisionStatus,
) {
    if (
        revisionStatus ===
        ExpertReportRevisionStatus.FINALIZED
    ) {
        return ExpertReportStatus.FINALIZED;
    }

    if (
        revisionStatus ===
        ExpertReportRevisionStatus.IN_REVIEW
    ) {
        return ExpertReportStatus.IN_REVIEW;
    }

    return ExpertReportStatus.DRAFT;
}

export async function archiveExpertReport({
    userId,
    reportId,
    requestMetadata,
}: ReportLifecycleOptions) {
    const report =
        await loadOwnedReport(
            userId,
            reportId,
        );

    if (
        report.status ===
        ExpertReportStatus.ARCHIVED
    ) {
        throw new ExpertReportServiceError(
            "O laudo já está arquivado.",
            409,
            "REPORT_ALREADY_ARCHIVED",
        );
    }

    return prisma.$transaction(
        async (transaction) => {
            const archivedReport =
                await transaction.expertReport.update({
                    where: {
                        id: report.id,
                    },

                    data: {
                        status:
                            ExpertReportStatus.ARCHIVED,
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
                        AuditAction.ARCHIVE,

                    description:
                        `Laudo ${report.title} arquivado.`,

                    previousData: {
                        status:
                            report.status,
                    },

                    newData: {
                        status:
                            ExpertReportStatus.ARCHIVED,
                    },

                    ipAddress:
                        requestMetadata?.ipAddress ??
                        null,

                    userAgent:
                        requestMetadata?.userAgent ??
                        null,
                },
            });

            return archivedReport;
        },
    );
}

export async function restoreExpertReport({
    userId,
    reportId,
    requestMetadata,
}: ReportLifecycleOptions) {
    const report =
        await loadOwnedReport(
            userId,
            reportId,
        );

    if (
        report.status !==
        ExpertReportStatus.ARCHIVED
    ) {
        throw new ExpertReportServiceError(
            "O laudo não está arquivado.",
            409,
            "REPORT_NOT_ARCHIVED",
        );
    }

    const currentRevision =
        await prisma.expertReportRevision.findFirst({
            where: {
                expertReportId:
                    report.id,

                version:
                    report.currentVersion,
            },

            select: {
                id: true,
                version: true,
                status: true,
            },
        });

    if (!currentRevision) {
        throw new ExpertReportServiceError(
            "A revisão atual do laudo não foi encontrada.",
            409,
            "CURRENT_REVISION_NOT_FOUND",
        );
    }

    const restoredStatus =
        getRestoredReportStatus(
            currentRevision.status,
        );

    return prisma.$transaction(
        async (transaction) => {
            const restoredReport =
                await transaction.expertReport.update({
                    where: {
                        id: report.id,
                    },

                    data: {
                        status:
                            restoredStatus,
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
                        AuditAction.RESTORE,

                    description:
                        `Laudo ${report.title} restaurado.`,

                    previousData: {
                        status:
                            report.status,
                    },

                    newData: {
                        status:
                            restoredStatus,

                        currentRevisionId:
                            currentRevision.id,

                        currentVersion:
                            currentRevision.version,

                        revisionStatus:
                            currentRevision.status,
                    },

                    ipAddress:
                        requestMetadata?.ipAddress ??
                        null,

                    userAgent:
                        requestMetadata?.userAgent ??
                        null,
                },
            });

            return restoredReport;
        },
    );
}

export async function softDeleteExpertReport({
    userId,
    reportId,
    requestMetadata,
}: ReportLifecycleOptions) {
    const report =
        await loadOwnedReport(
            userId,
            reportId,
        );

    const deletedAt =
        new Date();

    return prisma.$transaction(
        async (transaction) => {
            const deletedReport =
                await transaction.expertReport.update({
                    where: {
                        id: report.id,
                    },

                    data: {
                        status:
                            ExpertReportStatus.ARCHIVED,

                        deletedAt,
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
                        AuditAction.DELETE,

                    description:
                        `Laudo ${report.title} excluído logicamente.`,

                    previousData: {
                        status:
                            report.status,

                        deletedAt:
                            report.deletedAt?.toISOString() ??
                            null,
                    },

                    newData: {
                        status:
                            ExpertReportStatus.ARCHIVED,

                        deletedAt:
                            deletedAt.toISOString(),

                        deletionType:
                            "SOFT_DELETE",
                    },

                    ipAddress:
                        requestMetadata?.ipAddress ??
                        null,

                    userAgent:
                        requestMetadata?.userAgent ??
                        null,
                },
            });

            return deletedReport;
        },
    );
}