// src/app/(private)/laudos/[reportId]/revisoes/page.tsx

import {
    FileClock,
    History,
    ShieldCheck,
} from "lucide-react";

import ExpertReportRevisionHistory from "@/components/reports/ExpertReportRevisionHistory/ExpertReportRevisionHistory";

import styles from "./styles.module.scss";

type ReportRevisionsPageProps = {
    params: Promise<{
        reportId: string;
    }>;
};

export default async function ReportRevisionsPage({
    params,
}: ReportRevisionsPageProps) {
    const { reportId } =
        await params;

    return (
        <main className={styles.page}>
            <section className={styles.hero}>
                <div>
                    <span className={styles.badge}>
                        Controle de versões
                    </span>

                    <h1>
                        Revisões do laudo
                    </h1>

                    <p>
                        Consulte versões anteriores,
                        arquivos gerados, cálculos de
                        origem e hashes de integridade.
                    </p>
                </div>

                <div className={styles.heroStatus}>
                    <div className={styles.heroIcon}>
                        <History size={29} />
                    </div>

                    <div>
                        <strong>
                            Histórico preservado
                        </strong>

                        <span>
                            Versões antigas não são
                            sobrescritas
                        </span>
                    </div>

                    <ShieldCheck size={22} />
                </div>
            </section>

            <section className={styles.sectionHeader}>
                <div>
                    <span>
                        Rastreabilidade
                    </span>

                    <h2>
                        Histórico completo
                    </h2>
                </div>

                <FileClock size={22} />
            </section>

            <ExpertReportRevisionHistory
                reportId={reportId}
            />
        </main>
    );
}