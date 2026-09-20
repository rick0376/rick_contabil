// src/app/(private)/analise-pericial/page.tsx

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import AnalisePericialCalculator from "@/components/calculators/AnalisePericialCalculator/AnalisePericialCalculator";

import styles from "./styles.module.scss";

type AnalisePericialPageProps = {
    searchParams: Promise<{
        calculationId?: string | string[];
        version?: string | string[];
    }>;
};

function getSearchParam(
    value: string | string[] | undefined,
) {
    return Array.isArray(value)
        ? value[0]
        : value;
}

function parseVersion(
    value: string | undefined,
) {
    if (!value) {
        return undefined;
    }

    const version = Number(value);

    if (
        !Number.isInteger(version) ||
        version <= 0
    ) {
        return undefined;
    }

    return version;
}

export default async function AnalisePericialPage({
    searchParams,
}: AnalisePericialPageProps) {
    const params = await searchParams;

    const calculationId = getSearchParam(
        params.calculationId,
    );

    const calculationVersion = parseVersion(
        getSearchParam(params.version),
    );

    return (
        <div className={styles.page}>
            <Link
                href="/dashboard"
                className={styles.backButton}
            >
                <ArrowLeft size={18} />
                Voltar ao Dashboard
            </Link>

            <header className={styles.header}>
                <span>Cálculo pericial</span>

                <h1>
                    Análise Pericial Contábil
                </h1>

                <p>
                    Atualize valores com correção
                    monetária, juros de mora, multa,
                    honorários, custas e pagamentos
                    realizados.
                </p>
            </header>

            <AnalisePericialCalculator
                calculationId={calculationId}
                calculationVersion={
                    calculationVersion
                }
            />
        </div>
    );
}