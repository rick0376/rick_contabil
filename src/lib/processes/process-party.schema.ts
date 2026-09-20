//src/lib/processes/process-party.schema.ts

import { z } from "zod";

const processPartyRoles = [
    "PLAINTIFF",
    "DEFENDANT",
    "INTERESTED_PARTY",
    "THIRD_PARTY",
    "EXPERT_ASSISTANT",
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

export const processPartyCreateSchema = z.object({
    clientId: z.string().min(1, "Selecione um cliente."),

    role: z.enum(processPartyRoles),

    isPrimary: z.boolean().default(false),

    notes: optionalText(3000),
});

export const processPartyDeleteSchema = z.object({
    partyId: z.string().min(1, "Informe a parte que será removida."),
});

export type ProcessPartyCreateInput = z.infer<
    typeof processPartyCreateSchema
>;