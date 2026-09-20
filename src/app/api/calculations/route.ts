//src/app/api/calculations/route.ts

import { createHash } from "node:crypto";

import {
    AuditAction,
    CalculationRevisionStatus,
    CalculationStatus,
    Prisma,
} from "@prisma/client";
import {
    NextRequest,
    NextResponse,
} from "next/server";

import { getCurrentAppUser } from "@/lib/auth/current-user";
import {
    CalculationLineCreateInput,
    calculationCreateSchema,
} from "@/lib/calculations/calculation.schema";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseDate(value?: string) {
    if (!value) {
        return null;
    }

    return new Date(
        `${value}T12:00:00.000Z`,
    );
}

function getRequestIp(
    request: NextRequest,
) {
    return (
        request.headers
            .get("x-forwarded-for")
            ?.split(",")[0]
            ?.trim() ??
        request.headers.get("x-real-ip")
    );
}

function toJsonValue(
    value:
        | Record<string, unknown>
        | undefined,
): Prisma.InputJsonValue {
    return (
        value ?? {}
    ) as Prisma.InputJsonValue;
}

function toDecimal(
    value:
        | string
        | number
        | null
        | undefined,
): string | null {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    return value.toString();
}

function stableStringify(
    value: unknown,
): string {
    if (
        value === null ||
        typeof value !== "object"
    ) {
        return (
            JSON.stringify(value) ??
            "null"
        );
    }

    if (Array.isArray(value)) {
        return `[${value
            .map((item) =>
                stableStringify(item),
            )
            .join(",")}]`;
    }

    const record =
        value as Record<
            string,
            unknown
        >;

    const keys =
        Object.keys(record).sort();

    return `{${keys
        .map(
            (key) =>
                `${JSON.stringify(
                    key,
                )}:${stableStringify(
                    record[key],
                )}`,
        )
        .join(",")}}`;
}

function createIntegrityHash(
    value: unknown,
) {
    return createHash("sha256")
        .update(
            stableStringify(value),
            "utf8",
        )
        .digest("hex");
}

function getLineData(
    line: CalculationLineCreateInput,
    index: number,
): Prisma.CalculationLineCreateWithoutCalculationRevisionInput {
    return {
        sequence:
            line.sequence ?? index + 1,

        label: line.label ?? null,

        competence:
            parseDate(line.competence),

        dueDate:
            parseDate(line.dueDate),

        paymentDate:
            parseDate(line.paymentDate),

        openingBalance:
            toDecimal(
                line.openingBalance,
            ),

        correctionRate:
            toDecimal(
                line.correctionRate,
            ),

        monetaryCorrection:
            toDecimal(
                line.monetaryCorrection,
            ),

        correctedBalance:
            toDecimal(
                line.correctedBalance,
            ),

        interestRate:
            toDecimal(
                line.interestRate,
            ),

        interest:
            toDecimal(line.interest),

        amortization:
            toDecimal(
                line.amortization,
            ),

        installment:
            toDecimal(
                line.installment,
            ),

        insurance:
            toDecimal(line.insurance),

        fee: toDecimal(line.fee),

        fine: toDecimal(line.fine),

        payment:
            toDecimal(line.payment),

        closingBalance:
            toDecimal(
                line.closingBalance,
            ),

        debit:
            toDecimal(line.debit),

        credit:
            toDecimal(line.credit),

        dayCount:
            line.dayCount ?? null,

        weightedBalance:
            toDecimal(
                line.weightedBalance,
            ),

        metadata: line.metadata
            ? (line.metadata as Prisma.InputJsonValue)
            : undefined,
    };
}

