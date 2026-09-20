//src/app/(private)/juros-simples/page.tsx

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import JurosSimplesCalculator from "@/components/calculators/JurosSimplesCalculator/JurosSimplesCalculator";

import styles from "./styles.module.scss";

type JurosSimplesPageProps = {
    searchParams: Promise<{
        calculationId?: string | string[];
        version?: string | string[];
    }>;
};

function getSearchParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function parseVersion(value: string | undefined) {
    if (!value) {
        return undefined;
    }

    const version = Number(value);

    return Number.isInteger(version) && version > 0
        ? version
        : undefined;
}

export default async function JurosSimplesPage({
    searchParams,
}: JurosSimplesPageProps) {
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
                <span>Matemática financeira</span>

                <h1>Calculadora de Juros Simples</h1>

                <p>
                    Calcule os juros e o montante utilizando o
                    capital inicial, a taxa e o período.
                </p>
            </header>

            <JurosSimplesCalculator
                calculationId={calculationId}
                calculationVersion={calculationVersion}
            />
        </div>
    );
}