// src/app/(private)/analises-financeiras/financiamento-veiculo/page.tsx

import {
    ArrowLeft,
    CarFront,
} from "lucide-react";
import Link from "next/link";

import VehicleFinancingAnalysis from "@/components/financial-analysis/VehicleFinancingAnalysis/VehicleFinancingAnalysis";

import styles from "./styles.module.scss";

type VehicleFinancingPageProps = {
    searchParams: Promise<{
        calculationId?:
        | string
        | string[];

        version?:
        | string
        | string[];
    }>;
};

function getSearchParam(
    value:
        | string
        | string[]
        | undefined,
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

export default async function VehicleFinancingPage({
    searchParams,
}: VehicleFinancingPageProps) {
    const params =
        await searchParams;

    const calculationId =
        getSearchParam(
            params.calculationId,
        );

    const calculationVersion =
        parseVersion(
            getSearchParam(
                params.version,
            ),
        );

    return (
        <main className={styles.page}>
            <Link
                href="/analises-financeiras"
                className={styles.backButton}
            >
                <ArrowLeft size={18} />
                Voltar às análises
            </Link>

            <header className={styles.header}>
                <div className={styles.headerIcon}>
                    <CarFront size={31} />
                </div>

                <div>
                    <span>
                        Análise contratual
                    </span>

                    <h1>
                        Financiamento de veículo
                    </h1>

                    <p>
                        Reconstitua a operação,
                        descubra a taxa efetivamente
                        aplicada, compare com a taxa
                        contratada e apure as
                        diferenças das prestações.
                    </p>
                </div>
            </header>

            <VehicleFinancingAnalysis
                calculationId={
                    calculationId
                }
                calculationVersion={
                    calculationVersion
                }
            />
        </main>
    );
}