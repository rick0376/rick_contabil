//src/components/profile/ProfessionalProfileForm/ProfessionalProfileForm.tsx

"use client";

import {
    AlertCircle,
    Building2,
    CheckCircle2,
    FileText,
    IdCard,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Printer,
    Save,
    UserRound,
} from "lucide-react";
import {
    FormEvent,
    useCallback,
    useEffect,
    useState,
} from "react";

import { printProfessionalDocument } from "@/lib/printing/calculation-print";

import styles from "./styles.module.scss";

type ProfessionalProfile = {
    id: string;
    fullName: string;
    cpf: string | null;
    crcNumber: string | null;
    crcState: string | null;
    crcCategory: string | null;
    businessName: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    addressLine: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    reportClosingText: string | null;
    signatureName: string | null;
    signatureTitle: string | null;
};

type ProfileFormState = {
    fullName: string;
    cpf: string;
    crcNumber: string;
    crcState: string;
    crcCategory: string;
    businessName: string;
    email: string;
    phone: string;
    whatsapp: string;
    addressLine: string;
    addressNumber: string;
    addressComplement: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
    reportClosingText: string;
    signatureName: string;
    signatureTitle: string;
};

type ValidationErrors = {
    formErrors?: string[];
    fieldErrors?: Record<string, string[] | undefined>;
};

type ProfileResponse = {
    message?: string;
    profile?: ProfessionalProfile | null;
    user?: {
        name: string;
        username: string;
    };
    errors?: ValidationErrors;
};

type FeedbackState = {
    type: "success" | "error";
    message: string;
};

function createInitialForm(): ProfileFormState {
    return {
        fullName: "",
        cpf: "",
        crcNumber: "",
        crcState: "",
        crcCategory: "",
        businessName: "",
        email: "",
        phone: "",
        whatsapp: "",
        addressLine: "",
        addressNumber: "",
        addressComplement: "",
        district: "",
        city: "",
        state: "",
        zipCode: "",
        reportClosingText: "",
        signatureName: "",
        signatureTitle: "",
    };
}

