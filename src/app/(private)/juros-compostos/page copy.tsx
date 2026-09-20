// src/app/(private)/juros-compostos/page.tsx

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import JurosCompostosCalculator from "@/components/calculators/JurosCompostosCalculator/JurosCompostosCalculator";
import styles from "./styles.module.scss";

export default function JurosCompostosPage() {
    return (
        <div className={styles.page}>
            <Link href="/dashboard" className={styles.backButton}>
                <ArrowLeft size={18} />
                Voltar ao Dashboard
            </Link>

            <header className={styles.header}>
                <span>Matemática financeira</span>
                <h1>Calculadora de Juros Compostos</h1>
                <p>
                    Calcule capital, juros, montante, taxa ou período no regime de
                    capitalização composta.
                </p>
            </header>

            <JurosCompostosCalculator />
        </div>
    );
}