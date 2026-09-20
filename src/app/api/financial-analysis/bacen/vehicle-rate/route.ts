// src/app/api/financial-analysis/bacen/vehicle-rate/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import { getCurrentAppUser } from "@/lib/auth/current-user";

export const runtime = "nodejs";

const VEHICLE_RATE_SERIES_CODE =
    25471;

const VEHICLE_RATE_SERIES_NAME =
    "Taxa média mensal de juros das operações de crédito com recursos livres — Pessoas físicas — Aquisição de veículos";

type BacenSeriesPoint = {
    data?: unknown;
    valor?: unknown;
};

function parseIsoDate(
    value: string,
) {
    const match =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(
            value,
        );

    if (!match) {
        return null;
    }

    const year =
        Number(match[1]);

    const month =
        Number(match[2]);

    const day =
        Number(match[3]);

    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day,
                12,
                0,
                0,
            ),
        );

    if (
        date.getUTCFullYear() !==
        year ||
        date.getUTCMonth() !==
        month - 1 ||
        date.getUTCDate() !==
        day
    ) {
        return null;
    }

    return {
        year,
        month,
        day,
    };
}

function getDaysInMonth(
    year: number,
    month: number,
) {
    return new Date(
        Date.UTC(
            year,
            month,
            0,
            12,
            0,
            0,
        ),
    ).getUTCDate();
}

function formatBrazilianDate(
    year: number,
    month: number,
    day: number,
) {
    return [
        String(day).padStart(
            2,
            "0",
        ),

        String(month).padStart(
            2,
            "0",
        ),

        String(year).padStart(
            4,
            "0",
        ),
    ].join("/");
}

function parseBacenValue(
    value: unknown,
) {
    if (
        typeof value ===
        "number"
    ) {
        return value;
    }

    if (
        typeof value !==
        "string"
    ) {
        return Number.NaN;
    }

    return Number(
        value
            .trim()
            .replace(",", "."),
    );
}

function normalizeObservationDate(
    value: unknown,
) {
    if (
        typeof value !==
        "string"
    ) {
        return null;
    }

    const match =
        /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(
            value.trim(),
        );

    if (!match) {
        return null;
    }

    return [
        match[3],
        match[2],
        match[1],
    ].join("-");
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

    const dateValue =
        request.nextUrl.searchParams
            .get("date")
            ?.trim() ?? "";

    const parsedDate =
        parseIsoDate(dateValue);

    if (!parsedDate) {
        return NextResponse.json(
            {
                message:
                    "Informe uma data válida no formato AAAA-MM-DD.",
            },
            {
                status: 400,
            },
        );
    }

    const startDate =
        formatBrazilianDate(
            parsedDate.year,
            parsedDate.month,
            1,
        );

    const endDate =
        formatBrazilianDate(
            parsedDate.year,
            parsedDate.month,
            getDaysInMonth(
                parsedDate.year,
                parsedDate.month,
            ),
        );

    const referenceMonth =
        `${String(
            parsedDate.year,
        ).padStart(
            4,
            "0",
        )}-${String(
            parsedDate.month,
        ).padStart(
            2,
            "0",
        )}`;

    const bacenUrl =
        new URL(
            `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${VEHICLE_RATE_SERIES_CODE}/dados`,
        );

    bacenUrl.searchParams.set(
        "formato",
        "json",
    );

    bacenUrl.searchParams.set(
        "dataInicial",
        startDate,
    );

    bacenUrl.searchParams.set(
        "dataFinal",
        endDate,
    );

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () =>
                controller.abort(),
            12000,
        );

    try {
        const response =
            await fetch(
                bacenUrl,
                {
                    method: "GET",

                    headers: {
                        Accept:
                            "application/json",
                    },

                    cache:
                        "no-store",

                    signal:
                        controller.signal,
                },
            );

        if (!response.ok) {
            return NextResponse.json(
                {
                    message:
                        "O Banco Central não respondeu à consulta da taxa média.",
                },
                {
                    status: 502,
                },
            );
        }

        const payload:
            unknown =
            await response.json();

        if (
            !Array.isArray(payload)
        ) {
            return NextResponse.json(
                {
                    message:
                        "O Banco Central retornou um formato de dados inesperado.",
                },
                {
                    status: 502,
                },
            );
        }

        const points =
            payload as BacenSeriesPoint[];

        const point =
            points.find(
                (item) => {
                    const value =
                        parseBacenValue(
                            item.valor,
                        );

                    return Number.isFinite(
                        value,
                    );
                },
            );

        if (!point) {
            return NextResponse.json(
                {
                    message:
                        "Não foi encontrada taxa média para o mês informado. Utilize o preenchimento manual e registre a fonte consultada.",
                },
                {
                    status: 404,
                },
            );
        }

        const monthlyRatePercent =
            parseBacenValue(
                point.valor,
            );

        const observationDate =
            normalizeObservationDate(
                point.data,
            );

        return NextResponse.json({
            seriesCode:
                VEHICLE_RATE_SERIES_CODE,

            seriesName:
                VEHICLE_RATE_SERIES_NAME,

            referenceMonth,

            observationDate,

            monthlyRatePercent,

            source:
                "Banco Central do Brasil — SGS",

            retrievedAt:
                new Date().toISOString(),
        });
    } catch (error) {
        const isAbortError =
            error instanceof Error &&
            error.name ===
            "AbortError";

        console.error(
            "Erro ao consultar a taxa média de financiamento de veículos no Banco Central:",
            error,
        );

        return NextResponse.json(
            {
                message:
                    isAbortError
                        ? "A consulta ao Banco Central excedeu o tempo limite. Tente novamente ou informe a taxa manualmente."
                        : "Não foi possível consultar a taxa média no Banco Central. Tente novamente ou informe a taxa manualmente.",
            },
            {
                status: 502,
            },
        );
    } finally {
        clearTimeout(
            timeout,
        );
    }
}
