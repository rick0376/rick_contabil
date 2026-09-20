//src/lib/processes/process.schema.ts

import { z } from "zod";

const processStatuses = [
    "DRAFT",
    "ACTIVE",
    "SUSPENDED",
    "COMPLETED",
    "ARCHIVED",
] as const;

function optionalText(maxLength: number) {
    return z.preprocess(
        (value) => {
            if (typeof value !== "string") {
                return value;
            }

            const normalized = value.trim();

            return normalized === "" ? undefined : normalized;
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

        return normalized === "" ? undefined : normalized;
    },
    z
        .string()
        .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            "Informe a data no formato AAAA-MM-DD.",
        )
        .optional(),
);

const optionalState = z.preprocess(
    (value) => {
        if (typeof value !== "string") {
            return value;
        }

        const normalized = value.trim().toUpperCase();

        return normalized === "" ? undefined : normalized;
    },
    z
        .string()
        .length(2, "Informe a sigla do estado com 2 caracteres.")
        .optional(),
);

export const legalProcessCreateSchema = z
    .object({
        caseNumber: optionalText(60),

        title: z
            .string()
            .trim()
            .min(2, "Informe o título do processo.")
            .max(200, "O título deve possuir no máximo 200 caracteres."),

        court: optionalText(160),

        courtDivision: optionalText(160),

        district: optionalText(120),

        city: optionalText(120),

        state: optionalState,

        actionClass: optionalText(160),

        subject: optionalText(300),

        expertiseObject: optionalText(10000),

        appointmentDate: optionalDate,

        deadlineDate: optionalDate,

        referenceDate: optionalDate,

        status: z.enum(processStatuses).default("DRAFT"),

        notes: optionalText(10000),
    })
    .superRefine((data, context) => {
        if (!data.appointmentDate || !data.deadlineDate) {
            return;
        }

        const appointmentDate = new Date(data.appointmentDate);
        const deadlineDate = new Date(data.deadlineDate);

        if (deadlineDate < appointmentDate) {
            context.addIssue({
                code: "custom",
                path: ["deadlineDate"],
                message:
                    "O prazo não pode ser anterior à data da nomeação.",
            });
        }
    });

export type LegalProcessCreateInput = z.infer<
    typeof legalProcessCreateSchema
>;