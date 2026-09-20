//src/components/calculations/EditCalculationModal/EditCalculationModal.tsx

"use client";

import {
    AlertCircle,
    BriefcaseBusiness,
    CalendarDays,
    CheckCircle2,
    FilePenLine,
    Loader2,
    Pencil,
    Save,
    UserRound,
    X,
} from "lucide-react";
import {
    FormEvent,
    useEffect,
    useId,
    useState,
} from "react";
import { createPortal } from "react-dom";

import styles from "./styles.module.scss";

type CalculationStatus =
    | "DRAFT"
    | "CALCULATED"
    | "FINALIZED";

type EditCalculationModalProps = {
    calculationId: string;
    itemName: string;
    disabled?: boolean;
    onUpdated: () => void | Promise<void>;
};

type ClientRecord = {
    id: string;
    name: string;
    tradeName: string | null;
};

type ProcessRecord = {
    id: string;
    caseNumber: string | null;
    title: string | null;
};

type CalculationDetails = {
    id: string;
    title: string | null;
    description: string | null;
    clientId: string | null;
    legalProcessId: string | null;
    referenceDate: string | null;
    status: CalculationStatus;
    notes: string | null;
};

type ValidationErrors = {
    formErrors?: string[];
    fieldErrors?: Record<string, string[] | undefined>;
};

type CalculationResponse = {
    message?: string;
    calculation?: CalculationDetails;
    errors?: ValidationErrors;
};

type ClientListResponse = {
    message?: string;
    clients?: ClientRecord[];
};

type ProcessListResponse = {
    message?: string;
    processes?: ProcessRecord[];
};

function getApiError(payload: CalculationResponse) {
    const fieldError = Object.values(
        payload.errors?.fieldErrors ?? {},
    )
        .flatMap((errors) => errors ?? [])
        .find(Boolean);

    return (
        fieldError ??
        payload.errors?.formErrors?.find(Boolean) ??
        payload.message ??
        "Não foi possível concluir a operação."
    );
}