export async function GET(
    request: NextRequest,
) {
    const authenticatedUser =
        await getCurrentAppUser();

    if (!authenticatedUser) {
        return NextResponse.json(
            {
                message:
                    "Sessão inválida ou expirada.",
            },
            {
                status: 401,
            },
        );
    }

    const searchParams =
        request.nextUrl.searchParams;

    const search =
        searchParams
            .get("search")
            ?.trim() ?? "";

    const type =
        searchParams
            .get("type")
            ?.trim() || undefined;

    const statusParam =
        searchParams.get("status");

    const status =
        Object.values(
            CalculationStatus,
        ).includes(
            statusParam as CalculationStatus,
        )
            ? (statusParam as CalculationStatus)
            : undefined;

    const searchFilters:
        Prisma.CalculationWhereInput[] =
        search
            ? [
                {
                    title: {
                        contains: search,
                        mode: "insensitive",
                    },
                },

                {
                    description: {
                        contains: search,
                        mode: "insensitive",
                    },
                },

                {
                    type: {
                        contains: search,
                        mode: "insensitive",
                    },
                },

                {
                    client: {
                        name: {
                            contains:
                                search,
                            mode: "insensitive",
                        },
                    },
                },

                {
                    legalProcess: {
                        title: {
                            contains:
                                search,
                            mode: "insensitive",
                        },
                    },
                },

                {
                    legalProcess: {
                        caseNumber: {
                            contains:
                                search,
                            mode: "insensitive",
                        },
                    },
                },
            ]
            : [];

    const calculations =
        await prisma.calculation.findMany({
            where: {
                userId:
                    authenticatedUser
                        .user.id,

                deletedAt: null,
                status,
                type,

                ...(searchFilters.length > 0
                    ? {
                        OR: searchFilters,
                    }
                    : {}),
            },

            select: {
                id: true,
                type: true,
                title: true,
                description: true,
                status: true,
                referenceDate: true,
                currency: true,
                currentVersion: true,
                createdAt: true,
                updatedAt: true,

                client: {
                    select: {
                        id: true,
                        type: true,
                        name: true,
                        tradeName: true,
                        documentNumber: true,
                    },
                },

                legalProcess: {
                    select: {
                        id: true,
                        caseNumber: true,
                        title: true,
                        status: true,
                    },
                },

                _count: {
                    select: {
                        revisions: true,
                    },
                },
            },

            orderBy: [
                {
                    updatedAt: "desc",
                },

                {
                    createdAt: "desc",
                },
            ],

            take: 300,
        });

    return NextResponse.json({
        calculations,
        total: calculations.length,
    });
}

