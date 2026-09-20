// src/components/layout/Header/Header.tsx

"use client";

import {
    FileText,
} from "lucide-react";
import Link from "next/link";
import {
    usePathname,
    useRouter,
} from "next/navigation";

import styles from "./styles.module.scss";

type HeaderProps = {
    userName: string;
};

type NavigationItem = {
    label: string;
    href: string;
    routes?: string[];
    showIcon?: boolean;
};

const navigationItems:
    NavigationItem[] = [
        {
            label: "Início",
            href: "/dashboard",
        },

        {
            label: "Clientes",
            href: "/clientes",
        },

        {
            label: "Processos",
            href: "/processos",
        },

        {
            label: "Cálculos",
            href: "/juros-simples",

            routes: [
                "/juros-simples",
                "/juros-compostos",
                "/valor-presente",
                "/valor-futuro",
                "/sistema-price",
                "/sistema-sac",
                "/sistema-gauss",
                "/fluxo-caixa",
                "/analise-pericial",
            ],
        },

        {
            label: "Análises",
            href: "/analises-financeiras",
        },

        {
            label: "Histórico",
            href: "/historico",
        },

        {
            label: "Laudos",
            href: "/laudos",
            showIcon: true,
        },

        {
            label: "Perfil",
            href: "/perfil-profissional",
        },
    ];

function matchesRoute(
    pathname: string,
    route: string,
) {
    return (
        pathname === route ||
        pathname.startsWith(
            `${route}/`,
        )
    );
}

function isNavigationItemActive(
    pathname: string,
    item: NavigationItem,
) {
    const routes =
        item.routes ?? [
            item.href,
        ];

    return routes.some(
        (route) =>
            matchesRoute(
                pathname,
                route,
            ),
    );
}

export default function Header({
    userName,
}: HeaderProps) {
    const pathname =
        usePathname();

    const router =
        useRouter();

    async function handleLogout() {
        await fetch(
            "/api/auth/logout",
            {
                method: "POST",
            },
        );

        router.replace("/login");
        router.refresh();
    }

    return (
        <header
            className={styles.header}
        >
            <div
                className={styles.brand}
            >
                <div
                    className={styles.logo}
                >
                    LHP
                </div>

                <div>
                    <strong>
                        LHP Sistema Contábil
                    </strong>

                    <span>
                        Olá, {userName}
                    </span>
                </div>
            </div>

            <nav
                className={
                    styles.navigation
                }
                aria-label="Navegação principal"
            >
                {navigationItems.map(
                    (item) => {
                        const isActive =
                            isNavigationItemActive(
                                pathname,
                                item,
                            );

                        return (
                            <Link
                                key={
                                    item.href
                                }
                                href={
                                    item.href
                                }
                                className={`${styles.navigationLink} ${isActive
                                        ? styles.activeLink
                                        : ""
                                    }`}
                                aria-current={
                                    isActive
                                        ? "page"
                                        : undefined
                                }
                            >
                                {item.showIcon && (
                                    <FileText
                                        size={15}
                                        aria-hidden="true"
                                    />
                                )}

                                <span>
                                    {
                                        item.label
                                    }
                                </span>
                            </Link>
                        );
                    },
                )}

                <button
                    type="button"
                    className={
                        styles.logoutButton
                    }
                    onClick={
                        handleLogout
                    }
                >
                    Deslogar
                </button>
            </nav>
        </header>
    );
}