// src/app/(auth)/login/page.tsx

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import styles from "./styles.module.scss";

function getDeviceId() {
  const key = "pericia_browser_id";
  let id = localStorage.getItem(key);

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }

  return id;
}

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("rickcontabil0376");
  const [password, setPassword] = useState("rick0376contabil");
  const [showPassword, setShowPassword] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [error, setError] = useState("");
  const [supportUrl, setSupportUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSupportUrl(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          deviceId,
          deviceName: navigator.userAgent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Acesso negado.");
        setSupportUrl(data.support?.whatsappUrl || null);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.hero}>
          <div className={styles.heroBrand}>
            <span className={styles.heroBrandMark}>LHP</span>

            <span className={styles.heroBrandText}>
              <strong>LHP Sistema Contábil</strong>
              <small>Soluções em gestão contábil</small>
            </span>
          </div>

          <div className={styles.heroContent}>
            <div className={styles.eyebrow}>
              <span>Controle</span>
              <i />
              <span>Organização</span>
              <i />
              <span>Resultados</span>
            </div>

            <h1>
              Contabilidade
              <span>mais simples,</span>
              mais resultados.
            </h1>

            <div className={styles.goldLine} />

            <p className={styles.heroDescription}>
              Uma plataforma completa para gestão de clientes, processos,
              cálculos e laudos.
            </p>

            <div className={styles.features}>
              <article>
                <div className={styles.featureIcon}>
                  <UsersRound size={29} />
                </div>

                <strong>
                  Gestão de
                  <br />
                  Clientes
                </strong>

                <p>
                  Pessoas físicas
                  <br />e jurídicas
                </p>
              </article>

              <article>
                <div className={styles.featureIcon}>
                  <FileText size={29} />
                </div>

                <strong>
                  Processos
                  <br />
                  Organizados
                </strong>

                <p>
                  Prazos, partes
                  <br />e documentos
                </p>
              </article>

              <article>
                <div className={styles.featureIcon}>
                  <BarChart3 size={29} />
                </div>

                <strong>
                  Cálculos e
                  <br />
                  Laudos
                </strong>

                <p>
                  Mais agilidade
                  <br />e precisão
                </p>
              </article>
            </div>
          </div>
        </section>

        <form className={styles.card} onSubmit={handleSubmit}>
          <div className={styles.cardBrand}>
            <span className={styles.cardBrandMark}>LHP</span>

            <span className={styles.cardBrandText}>
              <strong>LHP Sistema Contábil</strong>
              <small>Soluções em gestão contábil</small>
            </span>
          </div>

          <div className={styles.heading}>
            <h2>Bem-vindo de volta!</h2>
            <p>Acesse sua conta para continuar.</p>
          </div>

          <label className={styles.field}>
            <UserRound size={22} aria-hidden="true" />

            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="Usuário ou e-mail"
              aria-label="Usuário ou e-mail"
              required
            />
          </label>

          <label className={styles.field}>
            <LockKeyhole size={22} aria-hidden="true" />

            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Senha"
              aria-label="Senha"
              required
            />

            <button
              type="button"
              className={styles.eyeButton}
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </label>

          <div className={styles.options}>
            <label className={styles.remember}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />

              <span>Lembrar de mim</span>
            </label>

            <button type="button" className={styles.forgotButton}>
              Esqueceu a senha?
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {supportUrl && (
            <a
              href={supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.whatsappButton}
            >
              Falar com o suporte no WhatsApp
            </a>
          )}

          <button
            className={styles.submitButton}
            type="submit"
            disabled={loading || !deviceId}
          >
            <span>{loading ? "Entrando..." : "Entrar"}</span>
            <ArrowRight size={22} aria-hidden="true" />
          </button>

          <div className={styles.secureDivider}>
            <span>Acesso seguro</span>
          </div>

          <div className={styles.security}>
            <ShieldCheck size={30} aria-hidden="true" />

            <p>
              Seus dados estão protegidos e todas as operações são registradas
              com segurança.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}