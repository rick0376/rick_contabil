// src/app/(private)/dashboard/page.tsx

import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Calculator,
  ChartNoAxesCombined,
  FileClock,
  FileSearch2,
  FileText,
  Landmark,
  Percent,
  ReceiptText,
  Scale,
  Sigma,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";

import CalculatorCard from "@/components/dashboard/CalculatorCard/CalculatorCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader/DashboardHeader";
import QuickStats from "@/components/dashboard/QuickStats/QuickStats";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

import styles from "./styles.module.scss";

const managementModules = [
  {
    title: "Clientes",
    description:
      "Cadastre pessoas físicas e jurídicas para processos e laudos.",
    href: "/clientes",
    icon: UsersRound,
  },
  {
    title: "Processos",
    description:
      "Organize processos, partes, prazos e objetos da perícia.",
    href: "/processos",
    icon: BriefcaseBusiness,
  },
  {
    title: "Histórico de cálculos",
    description:
      "Consulte cálculos salvos, versões, clientes e processos.",
    href: "/historico",
    icon: FileClock,
  },
  {
    title: "Perfil profissional",
    description:
      "Configure CRC, contatos, endereço e assinatura dos documentos.",
    href: "/perfil-profissional",
    icon: UserRound,
  },
];

const analysisModules = [
  {
    title: "Análises Financeiras",
    description:
      "Acesse análises contratuais, compare taxas aplicadas e apure diferenças em operações de financiamento.",
    href: "/analises-financeiras",
    icon: FileSearch2,
  },
];

const calculators = [
  {
    title: "Juros Simples",
    description:
      "Calcule capital, taxa, período, juros e montante.",
    href: "/juros-simples",
    icon: Percent,
  },
  {
    title: "Juros Compostos",
    description:
      "Calcule crescimento acumulado e capitalização.",
    href: "/juros-compostos",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Valor Presente",
    description:
      "Traga valores futuros para a data atual.",
    href: "/valor-presente",
    icon: WalletCards,
  },
  {
    title: "Valor Futuro",
    description:
      "Projete valores para uma data futura.",
    href: "/valor-futuro",
    icon: BadgeDollarSign,
  },
  {
    title: "Sistema Price",
    description:
      "Calcule prestações constantes e amortização.",
    href: "/sistema-price",
    icon: Calculator,
  },
  {
    title: "Sistema SAC",
    description:
      "Calcule amortizações constantes e parcelas decrescentes.",
    href: "/sistema-sac",
    icon: Landmark,
  },
  {
    title: "Método de Gauss",
    description:
      "Simule prestações fixas com juros simples e equivalência financeira.",
    href: "/sistema-gauss",
    icon: Sigma,
  },
  {
    title: "Fluxo de Caixa",
    description:
      "Organize entradas e saídas ao longo do tempo.",
    href: "/fluxo-caixa",
    icon: ReceiptText,
  },
  {
    title: "Análise Pericial",
    description:
      "Acesse cálculos e memórias para revisão contábil.",
    href: "/analise-pericial",
    icon: Scale,
  },
];

export default async function DashboardPage() {
  const authenticatedUser =
    await getCurrentAppUser();

  if (!authenticatedUser) {
    redirect("/login");
  }

  const userId =
    authenticatedUser.user.id;

  const [
    clientsCount,
    processesCount,
    calculationsCount,
    reportsCount,
  ] = await Promise.all([
    prisma.client.count({
      where: {
        userId,
        deletedAt: null,
      },
    }),

    prisma.legalProcess.count({
      where: {
        userId,
        deletedAt: null,
      },
    }),

    prisma.calculation.count({
      where: {
        userId,
        deletedAt: null,
      },
    }),

    prisma.expertReport.count({
      where: {
        userId,
        deletedAt: null,
      },
    }),
  ]);

  return (
    <div className={styles.page}>
      <DashboardHeader
        userName={
          authenticatedUser.session.name
        }
      />

      <section className={styles.stats}>
        <QuickStats
          title="Clientes"
          value={String(clientsCount)}
          description="Pessoas físicas e jurídicas."
        />

        <QuickStats
          title="Processos"
          value={String(processesCount)}
          description="Processos cadastrados."
        />

        <QuickStats
          title="Cálculos salvos"
          value={String(
            calculationsCount,
          )}
          description="Memórias de cálculo registradas."
        />

        <QuickStats
          title="Laudos"
          value={String(reportsCount)}
          description="Laudos periciais cadastrados."
        />
      </section>

      <section className={styles.section}>
        <div
          className={
            styles.sectionHeader
          }
        >
          <div>
            <span>
              Gestão profissional
            </span>

            <h2>
              Cadastros e controles
            </h2>
          </div>
        </div>

        <div
          className={
            styles.managementGrid
          }
        >
          {managementModules.map(
            (module) => (
              <CalculatorCard
                key={module.href}
                title={module.title}
                description={
                  module.description
                }
                href={module.href}
                icon={module.icon}
              />
            ),
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div
          className={
            styles.sectionHeader
          }
        >
          <div>
            <span>
              Análises especializadas
            </span>

            <h2>
              Revisões financeiras e
              contratuais
            </h2>
          </div>

          <div
            className={
              styles.moduleCounter
            }
          >
            <ChartNoAxesCombined
              size={16}
            />

            <span>
              {analysisModules.length}{" "}
              módulo
            </span>
          </div>
        </div>

        <div
          className={
            styles.analysisGrid
          }
        >
          {analysisModules.map(
            (module) => (
              <CalculatorCard
                key={module.href}
                title={module.title}
                description={
                  module.description
                }
                href={module.href}
                icon={module.icon}
              />
            ),
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div
          className={
            styles.sectionHeader
          }
        >
          <div>
            <span>Ferramentas</span>

            <h2>
              Calculadoras disponíveis
            </h2>
          </div>

          <div
            className={
              styles.moduleCounter
            }
          >
            <FileText size={16} />

            <span>
              {calculators.length} módulos
            </span>
          </div>
        </div>

        <div className={styles.grid}>
          {calculators.map(
            (calculator) => (
              <CalculatorCard
                key={calculator.href}
                title={
                  calculator.title
                }
                description={
                  calculator.description
                }
                href={calculator.href}
                icon={calculator.icon}
              />
            ),
          )}
        </div>
      </section>
    </div>
  );
}

