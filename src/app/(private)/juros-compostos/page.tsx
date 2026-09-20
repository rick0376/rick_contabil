//src/app/(private)/juros-compostos/page.tsx

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import JurosCompostosCalculator from "@/components/calculators/JurosCompostosCalculator/JurosCompostosCalculator";

import styles from "./styles.module.scss";

type JurosCompostosPageProps = {
    searchParams: Promise<{
        calculationId?: string | string[];
        version?: string | string[];
    }>;
};

function getSearchParam(
    value: string | string[] | undefined,
) {
    return Array.isArray(value) ? value[0] : value;
}

function parseVersion(value: string | undefined) {
    if (!value) {
        return undefined;
    }

    const version = Number(value);

    if (!Number.isInteger(version) || version <= 0) {
        return undefined;
    }

    return version;
}

export default async function JurosCompostosPage({
    searchParams,
}: JurosCompostosPageProps) {
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

                <h1>
                    Calculadora de Juros Compostos
                </h1>

                <p>
                    Calcule capital, juros, montante,
                    taxa ou período no regime de
                    capitalização composta.
                </p>
            </header>

            <JurosCompostosCalculator
                calculationId={calculationId}
                calculationVersion={
                    calculationVersion
                }
            />
        </div>
    );
}