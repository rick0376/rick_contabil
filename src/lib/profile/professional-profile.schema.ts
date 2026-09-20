//src/lib/profile/professional-profile.schema.ts

import { z } from "zod";

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

const optionalEmail = z.preprocess(
    (value) => {
        if (typeof value !== "string") {
            return value;
        }

        const normalized = value.trim().toLowerCase();

        return normalized === "" ? undefined : normalized;
    },
    z
        .string()
        .email("Informe um endereço de e-mail válido.")
        .max(160)
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

const optionalCpf = z.preprocess(
    (value) => {
        if (typeof value !== "string") {
            return value;
        }

        const normalized = value.replace(/\D/g, "");

        return normalized === "" ? undefined : normalized;
    },
    z
        .string()
        .length(11, "O CPF deve possuir 11 dígitos.")
        .optional(),
);

const optionalZipCode = z.preprocess(
    (value) => {
        if (typeof value !== "string") {
            return value;
        }

        const normalized = value.replace(/\D/g, "");

        return normalized === "" ? undefined : normalized;
    },
    z
        .string()
        .length(8, "O CEP deve possuir 8 dígitos.")
        .optional(),
);

export const professionalProfileSchema = z.object({
    fullName: z
        .string()
        .trim()
        .min(2, "Informe o nome completo.")
        .max(160),

    cpf: optionalCpf,

    crcNumber: optionalText(40),

    crcState: optionalState,

    crcCategory: optionalText(60),

    businessName: optionalText(160),

    email: optionalEmail,

    phone: optionalText(30),

    whatsapp: optionalText(30),

    addressLine: optionalText(200),

    addressNumber: optionalText(30),

    addressComplement: optionalText(120),

    district: optionalText(120),

    city: optionalText(120),

    state: optionalState,

    zipCode: optionalZipCode,

    reportClosingText: optionalText(10000),

    signatureName: optionalText(160),

    signatureTitle: optionalText(160),
});

export type ProfessionalProfileInput = z.infer<
    typeof professionalProfileSchema
>;