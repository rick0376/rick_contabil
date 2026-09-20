// src/app/(private)/sistema-sac/page.tsx

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import SistemaSacCalculator from "@/components/calculators/SistemaSacCalculator/SistemaSacCalculator";

import styles from "./styles.module.scss";

type SistemaSacPageProps = {
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

export default async function SistemaSacPage({
    searchParams,
}: SistemaSacPageProps) {
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
                <span>Sistema de amortização</span>

                <h1>Calculadora do Sistema SAC</h1>

                <p>
                    Calcule amortizações constantes, parcelas
                    decrescentes, juros e saldo devedor.
                </p>
            </header>

            <SistemaSacCalculator
                calculationId={calculationId}
                calculationVersion={calculationVersion}
            />
        </div>
    );
}