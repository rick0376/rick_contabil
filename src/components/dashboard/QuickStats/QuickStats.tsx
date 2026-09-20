// src/components/dashboard/QuickStats/QuickStats.tsx

import styles from "./styles.module.scss";

type QuickStatsProps = {
    title: string;
    value: string;
    description: string;
};

export default function QuickStats({
    title,
    value,
    description,
}: QuickStatsProps) {
    return (
        <article className={styles.card}>
            <span>{title}</span>
            <strong>{value}</strong>
            <p>{description}</p>
        </article>
    );
}