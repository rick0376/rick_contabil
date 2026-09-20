//src/components/clients/ClientManager/ClientManager.tsx

"use client";

import {
    Building2,
    CalendarDays,
    CheckCircle2,
    FileText,
    Loader2,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Printer,
    RotateCcw,
    Save,
    Search,
    UserRound,
    UsersRound,
    X,
    XCircle,
} from "lucide-react";
import {
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import DeleteEntityButton from "@/components/ui/DeleteEntityButton/DeleteEntityButton";
import { printProfessionalDocument } from "@/lib/printing/calculation-print";
import styles from "./styles.module.scss";

type ClientType = "INDIVIDUAL" | "COMPANY";
type ClientTypeFilter = "ALL" | ClientType;

type AddressType =
    | "RESIDENTIAL"
    | "COMMERCIAL"
    | "CORRESPONDENCE"
    | "OTHER";

type ClientAddress = {
    id: string;
    type: AddressType;
    street: string;
    number: string | null;
    complement: string | null;
    district: string | null;
    city: string;
    state: string;
    zipCode: string | null;
    country: string;
    isPrimary: boolean;
};

type ClientRecord = {
    id: string;
    type: ClientType;
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    name: string;
    tradeName: string | null;
    documentNumber: string | null;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    createdAt: string;
    updatedAt: string;
    addresses: ClientAddress[];
};

type ClientDetailsRecord = ClientRecord & {
    secondaryDocument: string | null;
    stateRegistration: string | null;
    birthOrFoundationDate: string | null;
    notes: string | null;
};

type ClientFormState = {
    type: ClientType;
    name: string;
    tradeName: string;
    documentNumber: string;
    secondaryDocument: string;
    stateRegistration: string;
    birthOrFoundationDate: string;
    email: string;
    phone: string;
    mobile: string;
    notes: string;
    includeAddress: boolean;
    addressType: AddressType;
    street: string;
    number: string;
    complement: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
};

type FeedbackState = {
    type: "success" | "error";
    message: string;
};

type ValidationErrors = {
    formErrors?: string[];
    fieldErrors?: Record<string, string[] | undefined>;
};

type ApiErrorResponse = {
    message?: string;
    errors?: ValidationErrors;
};

type ClientListResponse = {
    clients?: ClientRecord[];
    total?: number;
    message?: string;
};

type ClientDetailsResponse = {
    client?: ClientDetailsRecord;
    message?: string;
};

type ClientMutationResponse = {
    message?: string;
    client?: ClientDetailsRecord;
};

function createInitialForm(): ClientFormState {
    return {
        type: "INDIVIDUAL",
        name: "",
        tradeName: "",
        documentNumber: "",
        secondaryDocument: "",
        stateRegistration: "",
        birthOrFoundationDate: "",
        email: "",
        phone: "",
        mobile: "",
        notes: "",
        includeAddress: true,
        addressType: "RESIDENTIAL",
        street: "",
        number: "",
        complement: "",
        district: "",
        city: "",
        state: "",
        zipCode: "",
        country: "Brasil",
    };
}

function onlyDigits(value: string) {
    return value.replace(/\D/g, "");
}

function formatDocument(value: string, type: ClientType) {
    const digits = onlyDigits(value);

    if (type === "INDIVIDUAL") {
        return digits
            .slice(0, 11)
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1-$2");
    }

    return digits
        .slice(0, 14)
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatStoredDocument(
    value: string | null,
    type: ClientType,
) {
    if (!value) {
        return "Não informado";
    }

    return formatDocument(value, type);
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

function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Data não disponível";
    }

    return new Intl.DateTimeFormat("pt-BR").format(date);
}

function getInputDate(value: string | null) {
    if (!value) {
        return "";
    }

    return value.slice(0, 10);
}


function valueOrNotInformed(value: string | null | undefined) { return value?.trim() || "Não informado"; }

function getClientTypeLabel(type: ClientType) { return type === "INDIVIDUAL" ? "Pessoa física" : "Pessoa jurídica"; }

function getAddressTypeLabel(type: AddressType) {
    const labels: Record<AddressType, string> = { RESIDENTIAL: "Residencial", COMMERCIAL: "Comercial", CORRESPONDENCE: "Correspondência", OTHER: "Outro" };
    return labels[type];
}

function getErrorMessage(payload: ApiErrorResponse) {
    const fieldErrors = payload.errors?.fieldErrors;

    if (fieldErrors) {
        const firstFieldError = Object.values(fieldErrors)
            .flatMap((errors) => errors ?? [])
            .find(Boolean);

        if (firstFieldError) {
            return firstFieldError;
        }
    }

    const formError = payload.errors?.formErrors?.find(Boolean);

    return (
        formError ??
        payload.message ??
        "Não foi possível concluir a operação."
    );
}

export default function ClientManager() {
    const formCardRef = useRef<HTMLElement | null>(null);

    const [form, setForm] = useState<ClientFormState>(
        createInitialForm,
    );
    const [clients, setClients] = useState<ClientRecord[]>([]);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] =
        useState<ClientTypeFilter>("ALL");
    const [editingClientId, setEditingClientId] = useState<
        string | null
    >(null);
    const [feedback, setFeedback] = useState<FeedbackState | null>(
        null,
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingClient, setIsLoadingClient] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [printingClientId, setPrintingClientId] = useState<string | null>(null);

    const loadClients = useCallback(async () => {
        setIsLoading(true);

        try {
            const response = await fetch("/api/clients", {
                method: "GET",
                cache: "no-store",
            });

            const payload = (await response.json()) as ClientListResponse;

            if (!response.ok) {
                throw new Error(
                    payload.message ?? "Não foi possível carregar os clientes.",
                );
            }

            setClients(payload.clients ?? []);
        } catch (error) {
            setFeedback({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Não foi possível carregar os clientes.",
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadClients();
    }, [loadClients]);

    const filteredClients = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const numericSearch = onlyDigits(search);

        return clients.filter((client) => {
            const matchesType =
                typeFilter === "ALL" || client.type === typeFilter;

            if (!matchesType) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            const textFields = [
                client.name,
                client.tradeName,
                client.email,
                client.phone,
                client.mobile,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const documentMatches =
                numericSearch.length > 0 &&
                client.documentNumber?.includes(numericSearch);

            return (
                textFields.includes(normalizedSearch) ||
                Boolean(documentMatches)
            );
        });
    }, [clients, search, typeFilter]);

    const individualCount = useMemo(
        () =>
            clients.filter((client) => client.type === "INDIVIDUAL")
                .length,
        [clients],
    );

    const companyCount = useMemo(
        () =>
            clients.filter((client) => client.type === "COMPANY").length,
        [clients],
    );

    function updateField<K extends keyof ClientFormState>(
        field: K,
        value: ClientFormState[K],
    ) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function handleTypeChange(type: ClientType) {
        setForm((current) => ({
            ...current,
            type,
            documentNumber: formatDocument(
                current.documentNumber,
                type,
            ),
            tradeName:
                type === "COMPANY" ? current.tradeName : "",
            stateRegistration:
                type === "COMPANY" ? current.stateRegistration : "",
            secondaryDocument:
                type === "INDIVIDUAL"
                    ? current.secondaryDocument
                    : "",
        }));
    }

    function resetForm() {
        setForm(createInitialForm());
        setEditingClientId(null);
        setFeedback(null);
    }

    function cancelEditing() {
        setForm(createInitialForm());
        setEditingClientId(null);
        setFeedback(null);
    }

    async function loadClientForEditing(clientId: string) {
        setIsLoadingClient(true);
        setFeedback(null);

        try {
            const response = await fetch(
                `/api/clients/${encodeURIComponent(clientId)}`,
                {
                    method: "GET",
                    cache: "no-store",
                },
            );

            const payload =
                (await response.json()) as ClientDetailsResponse;

            if (!response.ok || !payload.client) {
                throw new Error(
                    payload.message ??
                    "Não foi possível carregar o cliente.",
                );
            }

            const client = payload.client;

            const primaryAddress =
                client.addresses.find((address) => address.isPrimary) ??
                client.addresses[0];

            setEditingClientId(client.id);

            setForm({
                type: client.type,
                name: client.name,
                tradeName: client.tradeName ?? "",
                documentNumber: formatDocument(
                    client.documentNumber ?? "",
                    client.type,
                ),
                secondaryDocument: client.secondaryDocument ?? "",
                stateRegistration: client.stateRegistration ?? "",
                birthOrFoundationDate: getInputDate(
                    client.birthOrFoundationDate,
                ),
                email: client.email ?? "",
                phone: formatPhone(client.phone ?? ""),
                mobile: formatPhone(client.mobile ?? ""),
                notes: client.notes ?? "",
                includeAddress: Boolean(primaryAddress),
                addressType: primaryAddress?.type ?? "RESIDENTIAL",
                street: primaryAddress?.street ?? "",
                number: primaryAddress?.number ?? "",
                complement: primaryAddress?.complement ?? "",
                district: primaryAddress?.district ?? "",
                city: primaryAddress?.city ?? "",
                state: primaryAddress?.state ?? "",
                zipCode: formatZipCode(primaryAddress?.zipCode ?? ""),
                country: primaryAddress?.country ?? "Brasil",
            });

            window.requestAnimationFrame(() => {
                formCardRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            });
        } catch (error) {
            setFeedback({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Não foi possível carregar o cliente.",
            });
        } finally {
            setIsLoadingClient(false);
        }
    }


    async function handlePrintClient(clientId: string) {
        setPrintingClientId(clientId); setFeedback(null);

        try {
            const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, { method: "GET", cache: "no-store" });
            const payload = (await response.json()) as ClientDetailsResponse;
            if (!response.ok || !payload.client) throw new Error(payload.message ?? "Não foi possível carregar o cliente para impressão.");

            const client = payload.client;
            const address = client.addresses.find((item) => item.isPrimary) ?? client.addresses[0];
            const printResult = printProfessionalDocument({
                title: `Ficha cadastral — ${client.name}`, subtitle: "Cadastro profissional de cliente", documentType: "Ficha cadastral", orientation: "portrait",
                metadata: [
                    { label: "Tipo", value: getClientTypeLabel(client.type) },
                    { label: "Situação", value: client.status === "ACTIVE" ? "Ativo" : client.status === "INACTIVE" ? "Inativo" : "Arquivado" },
                    { label: "Cadastro", value: formatDate(client.createdAt) },
                    { label: "Atualização", value: formatDate(client.updatedAt) },
                ],
                sections: [
                    {
                        title: "Identificação", columns: 2, rows: [
                            { label: client.type === "INDIVIDUAL" ? "Nome completo" : "Razão social", value: client.name, highlight: true },
                            { label: "Nome fantasia", value: valueOrNotInformed(client.tradeName) },
                            { label: client.type === "INDIVIDUAL" ? "CPF" : "CNPJ", value: formatStoredDocument(client.documentNumber, client.type) },
                            { label: client.type === "INDIVIDUAL" ? "RG ou documento" : "Inscrição estadual", value: valueOrNotInformed(client.type === "INDIVIDUAL" ? client.secondaryDocument : client.stateRegistration) },
                            { label: client.type === "INDIVIDUAL" ? "Data de nascimento" : "Data de fundação", value: client.birthOrFoundationDate ? formatDate(client.birthOrFoundationDate) : "Não informada" },
                        ]
                    },
                    {
                        title: "Contatos", columns: 2, rows: [
                            { label: "E-mail", value: valueOrNotInformed(client.email) },
                            { label: "Telefone", value: client.phone ? formatPhone(client.phone) : "Não informado" },
                            { label: "Celular", value: client.mobile ? formatPhone(client.mobile) : "Não informado" },
                        ]
                    },
                    ...(address ? [{
                        title: "Endereço principal", columns: 2 as const, rows: [
                            { label: "Tipo", value: getAddressTypeLabel(address.type) },
                            { label: "CEP", value: address.zipCode ? formatZipCode(address.zipCode) : "Não informado" },
                            { label: "Logradouro", value: address.street },
                            { label: "Número", value: valueOrNotInformed(address.number) },
                            { label: "Complemento", value: valueOrNotInformed(address.complement) },
                            { label: "Bairro", value: valueOrNotInformed(address.district) },
                            { label: "Cidade/UF", value: `${address.city}/${address.state}` },
                            { label: "País", value: address.country },
                        ]
                    }] : []),
                    { title: "Observações", note: valueOrNotInformed(client.notes) },
                ],
                footerText: "Ficha cadastral de cliente gerada pelo LHP Sistema Contábil",
            });

            if (!printResult.ok) throw new Error(printResult.error);
        } catch (error) {
            setFeedback({ type: "error", message: error instanceof Error ? error.message : "Não foi possível imprimir a ficha do cliente." });
        } finally { setPrintingClientId(null); }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFeedback(null);

        if (form.name.trim().length < 2) {
            setFeedback({
                type: "error",
                message: "Informe o nome completo ou a razão social.",
            });

            return;
        }

        if (
            form.includeAddress &&
            (!form.street.trim() ||
                !form.city.trim() ||
                form.state.trim().length !== 2)
        ) {
            setFeedback({
                type: "error",
                message:
                    "Informe logradouro, cidade e a sigla do estado no endereço.",
            });

            return;
        }

        setIsSubmitting(true);

        const payload = {
            type: form.type,
            name: form.name,
            tradeName:
                form.type === "COMPANY" ? form.tradeName : undefined,
            documentNumber: form.documentNumber,
            secondaryDocument:
                form.type === "INDIVIDUAL"
                    ? form.secondaryDocument
                    : undefined,
            stateRegistration:
                form.type === "COMPANY"
                    ? form.stateRegistration
                    : undefined,
            birthOrFoundationDate: form.birthOrFoundationDate,
            email: form.email,
            phone: form.phone,
            mobile: form.mobile,
            notes: form.notes,

            addresses: form.includeAddress
                ? [
                    {
                        type: form.addressType,
                        street: form.street,
                        number: form.number,
                        complement: form.complement,
                        district: form.district,
                        city: form.city,
                        state: form.state.toUpperCase(),
                        zipCode: form.zipCode,
                        country: form.country || "Brasil",
                        isPrimary: true,
                    },
                ]
                : [],
        };

        const isEditing = Boolean(editingClientId);

        const endpoint = isEditing
            ? `/api/clients/${encodeURIComponent(editingClientId!)}`
            : "/api/clients";

        try {
            const response = await fetch(endpoint, {
                method: isEditing ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const responsePayload =
                (await response.json()) as ClientMutationResponse &
                ApiErrorResponse;

            if (!response.ok) {
                throw new Error(getErrorMessage(responsePayload));
            }

            setForm(createInitialForm());
            setEditingClientId(null);

            await loadClients();

            setFeedback({
                type: "success",
                message:
                    responsePayload.message ??
                    (isEditing
                        ? "Cliente atualizado com sucesso."
                        : "Cliente cadastrado com sucesso."),
            });
        } catch (error) {
            setFeedback({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : isEditing
                            ? "Não foi possível atualizar o cliente."
                            : "Não foi possível cadastrar o cliente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className={styles.manager}>
            <section ref={formCardRef} className={styles.formCard}>
                <div className={styles.cardHeader}>
                    <div className={styles.headerIcon}>
                        {editingClientId ? (
                            <Pencil size={23} />
                        ) : (
                            <UserRound size={23} />
                        )}
                    </div>

                    <div>
                        <span>
                            {editingClientId
                                ? "Alteração de registro"
                                : "Novo registro"}
                        </span>

                        <h3>
                            {editingClientId
                                ? "Editar cliente"
                                : "Cadastrar cliente"}
                        </h3>

                        <p>
                            {editingClientId
                                ? "Atualize os dados da pessoa física ou jurídica selecionada."
                                : "Preencha os dados que serão utilizados nos processos e laudos."}
                        </p>
                    </div>
                </div>

                {editingClientId && (
                    <div className={styles.editingBanner}>
                        <Pencil size={18} />

                        <div>
                            <strong>Modo de edição ativo</strong>
                            <span>
                                Você está alterando o cadastro de {form.name}.
                            </span>
                        </div>

                        <button
                            type="button"
                            title="Cancelar edição"
                            aria-label="Cancelar edição"
                            onClick={cancelEditing}
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                <form className={styles.form} onSubmit={handleSubmit}>
                    <fieldset className={styles.fieldset}>
                        <legend>Tipo de cliente</legend>

                        <div className={styles.typeSelector}>
                            <button
                                type="button"
                                className={
                                    form.type === "INDIVIDUAL"
                                        ? styles.typeButtonActive
                                        : styles.typeButton
                                }
                                aria-pressed={form.type === "INDIVIDUAL"}
                                onClick={() => handleTypeChange("INDIVIDUAL")}
                            >
                                <UserRound size={18} />
                                Pessoa física
                            </button>

                            <button
                                type="button"
                                className={
                                    form.type === "COMPANY"
                                        ? styles.typeButtonActive
                                        : styles.typeButton
                                }
                                aria-pressed={form.type === "COMPANY"}
                                onClick={() => handleTypeChange("COMPANY")}
                            >
                                <Building2 size={18} />
                                Pessoa jurídica
                            </button>
                        </div>
                    </fieldset>

                    <fieldset className={styles.fieldset}>
                        <legend>Identificação</legend>

                        <div className={styles.formGrid}>
                            <label className={styles.fullField}>
                                <span>
                                    {form.type === "INDIVIDUAL"
                                        ? "Nome completo"
                                        : "Razão social"}
                                    <strong>*</strong>
                                </span>

                                <input
                                    type="text"
                                    value={form.name}
                                    maxLength={160}
                                    placeholder={
                                        form.type === "INDIVIDUAL"
                                            ? "Digite o nome completo"
                                            : "Digite a razão social"
                                    }
                                    onChange={(event) =>
                                        updateField("name", event.target.value)
                                    }
                                />
                            </label>

                            {form.type === "COMPANY" && (
                                <label className={styles.fullField}>
                                    <span>Nome fantasia</span>

                                    <input
                                        type="text"
                                        value={form.tradeName}
                                        maxLength={160}
                                        placeholder="Digite o nome fantasia"
                                        onChange={(event) =>
                                            updateField("tradeName", event.target.value)
                                        }
                                    />
                                </label>
                            )}

                            <label>
                                <span>
                                    {form.type === "INDIVIDUAL" ? "CPF" : "CNPJ"}
                                </span>

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={form.documentNumber}
                                    placeholder={
                                        form.type === "INDIVIDUAL"
                                            ? "000.000.000-00"
                                            : "00.000.000/0000-00"
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "documentNumber",
                                            formatDocument(event.target.value, form.type),
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>
                                    {form.type === "INDIVIDUAL"
                                        ? "RG ou documento"
                                        : "Inscrição estadual"}
                                </span>

                                <input
                                    type="text"
                                    value={
                                        form.type === "INDIVIDUAL"
                                            ? form.secondaryDocument
                                            : form.stateRegistration
                                    }
                                    maxLength={30}
                                    placeholder={
                                        form.type === "INDIVIDUAL"
                                            ? "Documento complementar"
                                            : "Inscrição estadual"
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            form.type === "INDIVIDUAL"
                                                ? "secondaryDocument"
                                                : "stateRegistration",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>
                                    {form.type === "INDIVIDUAL"
                                        ? "Data de nascimento"
                                        : "Data de fundação"}
                                </span>

                                <input
                                    type="date"
                                    value={form.birthOrFoundationDate}
                                    onChange={(event) =>
                                        updateField(
                                            "birthOrFoundationDate",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>E-mail</span>

                                <input
                                    type="email"
                                    value={form.email}
                                    maxLength={160}
                                    placeholder="cliente@email.com"
                                    onChange={(event) =>
                                        updateField("email", event.target.value)
                                    }
                                />
                            </label>

                            <label>
                                <span>Telefone</span>

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
                                <span>Celular</span>

                                <input
                                    type="text"
                                    inputMode="tel"
                                    value={form.mobile}
                                    placeholder="(00) 00000-0000"
                                    onChange={(event) =>
                                        updateField(
                                            "mobile",
                                            formatPhone(event.target.value),
                                        )
                                    }
                                />
                            </label>
                        </div>
                    </fieldset>

                    <fieldset className={styles.fieldset}>
                        <div className={styles.fieldsetTitle}>
                            <legend>Endereço principal</legend>

                            <label className={styles.toggle}>
                                <input
                                    type="checkbox"
                                    checked={form.includeAddress}
                                    onChange={(event) =>
                                        updateField(
                                            "includeAddress",
                                            event.target.checked,
                                        )
                                    }
                                />

                                <span>Cadastrar endereço</span>
                            </label>
                        </div>

                        {form.includeAddress && (
                            <div className={styles.formGrid}>
                                <label>
                                    <span>Tipo de endereço</span>

                                    <select
                                        value={form.addressType}
                                        onChange={(event) =>
                                            updateField(
                                                "addressType",
                                                event.target.value as AddressType,
                                            )
                                        }
                                    >
                                        <option value="RESIDENTIAL">
                                            Residencial
                                        </option>
                                        <option value="COMMERCIAL">Comercial</option>
                                        <option value="CORRESPONDENCE">
                                            Correspondência
                                        </option>
                                        <option value="OTHER">Outro</option>
                                    </select>
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

                                <label className={styles.streetField}>
                                    <span>
                                        Logradouro
                                        <strong>*</strong>
                                    </span>

                                    <input
                                        type="text"
                                        value={form.street}
                                        maxLength={160}
                                        placeholder="Rua, avenida ou travessa"
                                        onChange={(event) =>
                                            updateField("street", event.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    <span>Número</span>

                                    <input
                                        type="text"
                                        value={form.number}
                                        maxLength={30}
                                        placeholder="Número"
                                        onChange={(event) =>
                                            updateField("number", event.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    <span>Complemento</span>

                                    <input
                                        type="text"
                                        value={form.complement}
                                        maxLength={100}
                                        placeholder="Sala, apartamento ou bloco"
                                        onChange={(event) =>
                                            updateField("complement", event.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    <span>Bairro</span>

                                    <input
                                        type="text"
                                        value={form.district}
                                        maxLength={100}
                                        placeholder="Bairro"
                                        onChange={(event) =>
                                            updateField("district", event.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        Cidade
                                        <strong>*</strong>
                                    </span>

                                    <input
                                        type="text"
                                        value={form.city}
                                        maxLength={100}
                                        placeholder="Cidade"
                                        onChange={(event) =>
                                            updateField("city", event.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        Estado
                                        <strong>*</strong>
                                    </span>

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
                                    <span>País</span>

                                    <input
                                        type="text"
                                        value={form.country}
                                        maxLength={80}
                                        onChange={(event) =>
                                            updateField("country", event.target.value)
                                        }
                                    />
                                </label>
                            </div>
                        )}
                    </fieldset>

                    <fieldset className={styles.fieldset}>
                        <legend>Observações</legend>

                        <label className={styles.fullField}>
                            <span>Informações adicionais</span>

                            <textarea
                                value={form.notes}
                                maxLength={5000}
                                rows={4}
                                placeholder="Registre observações relevantes sobre o cliente."
                                onChange={(event) =>
                                    updateField("notes", event.target.value)
                                }
                            />
                        </label>
                    </fieldset>

                    {feedback && (
                        <div
                            className={styles.feedback}
                            data-type={feedback.type}
                            role="status"
                        >
                            {feedback.type === "success" ? (
                                <CheckCircle2 size={19} />
                            ) : (
                                <XCircle size={19} />
                            )}

                            <span>{feedback.message}</span>
                        </div>
                    )}

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.clearButton}
                            disabled={isSubmitting}
                            onClick={
                                editingClientId ? cancelEditing : resetForm
                            }
                        >
                            {editingClientId ? (
                                <X size={17} />
                            ) : (
                                <RotateCcw size={17} />
                            )}

                            {editingClientId ? "Cancelar edição" : "Limpar"}
                        </button>

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <Loader2 className={styles.spin} size={18} />
                            ) : editingClientId ? (
                                <Pencil size={18} />
                            ) : (
                                <Save size={18} />
                            )}

                            {isSubmitting
                                ? editingClientId
                                    ? "Atualizando..."
                                    : "Salvando..."
                                : editingClientId
                                    ? "Atualizar cliente"
                                    : "Cadastrar cliente"}
                        </button>
                    </div>
                </form>
            </section>

            <section className={styles.listCard}>
                <div className={styles.cardHeader}>
                    <div className={styles.headerIcon}>
                        <UsersRound size={23} />
                    </div>

                    <div>
                        <span>Base cadastrada</span>
                        <h3>Clientes encontrados</h3>
                        <p>Consulte e edite os registros cadastrados.</p>
                    </div>
                </div>

                <div className={styles.metrics}>
                    <div>
                        <span>Total</span>
                        <strong>{clients.length}</strong>
                    </div>

                    <div>
                        <span>Pessoas físicas</span>
                        <strong>{individualCount}</strong>
                    </div>

                    <div>
                        <span>Empresas</span>
                        <strong>{companyCount}</strong>
                    </div>
                </div>

                <div className={styles.listTools}>
                    <label className={styles.searchBox}>
                        <Search size={18} />

                        <input
                            type="search"
                            value={search}
                            placeholder="Pesquisar nome, CPF, CNPJ ou e-mail"
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </label>

                    <div className={styles.filters}>
                        <button
                            type="button"
                            data-active={typeFilter === "ALL"}
                            onClick={() => setTypeFilter("ALL")}
                        >
                            Todos
                        </button>

                        <button
                            type="button"
                            data-active={typeFilter === "INDIVIDUAL"}
                            onClick={() => setTypeFilter("INDIVIDUAL")}
                        >
                            Pessoas
                        </button>

                        <button
                            type="button"
                            data-active={typeFilter === "COMPANY"}
                            onClick={() => setTypeFilter("COMPANY")}
                        >
                            Empresas
                        </button>
                    </div>
                </div>

                <div className={styles.resultInformation}>
                    <span>
                        {filteredClients.length}{" "}
                        {filteredClients.length === 1
                            ? "registro exibido"
                            : "registros exibidos"}
                    </span>

                    <button
                        type="button"
                        onClick={() => void loadClients()}
                        disabled={isLoading}
                    >
                        <RotateCcw
                            className={isLoading ? styles.spin : undefined}
                            size={16}
                        />
                        Atualizar
                    </button>
                </div>

                <div className={styles.clientList}>
                    {isLoading ? (
                        <div className={styles.loadingState}>
                            <Loader2 className={styles.spin} size={30} />
                            <strong>Carregando clientes...</strong>
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div>
                                <UsersRound size={32} />
                            </div>

                            <strong>Nenhum cliente encontrado</strong>

                            <p>
                                Cadastre o primeiro cliente ou altere os filtros de
                                pesquisa.
                            </p>
                        </div>
                    ) : (
                        filteredClients.map((client) => {
                            const primaryAddress =
                                client.addresses.find(
                                    (address) => address.isPrimary,
                                ) ?? client.addresses[0];

                            const phone = client.mobile ?? client.phone;

                            return (
                                <article
                                    key={client.id}
                                    className={styles.clientItem}
                                >
                                    <div
                                        className={styles.clientAvatar}
                                        data-type={client.type}
                                    >
                                        {client.type === "INDIVIDUAL" ? (
                                            <UserRound size={22} />
                                        ) : (
                                            <Building2 size={22} />
                                        )}
                                    </div>

                                    <div className={styles.clientContent}>
                                        <div className={styles.clientTitle}>
                                            <div>
                                                <h4>{client.name}</h4>

                                                {client.tradeName && (
                                                    <p>{client.tradeName}</p>
                                                )}
                                            </div>

                                            <div className={styles.clientActions}>
                                                <span data-type={client.type}>
                                                    {client.type === "INDIVIDUAL"
                                                        ? "Pessoa física"
                                                        : "Pessoa jurídica"}
                                                </span>


                                                <button type="button" className={styles.printButton} disabled={printingClientId === client.id || isSubmitting} onClick={() => void handlePrintClient(client.id)}>
                                                    {printingClientId === client.id ? <Loader2 className={styles.spin} size={14} /> : <Printer size={14} />}
                                                    Imprimir
                                                </button>

                                                <button
                                                    type="button"
                                                    className={styles.editButton}
                                                    disabled={
                                                        isLoadingClient || isSubmitting
                                                    }
                                                    onClick={() =>
                                                        void loadClientForEditing(client.id)
                                                    }
                                                >
                                                    {isLoadingClient &&
                                                        editingClientId === client.id ? (
                                                        <Loader2
                                                            className={styles.spin}
                                                            size={14}
                                                        />
                                                    ) : (
                                                        <Pencil size={14} />
                                                    )}

                                                    Editar
                                                </button>
                                                <DeleteEntityButton
                                                    endpoint={`/api/clients/${encodeURIComponent(
                                                        client.id,
                                                    )}/delete`}
                                                    itemName={client.name}
                                                    entityLabel="cliente"
                                                    disabled={isLoadingClient || isSubmitting}
                                                />
                                            </div>
                                        </div>

                                        <div className={styles.clientDetails}>
                                            <span>
                                                <FileText size={15} />
                                                {formatStoredDocument(
                                                    client.documentNumber,
                                                    client.type,
                                                )}
                                            </span>

                                            {client.email && (
                                                <span>
                                                    <Mail size={15} />
                                                    {client.email}
                                                </span>
                                            )}

                                            {phone && (
                                                <span>
                                                    <Phone size={15} />
                                                    {phone}
                                                </span>
                                            )}

                                            {primaryAddress && (
                                                <span>
                                                    <MapPin size={15} />
                                                    {primaryAddress.city}/
                                                    {primaryAddress.state}
                                                </span>
                                            )}

                                            <span>
                                                <CalendarDays size={15} />
                                                Cadastrado em{" "}
                                                {formatDate(client.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            </section>
        </div>
    );
}