export async function POST(
    request: NextRequest,
) {
    const authenticatedUser =
        await getCurrentAppUser();

    if (!authenticatedUser) {
        return NextResponse.json(
            {
                message:
                    "Sessão inválida ou expirada.",
            },
            {
                status: 401,
            },
        );
    }

    try {
        const body: unknown =
            await request.json();

        const parsed =
            calculationCreateSchema.safeParse(
                body,
            );

        if (!parsed.success) {
            return NextResponse.json(
                {
                    message:
                        "Verifique os dados informados.",

                    errors:
                        parsed.error.flatten(),
                },
                {
                    status: 400,
                },
            );
        }

        const input = parsed.data;

        const [
            client,
            legalProcess,
        ] = await Promise.all([
            input.clientId
                ? prisma.client.findFirst({
                    where: {
                        id: input.clientId,

                        userId:
                            authenticatedUser
                                .user.id,

                        deletedAt: null,
                    },
                })
                : Promise.resolve(null),

            input.legalProcessId
                ? prisma.legalProcess.findFirst(
                    {
                        where: {
                            id: input.legalProcessId,

                            userId:
                                authenticatedUser
                                    .user.id,

                            deletedAt:
                                null,
                        },
                    },
                )
                : Promise.resolve(null),
        ]);

        if (
            input.clientId &&
            !client
        ) {
            return NextResponse.json(
                {
                    message:
                        "Cliente não encontrado.",
                },
                {
                    status: 404,
                },
            );
        }

        if (
            input.legalProcessId &&
            !legalProcess
        ) {
            return NextResponse.json(
                {
                    message:
                        "Processo não encontrado.",
                },
                {
                    status: 404,
                },
            );
        }

        const calculation =
            await prisma.$transaction(
                async (transaction) => {
                    const createdCalculation =
                        await transaction.calculation.create(
                            {
                                data: {
                                    user: {
                                        connect: {
                                            id: authenticatedUser
                                                .user.id,
                                        },
                                    },

                                    ...(client
                                        ? {
                                            client: {
                                                connect:
                                                {
                                                    id: client.id,
                                                },
                                            },
                                        }
                                        : {}),

                                    ...(legalProcess
                                        ? {
                                            legalProcess:
                                            {
                                                connect:
                                                {
                                                    id: legalProcess.id,
                                                },
                                            },
                                        }
                                        : {}),

                                    type: input.type,

                                    title:
                                        input.title ??
                                        null,

                                    description:
                                        input.description ??
                                        null,

                                    status:
                                        input.status,

                                    referenceDate:
                                        parseDate(
                                            input.referenceDate,
                                        ),

                                    currency:
                                        input.currency,

                                    currentVersion:
                                        1,

                                    input: toJsonValue(
                                        input.input,
                                    ),

                                    result: toJsonValue(
                                        input.result,
                                    ),
                                },
                            },
                        );

                    const normalizedLines =
                        input.lines.map(
                            (
                                line,
                                index,
                            ) => ({
                                ...line,

                                sequence:
                                    line.sequence ??
                                    index + 1,
                            }),
                        );

                    const integrityHash =
                        createIntegrityHash(
                            {
                                calculationId:
                                    createdCalculation.id,

                                calculationType:
                                    createdCalculation.type,

                                version: 1,

                                status:
                                    input.status,

                                engineVersion:
                                    input.engineVersion,

                                referenceDate:
                                    input.referenceDate ??
                                    null,

                                input:
                                    input.input,

                                result:
                                    input.result,

                                premises:
                                    input.premises ??
                                    null,

                                methodology:
                                    input.methodology ??
                                    null,

                                formulas:
                                    input.formulas ??
                                    null,

                                summary:
                                    input.summary ??
                                    null,

                                warnings:
                                    input.warnings ??
                                    null,

                                notes:
                                    input.notes ??
                                    null,

                                lines:
                                    normalizedLines,
                            },
                        );

                    const createdRevision =
                        await transaction.calculationRevision.create(
                            {
                                data: {
                                    calculation:
                                    {
                                        connect:
                                        {
                                            id: createdCalculation.id,
                                        },
                                    },

                                    createdBy: {
                                        connect: {
                                            id: authenticatedUser
                                                .user.id,
                                        },
                                    },

                                    version: 1,

                                    status:
                                        input.status ===
                                            CalculationStatus.FINALIZED
                                            ? CalculationRevisionStatus.FINALIZED
                                            : CalculationRevisionStatus.DRAFT,

                                    engineVersion:
                                        input.engineVersion,

                                    referenceDate:
                                        parseDate(
                                            input.referenceDate,
                                        ),

                                    input: toJsonValue(
                                        input.input,
                                    ),

                                    result: toJsonValue(
                                        input.result,
                                    ),

                                    premises:
                                        input.premises
                                            ? toJsonValue(
                                                input.premises,
                                            )
                                            : undefined,

                                    methodology:
                                        input.methodology
                                            ? toJsonValue(
                                                input.methodology,
                                            )
                                            : undefined,

                                    formulas:
                                        input.formulas
                                            ? toJsonValue(
                                                input.formulas,
                                            )
                                            : undefined,

                                    summary:
                                        input.summary
                                            ? toJsonValue(
                                                input.summary,
                                            )
                                            : undefined,

                                    warnings:
                                        input.warnings
                                            ? toJsonValue(
                                                input.warnings,
                                            )
                                            : undefined,

                                    notes:
                                        input.notes ??
                                        null,

                                    integrityHash,

                                    finalizedAt:
                                        input.status ===
                                            CalculationStatus.FINALIZED
                                            ? new Date()
                                            : null,

                                    lines:
                                        input.lines
                                            .length >
                                            0
                                            ? {
                                                create:
                                                    input.lines.map(
                                                        (
                                                            line,
                                                            index,
                                                        ) =>
                                                            getLineData(
                                                                line,
                                                                index,
                                                            ),
                                                    ),
                                            }
                                            : undefined,
                                },

                                include: {
                                    lines: {
                                        orderBy:
                                        {
                                            sequence:
                                                "asc",
                                        },
                                    },
                                },
                            },
                        );

                    await transaction.auditEvent.create(
                        {
                            data: {
                                user: {
                                    connect: {
                                        id: authenticatedUser
                                            .user.id,
                                    },
                                },

                                entityType:
                                    "Calculation",

                                entityId:
                                    createdCalculation.id,

                                action:
                                    AuditAction.CREATE,

                                description: `Cálculo ${createdCalculation.title ??
                                    createdCalculation.type
                                    } cadastrado.`,

                                newData: {
                                    id: createdCalculation.id,

                                    type: createdCalculation.type,

                                    title:
                                        createdCalculation.title,

                                    status:
                                        createdCalculation.status,

                                    clientId:
                                        createdCalculation.clientId,

                                    legalProcessId:
                                        createdCalculation.legalProcessId,

                                    referenceDate:
                                        createdCalculation.referenceDate?.toISOString() ??
                                        null,

                                    currency:
                                        createdCalculation.currency,

                                    currentVersion:
                                        createdCalculation.currentVersion,

                                    revisionId:
                                        createdRevision.id,

                                    engineVersion:
                                        createdRevision.engineVersion,

                                    integrityHash:
                                        createdRevision.integrityHash,

                                    lineCount:
                                        createdRevision
                                            .lines
                                            .length,
                                },

                                userAgent:
                                    request.headers.get(
                                        "user-agent",
                                    ),

                                ipAddress:
                                    getRequestIp(
                                        request,
                                    ),
                            },
                        },
                    );

                    return transaction.calculation.findUnique(
                        {
                            where: {
                                id: createdCalculation.id,
                            },

                            include: {
                                client: true,

                                legalProcess:
                                    true,

                                revisions: {
                                    orderBy: {
                                        version:
                                            "desc",
                                    },

                                    take: 1,

                                    include: {
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
                    );
                },
            );

        return NextResponse.json(
            {
                message:
                    "Cálculo salvo no histórico com sucesso.",

                calculation,
            },
            {
                status: 201,
            },
        );
    } catch (error) {
        console.error(
            "Erro ao salvar cálculo:",
            error,
        );

        return NextResponse.json(
            {
                message:
                    "Não foi possível salvar o cálculo.",
            },
            {
                status: 500,
            },
        );
    }
}