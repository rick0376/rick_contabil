//src/app/(private)/processos/page.tsx

import {
    BriefcaseBusiness,
    FileSearch,
    Scale,
    ShieldCheck,
} from "lucide-react";

import BackToDashboard from "@/components/navigation/BackToDashboard/BackToDashboard";
import ProcessManager from "@/components/processes/ProcessManager/ProcessManager";

import styles from "./styles.module.scss";

export default function ProcessesPage() {
    return (
        <main className={styles.page}>
            <BackToDashboard />
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <span className={styles.badge}>Gestão pericial</span>

                    <h1>Processos</h1>

                    <p>
                        Organize processos judiciais, clientes envolvidos, objeto da
                        perícia, prazos, cálculos, documentos e futuros laudos.
                    </p>
                </div>

                <div className={styles.heroStatus}>
                    <div className={styles.heroIcon}>
                        <Scale size={30} />
                    </div>

                    <div>
                        <strong>Controle centralizado</strong>
                        <span>Processos, partes e perícias</span>
                    </div>

                    <ShieldCheck size={22} />
                </div>
            </section>

            <section className={styles.sectionHeader}>
                <div>
                    <span>Gerenciamento</span>
                    <h2>Cadastro e consulta de processos</h2>
                </div>

                <div className={styles.sectionIcons}>
                    <FileSearch size={21} />
                    <BriefcaseBusiness size={21} />
                </div>
            </section>

            <ProcessManager />
        </main>
    );
}