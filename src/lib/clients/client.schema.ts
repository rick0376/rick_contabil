// lhp-sistema-contabil/src/lib/clients/client.schema.ts

import { z } from "zod";

const clientTypes = ["INDIVIDUAL", "COMPANY"] as const;

const addressTypes = [
    "RESIDENTIAL",
    "COMMERCIAL",
    "CORRESPONDENCE",
    "OTHER",
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

export const clientAddressSchema = z.object({
    type: z.enum(addressTypes).default("RESIDENTIAL"),

    street: z
        .string()
        .trim()
        .min(2, "Informe o logradouro.")
        .max(160, "O logradouro deve possuir no máximo 160 caracteres."),

    number: optionalText(30),

    complement: optionalText(100),

    district: optionalText(100),

    city: z
        .string()
        .trim()
        .min(2, "Informe a cidade.")
        .max(100, "A cidade deve possuir no máximo 100 caracteres."),

    state: z
        .string()
        .trim()
        .length(2, "Informe a sigla do estado com 2 caracteres.")
        .transform((value) => value.toUpperCase()),

    zipCode: optionalText(12),

    country: z
        .string()
        .trim()
        .min(2, "Informe o país.")
        .max(80, "O país deve possuir no máximo 80 caracteres.")
        .default("Brasil"),

    isPrimary: z.boolean().default(false),
});

export const clientCreateSchema = z
    .object({
        type: z.enum(clientTypes),

        name: z
            .string()
            .trim()
            .min(2, "Informe o nome do cliente.")
            .max(160, "O nome deve possuir no máximo 160 caracteres."),

        tradeName: optionalText(160),

        documentNumber: optionalText(30),

        secondaryDocument: optionalText(30),

        stateRegistration: optionalText(30),

        birthOrFoundationDate: optionalDate,

        email: z.preprocess(
            (value) => {
                if (typeof value !== "string") {
                    return value;
                }

                const normalized = value.trim().toLowerCase();

                return normalized === "" ? undefined : normalized;
            },
            z
                .string()
                .email("Informe um e-mail válido.")
                .max(160, "O e-mail deve possuir no máximo 160 caracteres.")
                .optional(),
        ),

        phone: optionalText(30),

        mobile: optionalText(30),

        notes: optionalText(5000),

        addresses: z.array(clientAddressSchema).max(5).default([]),
    })
    .superRefine((data, context) => {
        const primaryAddressCount = data.addresses.filter(
            (address) => address.isPrimary,
        ).length;

        if (primaryAddressCount > 1) {
            context.addIssue({
                code: "custom",
                path: ["addresses"],
                message: "Somente um endereço pode ser definido como principal.",
            });
        }

        const documentNumber =
            data.documentNumber?.replace(/\D/g, "") ?? "";

        if (
            data.type === "INDIVIDUAL" &&
            documentNumber &&
            documentNumber.length !== 11
        ) {
            context.addIssue({
                code: "custom",
                path: ["documentNumber"],
                message: "O CPF deve possuir 11 dígitos.",
            });
        }

        if (
            data.type === "COMPANY" &&
            documentNumber &&
            documentNumber.length !== 14
        ) {
            context.addIssue({
                code: "custom",
                path: ["documentNumber"],
                message: "O CNPJ deve possuir 14 dígitos.",
            });
        }
    });

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;