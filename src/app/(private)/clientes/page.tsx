//src/app/(private)/clientes/page.tsx

import { ShieldCheck, UserRoundPlus, UsersRound } from "lucide-react";

import BackToDashboard from "@/components/navigation/BackToDashboard/BackToDashboard";
import ClientManager from "@/components/clients/ClientManager/ClientManager";

import styles from "./styles.module.scss";

export default function ClientsPage() {
    return (
        <main className={styles.page}>
            <BackToDashboard />
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <span className={styles.badge}>Cadastros profissionais</span>

                    <h1>Clientes</h1>

                    <p>
                        Cadastre pessoas físicas e jurídicas que poderão ser relacionadas
                        aos processos, cálculos, memórias e laudos periciais.
                    </p>
                </div>

                <div className={styles.heroHighlights}>
                    <div className={styles.heroIcon}>
                        <UsersRound size={30} />
                    </div>

                    <div>
                        <strong>Base centralizada</strong>
                        <span>Dados protegidos por usuário</span>
                    </div>

                    <ShieldCheck className={styles.securityIcon} size={22} />
                </div>
            </section>

            <section className={styles.sectionHeader}>
                <div>
                    <span>Gerenciamento</span>
                    <h2>Cadastro e consulta de clientes</h2>
                </div>

                <div className={styles.sectionIcon}>
                    <UserRoundPlus size={22} />
                </div>
            </section>

            <ClientManager />
        </main>
    );
}