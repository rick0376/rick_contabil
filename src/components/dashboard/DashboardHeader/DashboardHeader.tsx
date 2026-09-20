// src/components/dashboard/DashboardHeader/DashboardHeader.tsx

import styles from "./styles.module.scss";

type DashboardHeaderProps = {
    userName: string;
};

export default function DashboardHeader({
    userName,
}: DashboardHeaderProps) {
    return (
        <section className={styles.header}>
            <div>
                <span className={styles.badge}>Painel principal</span>
                <h1>Olá, {userName}</h1>
                <p>
                    Escolha uma ferramenta para iniciar seu cálculo contábil.
                </p>
            </div>

            <div className={styles.status}>
                <span className={styles.statusDot} />
                Sistema conectado
            </div>
        </section>
    );
}