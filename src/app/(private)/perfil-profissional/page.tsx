//src/app/(private)/perfil-profissional/page.tsx

import {
    FileText,
    IdCard,
    ShieldCheck,
    UserRound,
} from "lucide-react";

import BackToDashboard from "@/components/navigation/BackToDashboard/BackToDashboard";
import ProfessionalProfileForm from "@/components/profile/ProfessionalProfileForm/ProfessionalProfileForm";

import styles from "./styles.module.scss";

export default function ProfessionalProfilePage() {
    return (
        <main className={styles.page}>
            <BackToDashboard />
            <section className={styles.hero}>
                <div>
                    <span className={styles.badge}>
                        Identidade profissional
                    </span>

                    <h1>Perfil profissional</h1>

                    <p>
                        Cadastre os dados que serão utilizados nas memórias de
                        cálculo, laudos periciais, documentos e assinaturas.
                    </p>
                </div>

                <div className={styles.heroStatus}>
                    <div className={styles.heroIcon}>
                        <UserRound size={29} />
                    </div>

                    <div>
                        <strong>Dados centralizados</strong>
                        <span>Perfil, CRC e assinatura</span>
                    </div>

                    <ShieldCheck size={22} />
                </div>
            </section>

            <section className={styles.sectionHeader}>
                <div>
                    <span>Configurações profissionais</span>
                    <h2>Dados do contador ou perito</h2>
                </div>

                <div className={styles.sectionIcons}>
                    <IdCard size={21} />
                    <FileText size={21} />
                </div>
            </section>

            <ProfessionalProfileForm />
        </main>
    );
}