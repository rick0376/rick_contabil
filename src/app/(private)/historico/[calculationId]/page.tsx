//src/app/(private)/historico/[calculationId]/page.tsx

import {
    Calculator,
    FileClock,
    History,
    ShieldCheck,
} from "lucide-react";

import CalculationDetails from "@/components/calculations/CalculationDetails/CalculationDetails";

import styles from "./styles.module.scss";

type CalculationDetailsPageProps = {
    params: Promise<{
        calculationId: string;
    }>;
};

export default async function CalculationDetailsPage({
    params,
}: CalculationDetailsPageProps) {
    const { calculationId } = await params;

    return (
        <main className={styles.page}>
            <section className={styles.hero}>
                <div>
                    <span className={styles.badge}>
                        Memória profissional
                    </span>

                    <h1>Detalhes do cálculo</h1>

                    <p>
                        Consulte entradas, resultados, metodologia, fórmulas,
                        revisões e linhas que compõem a memória de cálculo.
                    </p>
                </div>

                <div className={styles.heroStatus}>
                    <div className={styles.heroIcon}>
                        <History size={29} />
                    </div>

                    <div>
                        <strong>Registro auditável</strong>
                        <span>Histórico e versões preservadas</span>
                    </div>

                    <ShieldCheck size={22} />
                </div>
            </section>

            <section className={styles.sectionHeader}>
                <div>
                    <span>Histórico de cálculos</span>
                    <h2>Memória completa</h2>
                </div>

                <div className={styles.sectionIcons}>
                    <Calculator size={21} />
                    <FileClock size={21} />
                </div>
            </section>

            <CalculationDetails calculationId={calculationId} />
        </main>
    );
}