export default function EditCalculationModal({
    calculationId,
    itemName,
    disabled = false,
    onUpdated,
}: EditCalculationModalProps) {
    const titleId = useId();

    const [isMounted, setIsMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const [clients, setClients] = useState<ClientRecord[]>([]);
    const [processes, setProcesses] = useState<ProcessRecord[]>([]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [clientId, setClientId] = useState("");
    const [legalProcessId, setLegalProcessId] = useState("");
    const [referenceDate, setReferenceDate] = useState("");
    const [status, setStatus] =
        useState<CalculationStatus>("CALCULATED");
    const [notes, setNotes] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !isSaving) {
                setIsOpen(false);
                setErrorMessage("");
                setSuccessMessage("");
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, isSaving]);

    async function loadData() {
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const [
                calculationResponse,
                clientsResponse,
                processesResponse,
            ] = await Promise.all([
                fetch(
                    `/api/calculations/${encodeURIComponent(calculationId)}`,
                    {
                        method: "GET",
                        cache: "no-store",
                    },
                ),

                fetch("/api/clients", {
                    method: "GET",
                    cache: "no-store",
                }),

                fetch("/api/processes", {
                    method: "GET",
                    cache: "no-store",
                }),
            ]);

            const calculationPayload =
                (await calculationResponse.json()) as CalculationResponse;

            const clientsPayload =
                (await clientsResponse.json()) as ClientListResponse;

            const processesPayload =
                (await processesResponse.json()) as ProcessListResponse;

            if (
                !calculationResponse.ok ||
                !calculationPayload.calculation
            ) {
                throw new Error(
                    calculationPayload.message ??
                    "Não foi possível carregar o cálculo.",
                );
            }

            if (!clientsResponse.ok) {
                throw new Error(
                    clientsPayload.message ??
                    "Não foi possível carregar os clientes.",
                );
            }

            if (!processesResponse.ok) {
                throw new Error(
                    processesPayload.message ??
                    "Não foi possível carregar os processos.",
                );
            }

            const calculation = calculationPayload.calculation;

            setTitle(calculation.title ?? itemName);
            setDescription(calculation.description ?? "");
            setClientId(calculation.clientId ?? "");
            setLegalProcessId(calculation.legalProcessId ?? "");
            setReferenceDate(
                calculation.referenceDate?.slice(0, 10) ?? "",
            );
            setStatus(calculation.status);
            setNotes(calculation.notes ?? "");

            setClients(clientsPayload.clients ?? []);
            setProcesses(processesPayload.processes ?? []);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Não foi possível carregar o cálculo.",
            );
        } finally {
            setIsLoading(false);
        }
    }

    function openModal() {
        if (disabled) {
            return;
        }

        setIsOpen(true);
        void loadData();
    }

    function closeModal() {
        if (isSaving) {
            return;
        }

        setIsOpen(false);
        setErrorMessage("");
        setSuccessMessage("");
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (title.trim().length < 2) {
            setErrorMessage("Informe o título do cálculo.");
            return;
        }

        setIsSaving(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const response = await fetch(
                `/api/calculations/${encodeURIComponent(calculationId)}`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        title,
                        description,
                        clientId: clientId || undefined,
                        legalProcessId: legalProcessId || undefined,
                        referenceDate,
                        status,
                        notes,
                    }),
                },
            );

            const payload =
                (await response.json()) as CalculationResponse;

            if (!response.ok) {
                throw new Error(getApiError(payload));
            }

            await onUpdated();

            setSuccessMessage(
                payload.message ?? "Cálculo atualizado com sucesso.",
            );
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Não foi possível atualizar o cálculo.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    const modal =
        isMounted && isOpen
            ? createPortal(
                <div
                    className={styles.overlay}
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeModal();
                        }
                    }}
                >
                    <section
                        className={styles.modal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className={styles.closeButton}
                            disabled={isSaving}
                            title="Fechar"
                            aria-label="Fechar edição"
                            onClick={closeModal}
                        >
                            <X size={19} />
                        </button>

                        <div className={styles.modalHeader}>
                            <div className={styles.headerIcon}>
                                <FilePenLine size={27} />
                            </div>

                            <div>
                                <span>Alteração de registro</span>
                                <h2 id={titleId}>Editar cálculo</h2>
                                <p>
                                    Atualize os dados do cálculo salvo no histórico.
                                </p>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className={styles.loading}>
                                <Loader2 className={styles.spin} size={29} />
                                <span>Carregando cálculo...</span>
                            </div>
                        ) : successMessage ? (
                            <div className={styles.successContent}>
                                <div className={styles.successIcon}>
                                    <CheckCircle2 size={34} />
                                </div>

                                <strong>Cálculo atualizado</strong>
                                <p>{successMessage}</p>

                                <button
                                    type="button"
                                    className={styles.finishedButton}
                                    onClick={closeModal}
                                >
                                    Fechar
                                </button>
                            </div>
                        ) : (
                            <form
                                className={styles.form}
                                onSubmit={handleSubmit}
                            >
                                <label className={styles.fullField}>
                                    <span>
                                        Título
                                        <strong>*</strong>
                                    </span>

                                    <input
                                        type="text"
                                        value={title}
                                        maxLength={200}
                                        placeholder="Título do cálculo"
                                        onChange={(event) =>
                                            setTitle(event.target.value)
                                        }
                                    />
                                </label>

                                <label className={styles.fullField}>
                                    <span>Descrição</span>

                                    <textarea
                                        value={description}
                                        rows={3}
                                        maxLength={10000}
                                        placeholder="Descrição do cálculo"
                                        onChange={(event) =>
                                            setDescription(event.target.value)
                                        }
                                    />
                                </label>

                                <div className={styles.formGrid}>
                                    <label>
                                        <span>
                                            <UserRound size={15} />
                                            Cliente
                                        </span>

                                        <select
                                            value={clientId}
                                            onChange={(event) =>
                                                setClientId(event.target.value)
                                            }
                                        >
                                            <option value="">
                                                Nenhum cliente vinculado
                                            </option>

                                            {clients.map((client) => (
                                                <option
                                                    key={client.id}
                                                    value={client.id}
                                                >
                                                    {client.name}
                                                    {client.tradeName
                                                        ? ` — ${client.tradeName}`
                                                        : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label>
                                        <span>
                                            <BriefcaseBusiness size={15} />
                                            Processo
                                        </span>

                                        <select
                                            value={legalProcessId}
                                            onChange={(event) =>
                                                setLegalProcessId(event.target.value)
                                            }
                                        >
                                            <option value="">
                                                Nenhum processo vinculado
                                            </option>

                                            {processes.map((process) => (
                                                <option
                                                    key={process.id}
                                                    value={process.id}
                                                >
                                                    {process.title ??
                                                        process.caseNumber ??
                                                        "Processo sem identificação"}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label>
                                        <span>
                                            <CalendarDays size={15} />
                                            Data-base
                                        </span>

                                        <input
                                            type="date"
                                            value={referenceDate}
                                            onChange={(event) =>
                                                setReferenceDate(event.target.value)
                                            }
                                        />
                                    </label>

                                    <label>
                                        <span>Situação</span>

                                        <select
                                            value={status}
                                            onChange={(event) =>
                                                setStatus(
                                                    event.target
                                                        .value as CalculationStatus,
                                                )
                                            }
                                        >
                                            <option value="DRAFT">Rascunho</option>

                                            <option value="CALCULATED">
                                                Calculado
                                            </option>

                                            <option value="FINALIZED">
                                                Finalizado
                                            </option>
                                        </select>
                                    </label>
                                </div>

                                <label className={styles.fullField}>
                                    <span>Observações</span>

                                    <textarea
                                        value={notes}
                                        rows={4}
                                        maxLength={10000}
                                        placeholder="Observações sobre o cálculo"
                                        onChange={(event) =>
                                            setNotes(event.target.value)
                                        }
                                    />
                                </label>

                                {errorMessage && (
                                    <div className={styles.error}>
                                        <AlertCircle size={18} />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}

                                <div className={styles.actions}>
                                    <button
                                        type="button"
                                        className={styles.cancelButton}
                                        disabled={isSaving}
                                        onClick={closeModal}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="submit"
                                        className={styles.saveButton}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <Loader2
                                                className={styles.spin}
                                                size={18}
                                            />
                                        ) : (
                                            <Save size={18} />
                                        )}

                                        {isSaving
                                            ? "Atualizando..."
                                            : "Atualizar cálculo"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                </div>,
                document.body,
            )
            : null;

    return (
        <>
            <button
                type="button"
                className={styles.editButton}
                disabled={disabled}
                title="Editar cálculo"
                onClick={openModal}
            >
                <Pencil size={14} />
                Editar
            </button>

            {modal}
        </>
    );
}