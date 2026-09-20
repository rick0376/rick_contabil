// src/lib/financial-analysis/vehicle-financing.dates.ts

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

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(
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
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !==
        month - 1 ||
        date.getUTCDate() !== day
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

function formatIsoDate(
    year: number,
    month: number,
    day: number,
) {
    return [
        String(year).padStart(
            4,
            "0",
        ),

        String(month).padStart(
            2,
            "0",
        ),

        String(day).padStart(
            2,
            "0",
        ),
    ].join("-");
}

export function isValidIsoDate(
    value: string,
) {
    return parseIsoDate(value) !==
        null;
}

export function compareIsoDates(
    left: string,
    right: string,
) {
    if (left === right) {
        return 0;
    }

    return left < right ? -1 : 1;
}

export function addMonthsClamped(
    isoDate: string,
    monthsToAdd: number,
) {
    const parsed =
        parseIsoDate(isoDate);

    if (!parsed) {
        throw new Error(
            "Data inválida para geração das prestações.",
        );
    }

    const totalMonths =
        parsed.year * 12 +
        (parsed.month - 1) +
        monthsToAdd;

    const targetYear =
        Math.floor(totalMonths / 12);

    const targetMonthIndex =
        totalMonths % 12;

    const targetMonth =
        targetMonthIndex + 1;

    const targetDay = Math.min(
        parsed.day,
        getDaysInMonth(
            targetYear,
            targetMonth,
        ),
    );

    return formatIsoDate(
        targetYear,
        targetMonth,
        targetDay,
    );
}

export function getExpectedFinalDueDate(
    firstDueDate: string,
    installments: number,
) {
    return addMonthsClamped(
        firstDueDate,
        installments - 1,
    );
}