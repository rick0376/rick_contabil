// src/lib/reports/expert-report-hash.ts

import { createHash } from "node:crypto";

export type CanonicalJson =
    | string
    | number
    | boolean
    | null
    | CanonicalJson[]
    | {
        [key: string]: CanonicalJson;
    };

function isDecimalLike(
    value: object,
) {
    const constructorName =
        value.constructor?.name;

    return (
        constructorName === "Decimal" &&
        typeof (
            value as {
                toString?: unknown;
            }
        ).toString === "function"
    );
}

export function toCanonicalJson(
    value: unknown,
): CanonicalJson {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (
        typeof value === "string" ||
        typeof value === "boolean"
    ) {
        return value;
    }

    if (typeof value === "number") {
        return Number.isFinite(value)
            ? value
            : null;
    }

    if (typeof value === "bigint") {
        return value.toString();
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (Array.isArray(value)) {
        return value.map((item) =>
            toCanonicalJson(item),
        );
    }

    if (typeof value === "object") {
        if (isDecimalLike(value)) {
            return String(value);
        }

        const normalizedEntries =
            Object.entries(
                value as Record<
                    string,
                    unknown
                >,
            )
                .filter(
                    ([, item]) =>
                        item !== undefined,
                )
                .sort(([left], [right]) =>
                    left.localeCompare(
                        right,
                        "en",
                    ),
                );

        return normalizedEntries.reduce<
            Record<string, CanonicalJson>
        >(
            (
                normalized,
                [key, item],
            ) => {
                normalized[key] =
                    toCanonicalJson(item);

                return normalized;
            },
            {},
        );
    }

    return String(value);
}

export function stableStringify(
    value: unknown,
) {
    return JSON.stringify(
        toCanonicalJson(value),
    );
}

export function createIntegrityHash(
    value: unknown,
) {
    return createHash("sha256")
        .update(
            stableStringify(value),
            "utf8",
        )
        .digest("hex");
}