function onlyDigits(value: string) {
    return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
    return onlyDigits(value)
        .slice(0, 11)
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatPhone(value: string) {
    const digits = onlyDigits(value).slice(0, 11);

    if (digits.length <= 10) {
        return digits
            .replace(/^(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d)/, "$1-$2");
    }

    return digits
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatZipCode(value: string) {
    return onlyDigits(value)
        .slice(0, 8)
        .replace(/^(\d{5})(\d)/, "$1-$2");
}


function valueOrNotInformed(value: string) { return value.trim() || "Não informado"; }

function getErrorMessage(payload: ProfileResponse) {
    const fieldError = Object.values(
        payload.errors?.fieldErrors ?? {},
    )
        .flatMap((errors) => errors ?? [])
        .find(Boolean);

    return (
        fieldError ??
        payload.errors?.formErrors?.find(Boolean) ??
        payload.message ??
        "Não foi possível salvar o perfil profissional."
    );
}

export default function ProfessionalProfileForm() {
    const [form, setForm] = useState<ProfileFormState>(
        createInitialForm,
    );

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [feedback, setFeedback] =
        useState<FeedbackState | null>(null);

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        setFeedback(null);

        try {
            const response = await fetch("/api/professional-profile", {
                method: "GET",
                cache: "no-store",
            });

            const payload = (await response.json()) as ProfileResponse;

            if (!response.ok) {
                throw new Error(
                    payload.message ??
                    "Não foi possível carregar o perfil.",
                );
            }

            const profile = payload.profile;

            if (!profile) {
                setForm({
                    ...createInitialForm(),
                    fullName: payload.user?.name ?? "",
                });

                return;
            }

            setForm({
                fullName: profile.fullName,
                cpf: formatCpf(profile.cpf ?? ""),
                crcNumber: profile.crcNumber ?? "",
                crcState: profile.crcState ?? "",
                crcCategory: profile.crcCategory ?? "",
                businessName: profile.businessName ?? "",
                email: profile.email ?? "",
                phone: formatPhone(profile.phone ?? ""),
                whatsapp: formatPhone(profile.whatsapp ?? ""),
                addressLine: profile.addressLine ?? "",
                addressNumber: profile.addressNumber ?? "",
                addressComplement: profile.addressComplement ?? "",
                district: profile.district ?? "",
                city: profile.city ?? "",
                state: profile.state ?? "",
                zipCode: formatZipCode(profile.zipCode ?? ""),
                reportClosingText: profile.reportClosingText ?? "",
                signatureName: profile.signatureName ?? "",
                signatureTitle: profile.signatureTitle ?? "",
            });
        } catch (error) {
            setFeedback({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Não foi possível carregar o perfil.",
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    function updateField<K extends keyof ProfileFormState>(
        field: K,
        value: ProfileFormState[K],
    ) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }


    function handlePrintProfile() {
        setFeedback(null);
        if (form.fullName.trim().length < 2) { setFeedback({ type: "error", message: "Informe o nome completo antes de imprimir o perfil." }); return; }

        const addressParts = [form.addressLine, form.addressNumber, form.addressComplement, form.district, form.city && form.state ? `${form.city}/${form.state}` : form.city || form.state, form.zipCode].filter((item) => item.trim());
        const printResult = printProfessionalDocument({
            title: "Perfil profissional", subtitle: "Ficha de identificação do contador ou perito", documentType: "Ficha profissional", orientation: "portrait",
            metadata: [
                { label: "Profissional", value: form.fullName },
                { label: "CRC", value: [form.crcCategory, form.crcNumber, form.crcState].filter(Boolean).join(" ") || "Não informado" },
                { label: "E-mail", value: valueOrNotInformed(form.email) },
            ],
            sections: [
                {
                    title: "Identificação profissional", columns: 2, rows: [
                        { label: "Nome completo", value: form.fullName, highlight: true }, { label: "CPF", value: valueOrNotInformed(form.cpf) }, { label: "Categoria profissional", value: valueOrNotInformed(form.crcCategory) }, { label: "Número do CRC", value: valueOrNotInformed(form.crcNumber) }, { label: "Estado do CRC", value: valueOrNotInformed(form.crcState) }, { label: "Razão social", value: valueOrNotInformed(form.businessName) },
                    ]
                },
                {
                    title: "Contatos", columns: 3, rows: [
                        { label: "E-mail", value: valueOrNotInformed(form.email) }, { label: "Telefone", value: valueOrNotInformed(form.phone) }, { label: "WhatsApp", value: valueOrNotInformed(form.whatsapp) },
                    ]
                },
                { title: "Endereço profissional", note: addressParts.length ? addressParts.join(", ") : "Não informado" },
                {
                    title: "Identificação para assinatura", columns: 2, rows: [
                        { label: "Nome para assinatura", value: valueOrNotInformed(form.signatureName) }, { label: "Título da assinatura", value: valueOrNotInformed(form.signatureTitle) },
                    ]
                },
                { title: "Texto padrão de encerramento", note: valueOrNotInformed(form.reportClosingText) },
            ],
            footerText: "Ficha profissional gerada pelo LHP Sistema Contábil",
        });
        if (!printResult.ok) setFeedback({ type: "error", message: printResult.error ?? "Não foi possível abrir a impressão." });
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setFeedback(null);

        if (form.fullName.trim().length < 2) {
            setFeedback({
                type: "error",
                message: "Informe o nome completo.",
            });

            return;
        }

        setIsSaving(true);

        try {
            const response = await fetch("/api/professional-profile", {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify(form),
            });

            const payload = (await response.json()) as ProfileResponse;

            if (!response.ok) {
                throw new Error(getErrorMessage(payload));
            }

            setFeedback({
                type: "success",
                message:
                    payload.message ??
                    "Perfil profissional salvo com sucesso.",
            });

            await loadProfile();

            setFeedback({
                type: "success",
                message:
                    payload.message ??
                    "Perfil profissional salvo com sucesso.",
            });
        } catch (error) {
            setFeedback({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Não foi possível salvar o perfil.",
            });
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 className={styles.spin} size={32} />
                <strong>Carregando perfil profissional...</strong>
            </div>
        );
    }

    return (
        <form className={styles.card} onSubmit={handleSubmit}>
            <div className={styles.cardHeader}>
                <div className={styles.headerIcon}>
                    <UserRound size={24} />
                </div>

                <div>
                    <span>Cadastro profissional</span>
                    <h3>Informações do responsável</h3>
                    <p>
                        Esses dados serão utilizados nos documentos emitidos
                        pelo sistema.
                    </p>
                </div>
            </div>

            <fieldset className={styles.identificationSection}>
                <legend>
                    <IdCard size={17} />
                    Identificação profissional
                </legend>

                <div className={styles.formGrid}>
                    <label className={styles.fullField}>
                        <span>
                            Nome completo
                            <strong>*</strong>
                        </span>

                        <input
                            type="text"
                            value={form.fullName}
                            maxLength={160}
                            placeholder="Nome completo do profissional"
                            onChange={(event) =>
                                updateField("fullName", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        <span>CPF</span>

                        <input
                            type="text"
                            inputMode="numeric"
                            value={form.cpf}
                            placeholder="000.000.000-00"
                            onChange={(event) =>
                                updateField("cpf", formatCpf(event.target.value))
                            }
                        />
                    </label>

                    <label>
                        <span>Número do CRC</span>

                        <input
                            type="text"
                            value={form.crcNumber}
                            maxLength={40}
                            placeholder="Número do registro"
                            onChange={(event) =>
                                updateField("crcNumber", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        <span>Estado do CRC</span>

                        <input
                            type="text"
                            value={form.crcState}
                            maxLength={2}
                            placeholder="UF"
                            onChange={(event) =>
                                updateField(
                                    "crcState",
                                    event.target.value
                                        .replace(/[^a-zA-Z]/g, "")
                                        .toUpperCase(),
                                )
                            }
                        />
                    </label>

                    <label>
                        <span>Categoria profissional</span>

                        <input
                            type="text"
                            value={form.crcCategory}
                            maxLength={60}
                            placeholder="Ex.: Contador"
                            onChange={(event) =>
                                updateField("crcCategory", event.target.value)
                            }
                        />
                    </label>
                </div>
            </fieldset>

            <fieldset className={styles.contactSection}>
                <legend>
                    <Building2 size={17} />
                    Empresa e contato
                </legend>

                <div className={styles.formGrid}>
                    <label className={styles.fullField}>
                        <span>Razão social ou nome empresarial</span>

                        <input
                            type="text"
                            value={form.businessName}
                            maxLength={160}
                            placeholder="Nome da empresa ou escritório"
                            onChange={(event) =>
                                updateField("businessName", event.target.value)
                            }
                        />
                    </label>

                    <label className={styles.fullField}>
                        <span>
                            <Mail size={15} />
                            E-mail
                        </span>

                        <input
                            type="email"
                            value={form.email}
                            maxLength={160}
                            placeholder="profissional@email.com"
                            onChange={(event) =>
                                updateField("email", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        <span>
                            <Phone size={15} />
                            Telefone
                        </span>

                        <input
                            type="text"
                            inputMode="tel"
                            value={form.phone}
                            placeholder="(00) 0000-0000"
                            onChange={(event) =>
                                updateField(
                                    "phone",
                                    formatPhone(event.target.value),
                                )
                            }
                        />
                    </label>

                    <label>
                        <span>
                            <Phone size={15} />
                            WhatsApp
                        </span>

                        <input
                            type="text"
                            inputMode="tel"
                            value={form.whatsapp}
                            placeholder="(00) 00000-0000"
                            onChange={(event) =>
                                updateField(
                                    "whatsapp",
                                    formatPhone(event.target.value),
                                )
                            }
                        />
                    </label>
                </div>
            </fieldset>

            <fieldset className={styles.addressSection}>
                <legend>
                    <MapPin size={17} />
                    Endereço profissional
                </legend>

                <div className={styles.formGrid}>
                    <label className={styles.streetField}>
                        <span>Logradouro</span>

                        <input
                            type="text"
                            value={form.addressLine}
                            maxLength={200}
                            placeholder="Rua, avenida ou travessa"
                            onChange={(event) =>
                                updateField("addressLine", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        <span>Número</span>

                        <input
                            type="text"
                            value={form.addressNumber}
                            maxLength={30}
                            placeholder="Número"
                            onChange={(event) =>
                                updateField("addressNumber", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        <span>Complemento</span>

                        <input
                            type="text"
                            value={form.addressComplement}
                            maxLength={120}
                            placeholder="Sala, conjunto ou bloco"
                            onChange={(event) =>
                                updateField(
                                    "addressComplement",
                                    event.target.value,
                                )
                            }
                        />
                    </label>

                    <label>
                        <span>Bairro</span>

                        <input
                            type="text"
                            value={form.district}
                            maxLength={120}
                            placeholder="Bairro"
                            onChange={(event) =>
                                updateField("district", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        <span>Cidade</span>

                        <input
                            type="text"
                            value={form.city}
                            maxLength={120}
                            placeholder="Cidade"
                            onChange={(event) =>
                                updateField("city", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        <span>Estado</span>

                        <input
                            type="text"
                            value={form.state}
                            maxLength={2}
                            placeholder="UF"
                            onChange={(event) =>
                                updateField(
                                    "state",
                                    event.target.value
                                        .replace(/[^a-zA-Z]/g, "")
                                        .toUpperCase(),
                                )
                            }
                        />
                    </label>

                    <label>
                        <span>CEP</span>

                        <input
                            type="text"
                            inputMode="numeric"
                            value={form.zipCode}
                            placeholder="00000-000"
                            onChange={(event) =>
                                updateField(
                                    "zipCode",
                                    formatZipCode(event.target.value),
                                )
                            }
                        />
                    </label>
                </div>
            </fieldset>

            <fieldset className={styles.signatureSection}>
                <legend>
                    <FileText size={17} />
                    Laudos e assinatura
                </legend>

                <div className={styles.formGrid}>
                    <label>
                        <span>Nome para assinatura</span>

                        <input
                            type="text"
                            value={form.signatureName}
                            maxLength={160}
                            placeholder="Nome que aparecerá na assinatura"
                            onChange={(event) =>
                                updateField("signatureName", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        <span>Título da assinatura</span>

                        <input
                            type="text"
                            value={form.signatureTitle}
                            maxLength={160}
                            placeholder="Ex.: Contador e Perito Contábil"
                            onChange={(event) =>
                                updateField("signatureTitle", event.target.value)
                            }
                        />
                    </label>

                    <label className={styles.fullField}>
                        <span>Texto padrão de encerramento</span>

                        <textarea
                            value={form.reportClosingText}
                            rows={6}
                            maxLength={10000}
                            placeholder="Texto que será utilizado no encerramento dos laudos."
                            onChange={(event) =>
                                updateField(
                                    "reportClosingText",
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                </div>
            </fieldset>

            {feedback && (
                <div
                    className={styles.feedback}
                    data-type={feedback.type}
                >
                    {feedback.type === "success" ? (
                        <CheckCircle2 size={19} />
                    ) : (
                        <AlertCircle size={19} />
                    )}

                    <span>{feedback.message}</span>
                </div>
            )}

            <div className={styles.actions}>

                <button type="button" className={styles.printButton} onClick={handlePrintProfile}>
                    <Printer size={18} />
                    Imprimir / Salvar PDF
                </button>

                <button
                    type="submit"
                    className={styles.saveButton}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <Loader2 className={styles.spin} size={18} />
                    ) : (
                        <Save size={18} />
                    )}

                    {isSaving
                        ? "Salvando..."
                        : "Salvar perfil profissional"}
                </button>
            </div>
        </form>
    );
}