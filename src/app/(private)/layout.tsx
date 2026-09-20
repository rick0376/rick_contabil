// src/app/(private)/layout.tsx

import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth/session";
import Header from "@/components/layout/Header/Header";
import Footer from "@/components/layout/Footer/Footer";
import styles from "./styles.module.scss";

export default async function PrivateLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await getAppSession();

    if (!session) {
        redirect("/login");
    }

    return (
        <div className={styles.layout}>
            <Header userName={session.name} />

            <main className={styles.content}>{children}</main>

            <Footer />
        </div>
    );
}