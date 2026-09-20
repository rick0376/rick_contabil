// src/components/dashboard/CalculatorCard/CalculatorCard.tsx

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import styles from "./styles.module.scss";

type CalculatorCardProps = {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
};

export default function CalculatorCard({
    title,
    description,
    href,
    icon: Icon,
}: CalculatorCardProps) {
    return (
        <Link href={href} className={styles.card}>
            <div className={styles.icon}>
                <Icon size={26} />
            </div>

            <div>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>

            <span className={styles.action}>Abrir módulo →</span>
        </Link>
    );
}