//src/app/api/calculations/[calculationId]/revisions/route.ts

import { createHash } from "node:crypto";

import {
    AuditAction,
    CalculationRevisionStatus,
    CalculationStatus,
    Prisma,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth/current-user";
import {
    CalculationLineCreateInput,
    calculationRevisionCreateSchema,
} from "@/lib/calculations/calculation.schema";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        calculationId: string;
    }>;
};

function parseDate(value?: string) {
    if (!value) {
        return null;
    }

    return new Date(`${value}T12:00:00.000Z`);
}

function getRequestIp(request: NextRequest) {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip")
    );
}

function toJsonValue(
    value: Record<string, unknown> | undefined,
): Prisma.InputJsonValue {
    return (value ?? {}) as Prisma.InputJsonValue;
}

function toDecimal(
    value: string | number | null | undefined,
): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    return value.toString();
}

function stableStringify(value: unknown): string {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value) ?? "null";
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();

    return `{${keys
        .map(
            (key) =>
                `${JSON.stringify(key)}:${stableStringify(record[key])}`,
        )
        .join(",")}}`;
}

function createIntegrityHash(value: unknown) {
    return createHash("sha256")
        .update(stableStringify(value), "utf8")
        .digest("hex");
}

function getLineData(
    line: CalculationLineCreateInput,
    index: number,
): Prisma.CalculationLineCreateWithoutCalculationRevisionInput {
    return {
        sequence: line.sequence ?? index + 1,
        label: line.label ?? null,
        competence: parseDate(line.competence),
        dueDate: parseDate(line.dueDate),
        paymentDate: parseDate(line.paymentDate),
        openingBalance: toDecimal(line.openingBalance),
        correctionRate: toDecimal(line.correctionRate),
        monetaryCorrection: toDecimal(line.monetaryCorrection),
        correctedBalance: toDecimal(line.correctedBalance),
        interestRate: toDecimal(line.interestRate),
        interest: toDecimal(line.interest),
        amortization: toDecimal(line.amortization),
        installment: toDecimal(line.installment),
        insurance: toDecimal(line.insurance),
        fee: toDecimal(line.fee),
        fine: toDecimal(line.fine),
        payment: toDecimal(line.payment),
        closingBalance: toDecimal(line.closingBalance),
        debit: toDecimal(line.debit),
        credit: toDecimal(line.credit),
        dayCount: line.dayCount ?? null,
        weightedBalance: toDecimal(line.weightedBalance),
        metadata: line.metadata
            ? (line.metadata as Prisma.InputJsonValue)
            : undefined,
    };
}

