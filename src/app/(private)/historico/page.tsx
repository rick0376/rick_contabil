//src/app/(private)/historico/page.tsx

import {
    Calculator,
    FileClock,
    History,
    ShieldCheck,
} from "lucide-react";

import BackToDashboard from "@/components/navigation/BackToDashboard/BackToDashboard";
import CalculationHistory from "@/components/calculations/CalculationHistory/CalculationHistory";

import styles from "./styles.module.scss";

export default function HistoryPage() {
    return (
        <main className={styles.page}>
            <BackToDashboard />
            <section className={styles.hero}>
                <div>
                    <span className={styles.badge}>
                        Memória profissional
                    </span>

                    <h1>Histórico de cálculos</h1>

                    <p>
                        Consulte cálculos salvos, clientes relacionados, processos,
                        versões e situação de cada memória de cálculo.
                    </p>
                </div>

                <div className={styles.heroStatus}>
                    <div className={styles.heroIcon}>
                        <History size={29} />
                    </div>

                    <div>
                        <strong>Registros preservados</strong>
                        <span>Controle de versões e auditoria</span>
                    </div>

                    <ShieldCheck size={22} />
                </div>
            </section>

            <section className={styles.sectionHeader}>
                <div>
                    <span>Consultas</span>
                    <h2>Memórias de cálculo cadastradas</h2>
                </div>

                <div className={styles.sectionIcons}>
                    <Calculator size={21} />
                    <FileClock size={21} />
                </div>
            </section>

            <CalculationHistory />
        </main>
    );
}