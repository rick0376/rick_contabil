// src/app/(private)/laudos/novo/page.tsx

import {
    FilePlus2,
    ShieldCheck,
} from "lucide-react";

import CreateExpertReportForm from "@/components/reports/CreateExpertReportForm/CreateExpertReportForm";

import styles from "./styles.module.scss";

type NewExpertReportPageProps = {
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

export default async function NewExpertReportPage({
    searchParams,
}: NewExpertReportPageProps) {
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
            <section
                className={styles.hero}
            >
                <div>
                    <span
                        className={
                            styles.badge
                        }
                    >
                        Documento técnico
                    </span>

                    <h1>
                        Gerar laudo pericial
                    </h1>

                    <p>
                        Crie a primeira revisão do
                        laudo a partir de uma versão
                        específica e imutável do
                        cálculo.
                    </p>
                </div>

                <div
                    className={
                        styles.heroStatus
                    }
                >
                    <div
                        className={
                            styles.heroIcon
                        }
                    >
                        <FilePlus2
                            size={28}
                        />
                    </div>

                    <div>
                        <strong>
                            Laudo versionado
                        </strong>

                        <span>
                            Cálculo, fórmulas e
                            memória preservados
                        </span>
                    </div>

                    <ShieldCheck
                        size={22}
                    />
                </div>
            </section>

            <CreateExpertReportForm
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