export async function POST(
    request: NextRequest,
    context: RouteContext,
) {
    const authenticatedUser = await getCurrentAppUser();

    if (!authenticatedUser) {
        return NextResponse.json(
            {
                message: "Sessão inválida ou expirada.",
            },
            {
                status: 401,
            },
        );
    }

    const { calculationId } = await context.params;

    try {
        const body: unknown = await request.json();
        const parsed = calculationRevisionCreateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    message: "Verifique os dados informados.",
                    errors: parsed.error.flatten(),
                },
                {
                    status: 400,
                },
            );
        }

        const input = parsed.data;
        const referenceDate = parseDate(input.referenceDate);

        const result = await prisma.$transaction(
            async (transaction) => {
                const currentCalculation =
                    await transaction.calculation.findFirst({
                        where: {
                            id: calculationId,
                            userId: authenticatedUser.user.id,
                            deletedAt: null,
                        },

                        select: {
                            id: true,
                            type: true,
                            title: true,
                            status: true,
                            referenceDate: true,
                            currentVersion: true,
                        },
                    });

                if (!currentCalculation) {
                    return null;
                }

                const updatedCalculation =
                    await transaction.calculation.update({
                        where: {
                            id: currentCalculation.id,
                        },

                        data: {
                            currentVersion: {
                                increment: 1,
                            },

                            status: input.status,
                            referenceDate,
                            input: toJsonValue(input.input),
                            result: toJsonValue(input.result),
                        },

                        select: {
                            id: true,
                            type: true,
                            title: true,
                            status: true,
                            referenceDate: true,
                            currentVersion: true,
                            updatedAt: true,
                        },
                    });

                const version = updatedCalculation.currentVersion;

                const normalizedLines = input.lines.map(
                    (line, index) => ({
                        ...line,
                        sequence: line.sequence ?? index + 1,
                    }),
                );

                const integrityHash = createIntegrityHash({
                    calculationId: currentCalculation.id,
                    calculationType: currentCalculation.type,
                    version,
                    status: input.status,
                    engineVersion: input.engineVersion,
                    referenceDate: input.referenceDate ?? null,
                    input: input.input,
                    result: input.result,
                    premises: input.premises ?? null,
                    methodology: input.methodology ?? null,
                    formulas: input.formulas ?? null,
                    summary: input.summary ?? null,
                    warnings: input.warnings ?? null,
                    notes: input.notes ?? null,
                    lines: normalizedLines,
                });

                const revision =
                    await transaction.calculationRevision.create({
                        data: {
                            calculation: {
                                connect: {
                                    id: currentCalculation.id,
                                },
                            },

                            createdBy: {
                                connect: {
                                    id: authenticatedUser.user.id,
                                },
                            },

                            version,

                            status:
                                input.status ===
                                    CalculationStatus.FINALIZED
                                    ? CalculationRevisionStatus.FINALIZED
                                    : CalculationRevisionStatus.DRAFT,

                            engineVersion: input.engineVersion,
                            referenceDate,
                            input: toJsonValue(input.input),
                            result: toJsonValue(input.result),

                            premises: input.premises
                                ? toJsonValue(input.premises)
                                : undefined,

                            methodology: input.methodology
                                ? toJsonValue(input.methodology)
                                : undefined,

                            formulas: input.formulas
                                ? toJsonValue(input.formulas)
                                : undefined,

                            summary: input.summary
                                ? toJsonValue(input.summary)
                                : undefined,

                            warnings: input.warnings
                                ? toJsonValue(input.warnings)
                                : undefined,

                            notes: input.notes ?? null,
                            integrityHash,

                            finalizedAt:
                                input.status ===
                                    CalculationStatus.FINALIZED
                                    ? new Date()
                                    : null,

                            lines:
                                input.lines.length > 0
                                    ? {
                                        create: input.lines.map(
                                            (line, index) =>
                                                getLineData(line, index),
                                        ),
                                    }
                                    : undefined,
                        },

                        include: {
                            lines: {
                                orderBy: {
                                    sequence: "asc",
                                },
                            },
                        },
                    });

                await transaction.auditEvent.create({
                    data: {
                        user: {
                            connect: {
                                id: authenticatedUser.user.id,
                            },
                        },

                        entityType: "Calculation",
                        entityId: currentCalculation.id,
                        action: AuditAction.UPDATE,

                        description: `Revisão ${version} do cálculo ${currentCalculation.title ??
                            currentCalculation.type
                            } criada.`,

                        previousData: {
                            status: currentCalculation.status,

                            referenceDate:
                                currentCalculation.referenceDate?.toISOString() ??
                                null,

                            currentVersion:
                                currentCalculation.currentVersion,
                        },

                        newData: {
                            revisionId: revision.id,
                            version: revision.version,
                            status: updatedCalculation.status,
                            revisionStatus: revision.status,

                            referenceDate:
                                updatedCalculation.referenceDate?.toISOString() ??
                                null,

                            currentVersion:
                                updatedCalculation.currentVersion,

                            engineVersion: revision.engineVersion,
                            integrityHash: revision.integrityHash,
                            lineCount: revision.lines.length,
                        },

                        userAgent: request.headers.get("user-agent"),
                        ipAddress: getRequestIp(request),
                    },
                });

                return {
                    calculation: updatedCalculation,
                    revision,
                };
            },
        );

        if (!result) {
            return NextResponse.json(
                {
                    message: "Cálculo não encontrado.",
                },
                {
                    status: 404,
                },
            );
        }

        return NextResponse.json(
            {
                message: `Revisão ${result.revision.version} criada com sucesso.`,
                ...result,
            },
            {
                status: 201,
            },
        );
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                {
                    message:
                        "Outra revisão foi criada ao mesmo tempo. Atualize os dados e tente novamente.",
                },
                {
                    status: 409,
                },
            );
        }

        console.error("Erro ao criar revisão do cálculo:", error);

        return NextResponse.json(
            {
                message:
                    "Não foi possível criar a revisão do cálculo.",
            },
            {
                status: 500,
            },
        );
    }
}