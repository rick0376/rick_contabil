//src/lib/calculations/reopen-calculation.ts

export type CalculationStatus =
    | "DRAFT"
    | "CALCULATED"
    | "FINALIZED"
    | "ARCHIVED";

export type JsonRecord = Record<string, unknown>;

type CalculationRevisionResponse = {
    version: number;
    referenceDate: string | null;
    input: unknown;
    result: unknown;
};

type CalculationResponse = {
    calculation?: {
        id: string;
        type: string;
        title: string | null;
        description: string | null;
        status: CalculationStatus;
        referenceDate: string | null;
        currentVersion: number;
        revisions: CalculationRevisionResponse[];
    };

    message?: string;
};

export type ReopenedCalculation = {
    id: string;
    title: string;
    description: string;
    status: Exclude<CalculationStatus, "ARCHIVED">;
    referenceDate: string | null;
    currentVersion: number;
    sourceVersion: number;
    input: JsonRecord;
    result: JsonRecord;
};

function isJsonRecord(
    value: unknown,
): value is JsonRecord {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

export function normalizeCalculationType(
    type: string,
) {
    return type
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");
}

export function getStringValue(
    record: JsonRecord,
    key: string,
    fallback = "",
) {
    const value = record[key];

    if (typeof value === "string") {
        return value;
    }

    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return String(value);
    }

    return fallback;
}

export async function loadCalculationRevision({
    calculationId,
    expectedType,
    requestedVersion,
}: {
    calculationId: string;
    expectedType: string | string[];
    requestedVersion?: number;
}): Promise<ReopenedCalculation> {
    const response = await fetch(
        `/api/calculations/${encodeURIComponent(
            calculationId,
        )}`,
        {
            method: "GET",
            cache: "no-store",
        },
    );

    const payload =
        (await response.json()) as CalculationResponse;

    if (!response.ok || !payload.calculation) {
        throw new Error(
            payload.message ??
            "Não foi possível carregar o cálculo.",
        );
    }

    const calculation = payload.calculation;

    const expectedTypes = (
        Array.isArray(expectedType)
            ? expectedType
            : [expectedType]
    ).map(normalizeCalculationType);

    if (
        !expectedTypes.includes(
            normalizeCalculationType(
                calculation.type,
            ),
        )
    ) {
        throw new Error(
            "O cálculo selecionado pertence a outro módulo.",
        );
    }

    if (calculation.status === "ARCHIVED") {
        throw new Error(
            "O cálculo selecionado está arquivado e não pode ser reaberto.",
        );
    }

    const revision = requestedVersion
        ? calculation.revisions.find(
            (item) =>
                item.version === requestedVersion,
        )
        : calculation.revisions[0];

    if (!revision) {
        throw new Error(
            "A revisão selecionada não foi encontrada.",
        );
    }

    if (!isJsonRecord(revision.input)) {
        throw new Error(
            "Os dados de entrada desta revisão são incompatíveis com o módulo.",
        );
    }

    return {
        id: calculation.id,

        title:
            calculation.title ??
            `Cálculo ${normalizeCalculationType(
                calculation.type,
            )}`,

        description:
            calculation.description ?? "",

        status: calculation.status,

        referenceDate:
            revision.referenceDate ??
            calculation.referenceDate,

        currentVersion:
            calculation.currentVersion,

        sourceVersion: revision.version,

        input: revision.input,

        result: isJsonRecord(revision.result)
            ? revision.result
            : {},
    };
}