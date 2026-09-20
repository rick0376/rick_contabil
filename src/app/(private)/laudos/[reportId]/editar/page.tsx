// src/app/(private)/laudos/[reportId]/editar/page.tsx

import {
    Eye,
    FilePenLine,
    History,
    ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import ExpertReportEditor from "@/components/reports/ExpertReportEditor/ExpertReportEditor";

import styles from "./styles.module.scss";

type EditExpertReportPageProps = {
    params: Promise<{
        reportId: string;
    }>;
};

export default async function EditExpertReportPage({
    params,
}: EditExpertReportPageProps) {
    const { reportId } = await params;

    const encodedReportId =
        encodeURIComponent(reportId);

    return (
        <main className={styles.page}>
            <section className={styles.hero}>
                <div>
                    <span className={styles.badge}>
                        Revisão técnica
                    </span>

                    <h1>Editor do laudo</h1>

                    <p>
                        Revise o texto, organize as
                        seções e prepare o documento
                        para visualização, impressão
                        e exportação.
                    </p>
                </div>

                <div className={styles.heroStatus}>
                    <div className={styles.heroIcon}>
                        <FilePenLine size={28} />
                    </div>

                    <div>
                        <strong>
                            Conteúdo auditável
                        </strong>

                        <span>
                            Revisões e cálculos
                            preservados
                        </span>
                    </div>

                    <ShieldCheck size={22} />
                </div>
            </section>

            <section className={styles.sectionHeader}>
                <div>
                    <span>Laudo pericial</span>

                    <h2>
                        Conteúdo da revisão
                    </h2>
                </div>

                <div className={styles.sectionActions}>
                    <Link
                        href={`/laudos/${encodedReportId}/visualizar`}
                        className={styles.previewButton}
                    >
                        <Eye size={17} />
                        Visualizar A4
                    </Link>

                    <div className={styles.sectionIcon}>
                        <History size={22} />
                    </div>
                </div>
            </section>

            <ExpertReportEditor
                reportId={reportId}
            />
        </main>
    );
}