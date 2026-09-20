// src/app/(private)/laudos/page.tsx

import {
    FileSearch2,
    Files,
    History,
    ShieldCheck,
} from "lucide-react";

import ExpertReportList from "@/components/reports/ExpertReportList/ExpertReportList";

import styles from "./styles.module.scss";

export default function ExpertReportsPage() {
    return (
        <main className={styles.page}>
            <section className={styles.hero}>
                <div>
                    <span className={styles.badge}>
                        Documentos técnicos
                    </span>

                    <h1>
                        Laudos periciais
                    </h1>

                    <p>
                        Consulte rascunhos, documentos
                        em revisão, laudos finalizados,
                        revisões anteriores e arquivos
                        gerados.
                    </p>
                </div>

                <div className={styles.heroStatus}>
                    <div className={styles.heroIcon}>
                        <Files size={29} />
                    </div>

                    <div>
                        <strong>
                            Controle documental
                        </strong>

                        <span>
                            Revisões e integridade
                            preservadas
                        </span>
                    </div>

                    <ShieldCheck size={22} />
                </div>
            </section>

            <section className={styles.sectionHeader}>
                <div>
                    <span>
                        Gestão de documentos
                    </span>

                    <h2>
                        Laudos registrados
                    </h2>
                </div>

                <div className={styles.sectionIcons}>
                    <FileSearch2 size={21} />
                    <History size={21} />
                </div>
            </section>

            <ExpertReportList />
        </main>
    );
}