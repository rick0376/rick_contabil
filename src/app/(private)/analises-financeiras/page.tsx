// src/app/(private)/analises-financeiras/page.tsx

import {
    ArrowLeft,
    ArrowRight,
    Calculator,
    CarFront,
    ChartNoAxesCombined,
    FileSearch2,
    Landmark,
} from "lucide-react";
import Link from "next/link";
import BackToDashboard from "@/components/navigation/BackToDashboard/BackToDashboard";

import styles from "./styles.module.scss";

export default function FinancialAnalysisPage() {
    return (
        <main className={styles.page}>

            <Link href="/dashboard" className={styles.backButton}>
                <ArrowLeft size={18} />
                Voltar ao Dashboard
            </Link>

            <section className={styles.hero}>
                <div>
                    <span className={styles.badge}>
                        Análises financeiras
                    </span>

                    <h1>
                        Módulos de análise contratual
                    </h1>

                    <p>
                        Reconstitua operações financeiras,
                        compare taxas, identifique
                        divergências e preserve a memória
                        completa dos cálculos.
                    </p>
                </div>

                <div className={styles.heroIcon}>
                    <ChartNoAxesCombined
                        size={34}
                    />
                </div>
            </section>

            <section className={styles.sectionHeader}>
                <div>
                    <span>Módulos disponíveis</span>

                    <h2>
                        Escolha a análise
                    </h2>
                </div>

                <FileSearch2 size={25} />
            </section>

            <div className={styles.moduleGrid}>
                <Link
                    href="/analises-financeiras/financiamento-veiculo"
                    className={styles.moduleCard}
                >
                    <div className={styles.moduleIcon}>
                        <CarFront size={29} />
                    </div>

                    <div>
                        <span>
                            Financiamento bancário
                        </span>

                        <h3>
                            Financiamento de veículo
                        </h3>

                        <p>
                            Compare a taxa contratada
                            com a taxa efetivamente
                            aplicada, gere as duas
                            evoluções Price e apure a
                            diferença entre as parcelas.
                        </p>
                    </div>

                    <ArrowRight size={21} />
                </Link>

                <article className={styles.futureCard}>
                    <div className={styles.futureIcon}>
                        <Landmark size={27} />
                    </div>

                    <div>
                        <span>Expansão futura</span>

                        <h3>
                            Novos métodos
                        </h3>

                        <p>
                            Taxa Bacen, Gauss, juros
                            simples, SAC, CET, liquidação
                            antecipada e encargos
                            moratórios.
                        </p>
                    </div>

                    <Calculator size={21} />
                </article>
            </div>
        </main>
    );
}