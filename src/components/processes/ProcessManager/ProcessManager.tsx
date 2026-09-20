//src/components/processes/ProcessManager/ProcessManager.tsx

"use client";

import {
    AlertCircle,
    BriefcaseBusiness,
    Building2,
    CalendarDays,
    CheckCircle2,
    FilePenLine,
    FileText,
    Gavel,
    Landmark,
    Loader2,
    MapPin,
    Pencil,
    Plus,
    Printer,
    RotateCcw,
    Save,
    Search,
    Trash2,
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

type ProcessStatus =
    | "DRAFT"
    | "ACTIVE"
    | "SUSPENDED"
    | "COMPLETED"
    | "ARCHIVED";

type StatusFilter = "ALL" | ProcessStatus;

type PartyRole =
    | "PLAINTIFF"
    | "DEFENDANT"
    | "INTERESTED_PARTY"
    | "THIRD_PARTY"
    | "EXPERT_ASSISTANT"
    | "OTHER";

type ClientType = "INDIVIDUAL" | "COMPANY";

type ProcessFormState = {
    caseNumber: string;
    title: string;
    court: string;
    courtDivision: string;
    district: string;
    city: string;
    state: string;
    actionClass: string;
    subject: string;
    expertiseObject: string;
    appointmentDate: string;
    deadlineDate: string;
    referenceDate: string;
    status: ProcessStatus;
    notes: string;
};

type PartyFormState = {
    clientId: string;
    role: PartyRole;
    isPrimary: boolean;
    notes: string;
};

type ClientRecord = {
    id: string;
    type: ClientType;
    name: string;
    tradeName: string | null;
    documentNumber: string | null;
    email: string | null;
    phone: string | null;
    mobile: string | null;
};

type ProcessParty = {
    id: string;
    role: PartyRole;
    isPrimary: boolean;
    notes: string | null;
    client: ClientRecord;
};

type ProcessCounts = {
    parties: number;
    calculations: number;
    expertReports: number;
    documents: number;
};

type ProcessRecord = {
    id: string;
    caseNumber: string | null;
    title: string | null;
    court: string | null;
    courtDivision: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
    actionClass: string | null;
    subject: string | null;
    expertiseObject: string | null;
    appointmentDate: string | null;
    deadlineDate: string | null;
    referenceDate: string | null;
    status: ProcessStatus;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    _count: ProcessCounts;
};

type ProcessDetails = ProcessRecord & {
    parties: ProcessParty[];
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

type ProcessListResponse = {
    processes?: ProcessRecord[];
    message?: string;
};

type ProcessDetailsResponse = {
    process?: ProcessDetails;
    message?: string;
};

type ProcessMutationResponse = {
    process?: ProcessRecord;
    message?: string;
};

type ClientListResponse = {
    clients?: ClientRecord[];
    message?: string;
};

function createInitialProcessForm(): ProcessFormState {
    return {
        caseNumber: "",
        title: "",
        court: "",
        courtDivision: "",
        district: "",
        city: "",
        state: "",
        actionClass: "",
        subject: "",
        expertiseObject: "",
        appointmentDate: "",
        deadlineDate: "",
        referenceDate: "",
        status: "DRAFT",
        notes: "",
    };
}

function createInitialPartyForm(): PartyFormState {
    return {
        clientId: "",
        role: "PLAINTIFF",
        isPrimary: false,
        notes: "",
    };
}

function getInputDate(value: string | null) {
    return value?.slice(0, 10) ?? "";
}

function formatDate(value: string | null) {
    if (!value) {
        return "Não informada";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Não informada";
    }

    return new Intl.DateTimeFormat("pt-BR").format(date);
}


function valueOrNotInformed(value: string | null | undefined) { return value?.trim() || "Não informado"; }

function formatClientDocument(value: string | null, type: ClientType) {
    if (!value) return "Não informado";
    const digits = value.replace(/\D/g, "");
    if (type === "INDIVIDUAL") return digits.slice(0, 11).replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
    return digits.slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

function getErrorMessage(payload: ApiErrorResponse) {
    const fieldError = Object.values(
        payload.errors?.fieldErrors ?? {},
    )
        .flatMap((errors) => errors ?? [])
        .find(Boolean);

    if (fieldError) {
        return fieldError;
    }

    return (
        payload.errors?.formErrors?.find(Boolean) ??
        payload.message ??
        "Não foi possível concluir a operação."
    );
}

function getStatusLabel(status: ProcessStatus) {
    const labels: Record<ProcessStatus, string> = {
        DRAFT: "Rascunho",
        ACTIVE: "Ativo",
        SUSPENDED: "Suspenso",
        COMPLETED: "Concluído",
        ARCHIVED: "Arquivado",
    };

    return labels[status];
}

function getPartyRoleLabel(role: PartyRole) {
    const labels: Record<PartyRole, string> = {
        PLAINTIFF: "Autor",
        DEFENDANT: "Réu",
        INTERESTED_PARTY: "Interessado",
        THIRD_PARTY: "Terceiro",
        EXPERT_ASSISTANT: "Assistente técnico",
        OTHER: "Outro",
    };

    return labels[role];
}

export default function ProcessManager() {
    const formCardRef = useRef<HTMLElement | null>(null);

    const [form, setForm] = useState<ProcessFormState>(
        createInitialProcessForm,
    );
    const [partyForm, setPartyForm] = useState<PartyFormState>(
        createInitialPartyForm,
    );

    const [processes, setProcesses] = useState<ProcessRecord[]>([]);
    const [clients, setClients] = useState<ClientRecord[]>([]);
    const [parties, setParties] = useState<ProcessParty[]>([]);

    const [editingProcessId, setEditingProcessId] = useState<
        string | null
    >(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] =
        useState<StatusFilter>("ALL");

    const [feedback, setFeedback] = useState<FeedbackState | null>(
        null,
    );
    const [partyFeedback, setPartyFeedback] =
        useState<FeedbackState | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingProcess, setIsLoadingProcess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [printingProcessId, setPrintingProcessId] = useState<string | null>(null);
    const [isSubmittingParty, setIsSubmittingParty] = useState(false);
    const [removingPartyId, setRemovingPartyId] = useState<
        string | null
    >(null);

    const loadBaseData = useCallback(async () => {
        setIsLoading(true);

        try {
            const [processResponse, clientResponse] = await Promise.all([
                fetch("/api/processes", {
                    method: "GET",
                    cache: "no-store",
                }),
                fetch("/api/clients", {
                    method: "GET",
                    cache: "no-store",
                }),
            ]);

            const processPayload =
                (await processResponse.json()) as ProcessListResponse;

            const clientPayload =
                (await clientResponse.json()) as ClientListResponse;

            if (!processResponse.ok) {
                throw new Error(
                    processPayload.message ??
                    "Não foi possível carregar os processos.",
                );
            }

            if (!clientResponse.ok) {
                throw new Error(
                    clientPayload.message ??
                    "Não foi possível carregar os clientes.",
                );
            }

            setProcesses(processPayload.processes ?? []);
            setClients(clientPayload.clients ?? []);
        } catch (error) {
            setFeedback({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Não foi possível carregar os dados.",
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadBaseData();
    }, [loadBaseData]);

    const filteredProcesses = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return processes.filter((process) => {
            const matchesStatus =
                statusFilter === "ALL" ||
                process.status === statusFilter;

            if (!matchesStatus) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            const searchableContent = [
                process.caseNumber,
                process.title,
                process.court,
                process.courtDivision,
                process.actionClass,
                process.subject,
                process.city,
                process.state,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableContent.includes(normalizedSearch);
        });
    }, [processes, search, statusFilter]);

    const statusCounts = useMemo(
        () => ({
            total: processes.length,
            active: processes.filter(
                (process) => process.status === "ACTIVE",
            ).length,
            draft: processes.filter(
                (process) => process.status === "DRAFT",
            ).length,
            completed: processes.filter(
                (process) => process.status === "COMPLETED",
            ).length,
        }),
        [processes],
    );

    function updateField<K extends keyof ProcessFormState>(
        field: K,
        value: ProcessFormState[K],
    ) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function updatePartyField<K extends keyof PartyFormState>(
        field: K,
        value: PartyFormState[K],
    ) {
        setPartyForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function resetProcessForm() {
        setForm(createInitialProcessForm());
        setPartyForm(createInitialPartyForm());
        setEditingProcessId(null);
        setParties([]);
        setFeedback(null);
        setPartyFeedback(null);
    }

    async function loadProcessForEditing(processId: string) {
        setIsLoadingProcess(true);
        setFeedback(null);
        setPartyFeedback(null);

        try {
            const response = await fetch(
                `/api/processes/${encodeURIComponent(processId)}`,
                {
                    method: "GET",
                    cache: "no-store",
                },
            );

            const payload =
                (await response.json()) as ProcessDetailsResponse;

            if (!response.ok || !payload.process) {
                throw new Error(
                    payload.message ??
                    "Não foi possível carregar o processo.",
                );
            }

            const process = payload.process;

            setEditingProcessId(process.id);
            setParties(process.parties ?? []);

            setForm({
                caseNumber: process.caseNumber ?? "",
                title: process.title ?? "",
                court: process.court ?? "",
                courtDivision: process.courtDivision ?? "",
                district: process.district ?? "",
                city: process.city ?? "",
                state: process.state ?? "",
                actionClass: process.actionClass ?? "",
                subject: process.subject ?? "",
                expertiseObject: process.expertiseObject ?? "",
                appointmentDate: getInputDate(process.appointmentDate),
                deadlineDate: getInputDate(process.deadlineDate),
                referenceDate: getInputDate(process.referenceDate),
                status: process.status,
                notes: process.notes ?? "",
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
                        : "Não foi possível carregar o processo.",
            });
        } finally {
            setIsLoadingProcess(false);
        }
    }


    async function handlePrintProcess(processId: string) {
        setPrintingProcessId(processId); setFeedback(null);

        try {
            const response = await fetch(`/api/processes/${encodeURIComponent(processId)}`, { method: "GET", cache: "no-store" });
            const payload = (await response.json()) as ProcessDetailsResponse;
            if (!response.ok || !payload.process) throw new Error(payload.message ?? "Não foi possível carregar o processo para impressão.");

            const process = payload.process;
            const printResult = printProfessionalDocument({
                title: process.title ?? process.caseNumber ?? "Ficha do processo", subtitle: "Cadastro e informações periciais do processo", documentType: "Ficha processual", orientation: process.parties.length > 5 ? "landscape" : "portrait",
                metadata: [
                    { label: "Número", value: valueOrNotInformed(process.caseNumber) },
                    { label: "Situação", value: getStatusLabel(process.status) },
                    { label: "Data-base", value: formatDate(process.referenceDate) },
                    { label: "Atualização", value: formatDate(process.updatedAt) },
                ],
                sections: [
                    {
                        title: "Identificação do processo", columns: 2, rows: [
                            { label: "Título", value: valueOrNotInformed(process.title), highlight: true },
                            { label: "Número do processo", value: valueOrNotInformed(process.caseNumber) },
                            { label: "Situação", value: getStatusLabel(process.status) },
                            { label: "Classe da ação", value: valueOrNotInformed(process.actionClass) },
                            { label: "Assunto", value: valueOrNotInformed(process.subject) },
                        ]
                    },
                    {
                        title: "Órgão judicial", columns: 2, rows: [
                            { label: "Tribunal", value: valueOrNotInformed(process.court) },
                            { label: "Vara ou unidade", value: valueOrNotInformed(process.courtDivision) },
                            { label: "Comarca", value: valueOrNotInformed(process.district) },
                            { label: "Cidade/UF", value: process.city ? `${process.city}${process.state ? `/${process.state}` : ""}` : "Não informado" },
                        ]
                    },
                    {
                        title: "Datas e prazos", columns: 3, rows: [
                            { label: "Nomeação", value: formatDate(process.appointmentDate) },
                            { label: "Prazo de entrega", value: formatDate(process.deadlineDate) },
                            { label: "Data-base", value: formatDate(process.referenceDate) },
                        ]
                    },
                    { title: "Objeto da perícia", note: valueOrNotInformed(process.expertiseObject) },
                    ...(process.parties.length ? [{
                        title: "Partes vinculadas", table: {
                            compact: true, columns: [
                                { key: "role", label: "Função" }, { key: "name", label: "Cliente" }, { key: "document", label: "Documento" }, { key: "primary", label: "Principal", align: "center" as const }, { key: "notes", label: "Observação" },
                            ], rows: process.parties.map((party) => ({ role: getPartyRoleLabel(party.role), name: party.client.name, document: formatClientDocument(party.client.documentNumber, party.client.type), primary: party.isPrimary ? "Sim" : "Não", notes: valueOrNotInformed(party.notes) }))
                        }
                    }] : []),
                    {
                        title: "Vínculos e registros", columns: 4, rows: [
                            { label: "Partes", value: String(process._count.parties) },
                            { label: "Cálculos", value: String(process._count.calculations) },
                            { label: "Laudos", value: String(process._count.expertReports) },
                            { label: "Documentos", value: String(process._count.documents) },
                        ]
                    },
                    { title: "Observações", note: valueOrNotInformed(process.notes) },
                ],
                footerText: "Ficha processual gerada pelo LHP Sistema Contábil",
            });

            if (!printResult.ok) throw new Error(printResult.error);
        } catch (error) {
            setFeedback({ type: "error", message: error instanceof Error ? error.message : "Não foi possível imprimir a ficha do processo." });
        } finally { setPrintingProcessId(null); }
    }

    async function handleProcessSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setFeedback(null);

        if (form.title.trim().length < 2) {
            setFeedback({
                type: "error",
                message: "Informe o título do processo.",
            });

            return;
        }

        setIsSubmitting(true);

        const payload = {
            ...form,
            state: form.state.toUpperCase(),
        };

        const isEditing = Boolean(editingProcessId);

        const endpoint = isEditing
            ? `/api/processes/${encodeURIComponent(editingProcessId!)}`
            : "/api/processes";

        try {
            const response = await fetch(endpoint, {
                method: isEditing ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const responsePayload =
                (await response.json()) as ProcessMutationResponse &
                ApiErrorResponse;

            if (!response.ok) {
                throw new Error(getErrorMessage(responsePayload));
            }

            await loadBaseData();

            const processId =
                responsePayload.process?.id ?? editingProcessId;

            if (processId) {
                await loadProcessForEditing(processId);
            }

            setFeedback({
                type: "success",
                message:
                    responsePayload.message ??
                    (isEditing
                        ? "Processo atualizado com sucesso."
                        : "Processo cadastrado com sucesso."),
            });
        } catch (error) {
            setFeedback({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Não foi possível salvar o processo.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handlePartySubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setPartyFeedback(null);

        if (!editingProcessId) {
            return;
        }

        if (!partyForm.clientId) {
            setPartyFeedback({
                type: "error",
                message: "Selecione um cliente.",
            });

            return;
        }

        setIsSubmittingParty(true);

        try {
            const response = await fetch(
                `/api/processes/${encodeURIComponent(
                    editingProcessId,
                )}/parties`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(partyForm),
                },
            );

            const payload =
                (await response.json()) as ApiErrorResponse;

            if (!response.ok) {
                throw new Error(getErrorMessage(payload));
            }

            setPartyForm(createInitialPartyForm());

            await Promise.all([
                loadProcessForEditing(editingProcessId),
                loadBaseData(),
            ]);

            setPartyFeedback({
                type: "success",
                message:
                    payload.message ??
                    "Parte vinculada ao processo com sucesso.",
            });
        } catch (error) {
            setPartyFeedback({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Não foi possível vincular a parte.",
            });
        } finally {
            setIsSubmittingParty(false);
        }
    }

    async function removeParty(partyId: string) {
        if (!editingProcessId) {
            return;
        }

        setRemovingPartyId(partyId);
        setPartyFeedback(null);

        try {
            const response = await fetch(
                `/api/processes/${encodeURIComponent(
                    editingProcessId,
                )}/parties`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        partyId,
                    }),
                },
            );

            const payload =
                (await response.json()) as ApiErrorResponse;

            if (!response.ok) {
                throw new Error(getErrorMessage(payload));
            }

            await Promise.all([
                loadProcessForEditing(editingProcessId),
                loadBaseData(),
            ]);

            setPartyFeedback({
                type: "success",
                message:
                    payload.message ??
                    "Parte removida do processo com sucesso.",
            });
        } catch (error) {
            setPartyFeedback({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Não foi possível remover a parte.",
            });
        } finally {
            setRemovingPartyId(null);
        }
    }

    return (
        <div className={styles.manager}>
            <section ref={formCardRef} className={styles.formCard}>
                <div className={styles.cardHeader}>
                    <div className={styles.headerIcon}>
                        {editingProcessId ? (
                            <FilePenLine size={23} />
                        ) : (
                            <Gavel size={23} />
                        )}
                    </div>

                    <div>
                        <span>
                            {editingProcessId
                                ? "Alteração de processo"
                                : "Novo processo"}
                        </span>

                        <h3>
                            {editingProcessId
                                ? "Editar processo"
                                : "Cadastrar processo"}
                        </h3>

                        <p>
                            Registre os dados judiciais, prazos e objeto da perícia.
                        </p>
                    </div>
                </div>

                {editingProcessId && (
                    <div className={styles.editingBanner}>
                        <Pencil size={18} />

                        <div>
                            <strong>Modo de edição ativo</strong>
                            <span>{form.title}</span>
                        </div>

                        <button
                            type="button"
                            title="Cancelar edição"
                            onClick={resetProcessForm}
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                <form
                    className={styles.form}
                    onSubmit={handleProcessSubmit}
                >
                    <fieldset className={styles.fieldset}>
                        <legend>Identificação do processo</legend>

                        <div className={styles.formGrid}>
                            <label className={styles.fullField}>
                                <span>
                                    Título do processo
                                    <strong>*</strong>
                                </span>

                                <input
                                    type="text"
                                    value={form.title}
                                    maxLength={200}
                                    placeholder="Ex.: Revisão de contrato bancário"
                                    onChange={(event) =>
                                        updateField("title", event.target.value)
                                    }
                                />
                            </label>

                            <label className={styles.fullField}>
                                <span>Número do processo</span>

                                <input
                                    type="text"
                                    value={form.caseNumber}
                                    maxLength={60}
                                    placeholder="0000000-00.0000.0.00.0000"
                                    onChange={(event) =>
                                        updateField("caseNumber", event.target.value)
                                    }
                                />
                            </label>

                            <label>
                                <span>Status</span>

                                <select
                                    value={form.status}
                                    onChange={(event) =>
                                        updateField(
                                            "status",
                                            event.target.value as ProcessStatus,
                                        )
                                    }
                                >
                                    <option value="DRAFT">Rascunho</option>
                                    <option value="ACTIVE">Ativo</option>
                                    <option value="SUSPENDED">Suspenso</option>
                                    <option value="COMPLETED">Concluído</option>
                                    <option value="ARCHIVED">Arquivado</option>
                                </select>
                            </label>

                            <label>
                                <span>Classe da ação</span>

                                <input
                                    type="text"
                                    value={form.actionClass}
                                    maxLength={160}
                                    placeholder="Classe processual"
                                    onChange={(event) =>
                                        updateField("actionClass", event.target.value)
                                    }
                                />
                            </label>

                            <label className={styles.fullField}>
                                <span>Assunto</span>

                                <input
                                    type="text"
                                    value={form.subject}
                                    maxLength={300}
                                    placeholder="Assunto principal do processo"
                                    onChange={(event) =>
                                        updateField("subject", event.target.value)
                                    }
                                />
                            </label>
                        </div>
                    </fieldset>

                    <fieldset className={styles.fieldset}>
                        <legend>Órgão judicial</legend>

                        <div className={styles.formGrid}>
                            <label>
                                <span>Tribunal</span>

                                <input
                                    type="text"
                                    value={form.court}
                                    maxLength={160}
                                    placeholder="Ex.: Tribunal de Justiça"
                                    onChange={(event) =>
                                        updateField("court", event.target.value)
                                    }
                                />
                            </label>

                            <label>
                                <span>Vara ou unidade</span>

                                <input
                                    type="text"
                                    value={form.courtDivision}
                                    maxLength={160}
                                    placeholder="Ex.: 2ª Vara Cível"
                                    onChange={(event) =>
                                        updateField(
                                            "courtDivision",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>Comarca</span>

                                <input
                                    type="text"
                                    value={form.district}
                                    maxLength={120}
                                    placeholder="Comarca"
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
                        </div>
                    </fieldset>

                    <fieldset className={styles.fieldset}>
                        <legend>Datas e prazos</legend>

                        <div className={styles.formGrid}>
                            <label>
                                <span>Data da nomeação</span>

                                <input
                                    type="date"
                                    value={form.appointmentDate}
                                    onChange={(event) =>
                                        updateField(
                                            "appointmentDate",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>Prazo para entrega</span>

                                <input
                                    type="date"
                                    value={form.deadlineDate}
                                    onChange={(event) =>
                                        updateField(
                                            "deadlineDate",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>Data-base dos cálculos</span>

                                <input
                                    type="date"
                                    value={form.referenceDate}
                                    onChange={(event) =>
                                        updateField(
                                            "referenceDate",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>
                    </fieldset>

                    <fieldset className={styles.fieldset}>
                        <legend>Perícia</legend>

                        <div className={styles.formGrid}>
                            <label className={styles.fullField}>
                                <span>Objeto da perícia</span>

                                <textarea
                                    value={form.expertiseObject}
                                    rows={5}
                                    maxLength={10000}
                                    placeholder="Descreva o objeto e a finalidade da perícia."
                                    onChange={(event) =>
                                        updateField(
                                            "expertiseObject",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label className={styles.fullField}>
                                <span>Observações</span>

                                <textarea
                                    value={form.notes}
                                    rows={4}
                                    maxLength={10000}
                                    placeholder="Informações complementares."
                                    onChange={(event) =>
                                        updateField("notes", event.target.value)
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
                            onClick={resetProcessForm}
                        >
                            {editingProcessId ? (
                                <X size={17} />
                            ) : (
                                <RotateCcw size={17} />
                            )}

                            {editingProcessId ? "Cancelar edição" : "Limpar"}
                        </button>

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <Loader2 className={styles.spin} size={18} />
                            ) : editingProcessId ? (
                                <Pencil size={18} />
                            ) : (
                                <Save size={18} />
                            )}

                            {isSubmitting
                                ? "Salvando..."
                                : editingProcessId
                                    ? "Atualizar processo"
                                    : "Cadastrar processo"}
                        </button>
                    </div>
                </form>

                {editingProcessId && (
                    <section className={styles.partySection}>
                        <div className={styles.partyHeader}>
                            <div>
                                <span>Partes relacionadas</span>
                                <h3>Clientes vinculados ao processo</h3>
                            </div>

                            <UsersRound size={23} />
                        </div>

                        <form
                            className={styles.partyForm}
                            onSubmit={handlePartySubmit}
                        >
                            <label className={styles.clientSelect}>
                                <span>Cliente</span>

                                <select
                                    value={partyForm.clientId}
                                    onChange={(event) =>
                                        updatePartyField(
                                            "clientId",
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="">Selecione um cliente</option>

                                    {clients.map((client) => (
                                        <option key={client.id} value={client.id}>
                                            {client.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>Função no processo</span>

                                <select
                                    value={partyForm.role}
                                    onChange={(event) =>
                                        updatePartyField(
                                            "role",
                                            event.target.value as PartyRole,
                                        )
                                    }
                                >
                                    <option value="PLAINTIFF">Autor</option>
                                    <option value="DEFENDANT">Réu</option>
                                    <option value="INTERESTED_PARTY">
                                        Interessado
                                    </option>
                                    <option value="THIRD_PARTY">Terceiro</option>
                                    <option value="EXPERT_ASSISTANT">
                                        Assistente técnico
                                    </option>
                                    <option value="OTHER">Outro</option>
                                </select>
                            </label>

                            <label className={styles.partyNotes}>
                                <span>Observação</span>

                                <input
                                    type="text"
                                    value={partyForm.notes}
                                    maxLength={3000}
                                    placeholder="Observação opcional"
                                    onChange={(event) =>
                                        updatePartyField("notes", event.target.value)
                                    }
                                />
                            </label>

                            <label className={styles.primaryCheck}>
                                <input
                                    type="checkbox"
                                    checked={partyForm.isPrimary}
                                    onChange={(event) =>
                                        updatePartyField(
                                            "isPrimary",
                                            event.target.checked,
                                        )
                                    }
                                />

                                <span>Parte principal</span>
                            </label>

                            <button
                                type="submit"
                                className={styles.addPartyButton}
                                disabled={isSubmittingParty}
                            >
                                {isSubmittingParty ? (
                                    <Loader2 className={styles.spin} size={17} />
                                ) : (
                                    <Plus size={17} />
                                )}

                                Vincular cliente
                            </button>
                        </form>

                        {partyFeedback && (
                            <div
                                className={styles.feedback}
                                data-type={partyFeedback.type}
                            >
                                {partyFeedback.type === "success" ? (
                                    <CheckCircle2 size={19} />
                                ) : (
                                    <AlertCircle size={19} />
                                )}

                                <span>{partyFeedback.message}</span>
                            </div>
                        )}

                        <div className={styles.partyList}>
                            {parties.length === 0 ? (
                                <div className={styles.emptyParties}>
                                    Nenhuma parte vinculada.
                                </div>
                            ) : (
                                parties.map((party) => (
                                    <article
                                        key={party.id}
                                        className={styles.partyItem}
                                    >
                                        <div
                                            className={styles.partyAvatar}
                                            data-type={party.client.type}
                                        >
                                            {party.client.type === "INDIVIDUAL" ? (
                                                <UserRound size={20} />
                                            ) : (
                                                <Building2 size={20} />
                                            )}
                                        </div>

                                        <div className={styles.partyContent}>
                                            <strong>{party.client.name}</strong>

                                            <div>
                                                <span>
                                                    {getPartyRoleLabel(party.role)}
                                                </span>

                                                {party.isPrimary && (
                                                    <span className={styles.primaryBadge}>
                                                        Principal
                                                    </span>
                                                )}
                                            </div>

                                            {party.notes && <p>{party.notes}</p>}
                                        </div>

                                        <button
                                            type="button"
                                            className={styles.removePartyButton}
                                            disabled={removingPartyId === party.id}
                                            onClick={() => void removeParty(party.id)}
                                        >
                                            {removingPartyId === party.id ? (
                                                <Loader2
                                                    className={styles.spin}
                                                    size={15}
                                                />
                                            ) : (
                                                <Trash2 size={15} />
                                            )}
                                        </button>
                                    </article>
                                ))
                            )}
                        </div>
                    </section>
                )}
            </section>

            <section className={styles.listCard}>
                <div className={styles.cardHeader}>
                    <div className={styles.headerIcon}>
                        <BriefcaseBusiness size={23} />
                    </div>

                    <div>
                        <span>Base processual</span>
                        <h3>Processos cadastrados</h3>
                        <p>Consulte, filtre e edite os processos.</p>
                    </div>
                </div>

                <div className={styles.metrics}>
                    <div>
                        <span>Total</span>
                        <strong>{statusCounts.total}</strong>
                    </div>

                    <div>
                        <span>Ativos</span>
                        <strong>{statusCounts.active}</strong>
                    </div>

                    <div>
                        <span>Rascunhos</span>
                        <strong>{statusCounts.draft}</strong>
                    </div>

                    <div>
                        <span>Concluídos</span>
                        <strong>{statusCounts.completed}</strong>
                    </div>
                </div>

                <label className={styles.searchBox}>
                    <Search size={18} />

                    <input
                        type="search"
                        value={search}
                        placeholder="Pesquisar número, título, tribunal ou assunto"
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </label>

                <div className={styles.filters}>
                    <button
                        type="button"
                        data-active={statusFilter === "ALL"}
                        onClick={() => setStatusFilter("ALL")}
                    >
                        Todos
                    </button>

                    <button
                        type="button"
                        data-active={statusFilter === "ACTIVE"}
                        onClick={() => setStatusFilter("ACTIVE")}
                    >
                        Ativos
                    </button>

                    <button
                        type="button"
                        data-active={statusFilter === "DRAFT"}
                        onClick={() => setStatusFilter("DRAFT")}
                    >
                        Rascunhos
                    </button>

                    <button
                        type="button"
                        data-active={statusFilter === "COMPLETED"}
                        onClick={() => setStatusFilter("COMPLETED")}
                    >
                        Concluídos
                    </button>
                </div>

                <div className={styles.resultInformation}>
                    <span>{filteredProcesses.length} registros exibidos</span>

                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => void loadBaseData()}
                    >
                        <RotateCcw
                            className={isLoading ? styles.spin : undefined}
                            size={16}
                        />
                        Atualizar
                    </button>
                </div>

                <div className={styles.processList}>
                    {isLoading ? (
                        <div className={styles.emptyState}>
                            <Loader2 className={styles.spin} size={30} />
                            <strong>Carregando processos...</strong>
                        </div>
                    ) : filteredProcesses.length === 0 ? (
                        <div className={styles.emptyState}>
                            <BriefcaseBusiness size={32} />
                            <strong>Nenhum processo encontrado</strong>
                        </div>
                    ) : (
                        filteredProcesses.map((process) => (
                            <article
                                key={process.id}
                                className={styles.processItem}
                            >
                                <div className={styles.processTop}>
                                    <div>
                                        <span
                                            className={styles.statusBadge}
                                            data-status={process.status}
                                        >
                                            {getStatusLabel(process.status)}
                                        </span>

                                        <h4>{process.title}</h4>

                                        <p>
                                            {process.caseNumber ??
                                                "Número ainda não informado"}
                                        </p>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "7px",
                                            flexWrap: "wrap",
                                        }}
                                    >

                                        <button type="button" className={styles.printButton} disabled={printingProcessId === process.id || isLoadingProcess} onClick={() => void handlePrintProcess(process.id)}>
                                            {printingProcessId === process.id ? <Loader2 className={styles.spin} size={14} /> : <Printer size={14} />}
                                            Imprimir
                                        </button>

                                        <button
                                            type="button"
                                            className={styles.editButton}
                                            disabled={isLoadingProcess}
                                            onClick={() =>
                                                void loadProcessForEditing(process.id)
                                            }
                                        >
                                            <Pencil size={14} />
                                            Editar
                                        </button>

                                        <DeleteEntityButton
                                            endpoint={`/api/processes/${encodeURIComponent(
                                                process.id,
                                            )}/delete`}
                                            itemName={
                                                process.title ??
                                                process.caseNumber ??
                                                "Processo selecionado"
                                            }
                                            entityLabel="processo"
                                            disabled={isLoadingProcess || isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className={styles.processDetails}>
                                    {process.court && (
                                        <span>
                                            <Landmark size={15} />
                                            {process.court}
                                        </span>
                                    )}

                                    {process.city && (
                                        <span>
                                            <MapPin size={15} />
                                            {process.city}
                                            {process.state
                                                ? `/${process.state}`
                                                : ""}
                                        </span>
                                    )}

                                    <span>
                                        <CalendarDays size={15} />
                                        Prazo: {formatDate(process.deadlineDate)}
                                    </span>
                                </div>

                                <div className={styles.processCounts}>
                                    <span>
                                        <UsersRound size={14} />
                                        {process._count.parties} partes
                                    </span>

                                    <span>
                                        <FileText size={14} />
                                        {process._count.calculations} cálculos
                                    </span>

                                    <span>
                                        <FileText size={14} />
                                        {process._count.expertReports} laudos
                                    </span>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}