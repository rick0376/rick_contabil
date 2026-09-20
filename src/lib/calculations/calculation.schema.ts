//src/lib/calculations/calculation.schema.ts

import { z } from "zod";

const calculationStatuses = [
    "DRAFT",
    "CALCULATED",
    "FINALIZED",
    "ARCHIVED",
] as const;

const editableCalculationStatuses = [
    "DRAFT",
    "CALCULATED",
    "FINALIZED",
] as const;

function optionalText(maxLength: number) {
    return z.preprocess(
        (value) => {
            if (typeof value !== "string") {
                return value;
            }

            const normalized = value.trim();

            return normalized === ""
                ? undefined
                : normalized;
        },
        z.string().max(maxLength).optional(),
    );
}

const optionalDate = z.preprocess(
    (value) => {
        if (typeof value !== "string") {
            return value;
        }

        const normalized = value.trim();

        return normalized === ""
            ? undefined
            : normalized;
    },
    z
        .string()
        .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            "Informe a data no formato AAAA-MM-DD.",
        )
        .optional(),
);

const optionalDecimal = z.preprocess(
    (value) => {
        if (
            value === "" ||
            value === undefined
        ) {
            return null;
        }

        return value;
    },
    z
        .union([
            z.number().finite(),

            z
                .string()
                .trim()
                .regex(
                    /^-?\d+(?:\.\d+)?$/,
                    "Informe um valor decimal válido usando ponto como separador.",
                ),

            z.null(),
        ])
        .optional(),
);

const optionalInteger = z.preprocess(
    (value) => {
        if (
            value === "" ||
            value === undefined
        ) {
            return null;
        }

        return value;
    },
    z.number().int().nullable().optional(),
);

export const calculationLineCreateSchema = z.object({
    sequence: z
        .number()
        .int()
        .positive()
        .optional(),

    label: optionalText(300),

    competence: optionalDate,
    dueDate: optionalDate,
    paymentDate: optionalDate,

    openingBalance: optionalDecimal,
    correctionRate: optionalDecimal,
    monetaryCorrection: optionalDecimal,
    correctedBalance: optionalDecimal,
    interestRate: optionalDecimal,
    interest: optionalDecimal,
    amortization: optionalDecimal,
    installment: optionalDecimal,
    insurance: optionalDecimal,
    fee: optionalDecimal,
    fine: optionalDecimal,
    payment: optionalDecimal,
    closingBalance: optionalDecimal,
    debit: optionalDecimal,
    credit: optionalDecimal,

    dayCount: optionalInteger,

    weightedBalance: optionalDecimal,

    metadata: z
        .record(
            z.string(),
            z.unknown(),
        )
        .optional(),
});

export const calculationCreateSchema = z
    .object({
        type: z
            .string()
            .trim()
            .min(
                2,
                "Informe o tipo do cálculo.",
            )
            .max(
                80,
                "O tipo deve possuir no máximo 80 caracteres.",
            ),

        title: optionalText(200),

        description: optionalText(10000),

        clientId: optionalText(60),

        legalProcessId: optionalText(60),

        referenceDate: optionalDate,

        currency: z
            .string()
            .trim()
            .min(
                3,
                "Informe a moeda.",
            )
            .max(
                10,
                "A moeda deve possuir no máximo 10 caracteres.",
            )
            .default("BRL"),

        status: z
            .enum(calculationStatuses)
            .default("CALCULATED"),

        engineVersion: z
            .string()
            .trim()
            .min(
                1,
                "Informe a versão do motor de cálculo.",
            )
            .max(
                60,
                "A versão do motor deve possuir no máximo 60 caracteres.",
            )
            .default("1.0.0"),

        input: z
            .record(
                z.string(),
                z.unknown(),
            )
            .default({}),

        result: z
            .record(
                z.string(),
                z.unknown(),
            )
            .default({}),

        premises: z
            .record(
                z.string(),
                z.unknown(),
            )
            .optional(),

        methodology: z
            .record(
                z.string(),
                z.unknown(),
            )
            .optional(),

        formulas: z
            .record(
                z.string(),
                z.unknown(),
            )
            .optional(),

        summary: z
            .record(
                z.string(),
                z.unknown(),
            )
            .optional(),

        warnings: z
            .record(
                z.string(),
                z.unknown(),
            )
            .optional(),

        notes: optionalText(10000),

        lines: z
            .array(
                calculationLineCreateSchema,
            )
            .max(10000)
            .default([]),
    })
    .superRefine((value, context) => {
        const sequences = value.lines.map(
            (line, index) =>
                line.sequence ?? index + 1,
        );

        if (
            new Set(sequences).size !==
            sequences.length
        ) {
            context.addIssue({
                code: "custom",
                path: ["lines"],
                message:
                    "As sequências das linhas não podem se repetir.",
            });
        }
    });

export const calculationUpdateSchema = z.object({
    title: z
        .string()
        .trim()
        .min(
            2,
            "Informe o título do cálculo.",
        )
        .max(
            200,
            "O título deve possuir no máximo 200 caracteres.",
        ),

    description: optionalText(10000),

    clientId: optionalText(60),

    legalProcessId: optionalText(60),

    referenceDate: optionalDate,

    status: z.enum(
        editableCalculationStatuses,
    ),

    notes: optionalText(10000),
});

export const calculationRevisionCreateSchema = z
    .object({
        status: z
            .enum(
                editableCalculationStatuses,
            )
            .default("CALCULATED"),

        engineVersion: z
            .string()
            .trim()
            .min(
                1,
                "Informe a versão do motor de cálculo.",
            )
            .max(
                60,
                "A versão do motor deve possuir no máximo 60 caracteres.",
            )
            .default("1.0.0"),

        referenceDate: optionalDate,

        input: z
            .record(
                z.string(),
                z.unknown(),
            )
            .default({}),

        result: z
            .record(
                z.string(),
                z.unknown(),
            )
            .default({}),

        premises: z
            .record(
                z.string(),
                z.unknown(),
            )
            .optional(),

        methodology: z
            .record(
                z.string(),
                z.unknown(),
            )
            .optional(),

        formulas: z
            .record(
                z.string(),
                z.unknown(),
            )
            .optional(),

        summary: z
            .record(
                z.string(),
                z.unknown(),
            )
            .optional(),

        warnings: z
            .record(
                z.string(),
                z.unknown(),
            )
            .optional(),

        notes: optionalText(10000),

        lines: z
            .array(
                calculationLineCreateSchema,
            )
            .max(10000)
            .default([]),
    })
    .superRefine((value, context) => {
        const sequences = value.lines.map(
            (line, index) =>
                line.sequence ?? index + 1,
        );

        if (
            new Set(sequences).size !==
            sequences.length
        ) {
            context.addIssue({
                code: "custom",
                path: ["lines"],
                message:
                    "As sequências das linhas não podem se repetir.",
            });
        }
    });

export type CalculationCreateInput = z.infer<
    typeof calculationCreateSchema
>;

export type CalculationUpdateInput = z.infer<
    typeof calculationUpdateSchema
>;

export type CalculationLineCreateInput = z.infer<
    typeof calculationLineCreateSchema
>;

export type CalculationRevisionCreateInput = z.infer<
    typeof calculationRevisionCreateSchema
>;