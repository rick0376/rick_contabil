// src/components/navigation/BackToDashboard/BackToDashboard.tsx

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import styles from "./styles.module.scss";

export default function BackToDashboard() {
    return (
        <Link href="/dashboard" className={styles.backButton}>
            <ArrowLeft size={18} />
            Voltar ao Dashboard
        </Link>
    );
}