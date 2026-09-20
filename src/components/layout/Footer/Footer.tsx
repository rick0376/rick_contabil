// src/components/layout/Footer/Footer.tsx

import styles from "./styles.module.scss";

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div>
                <strong>LHP Sistema Contábil</strong>
                <p>Ferramentas para cálculos financeiros e perícia contábil.</p>
            </div>

            <div>
                <strong>Suporte</strong>
                <p>lhpsystems0376@gmail.com</p>
            </div>

            <div className={styles.bottom}>
                © 2026 LHPSYSTEMS. Todos os direitos reservados.
            </div>
        </footer>
    );
}