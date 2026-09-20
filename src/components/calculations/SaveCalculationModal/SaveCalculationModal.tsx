// src/components/calculations/SaveCalculationModal/SaveCalculationModal.tsx
"use client";

import {
    AlertCircle,
    BriefcaseBusiness,
    CalendarDays,
    CheckCircle2,
    Copy,
    History,
    Loader2,
    Save,
    UserRound,
    X,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CalculationStatus, JsonRecord } from "@/lib/calculations/reopen-calculation";
import styles from "./styles.module.scss";

type EditableCalculationStatus = Exclude<CalculationStatus, "ARCHIVED">;
type SaveDestination = "revision" | "new";

export type CalculationLinePayload = {
    sequence?: number;
    label?: string;
    competence?: string;
    dueDate?: string;
    paymentDate?: string;
    openingBalance?: string | number | null;
    correctionRate?: string | number | null;
    monetaryCorrection?: string | number | null;
    correctedBalance?: string | number | null;
    interestRate?: string | number | null;
    interest?: string | number | null;
    amortization?: string | number | null;
    installment?: string | number | null;
    insurance?: string | number | null;
    fee?: string | number | null;
    fine?: string | number | null;
    payment?: string | number | null;
    closingBalance?: string | number | null;
    debit?: string | number | null;
    credit?: string | number | null;
    dayCount?: number | null;
    weightedBalance?: string | number | null;
    metadata?: Record<string, unknown>;
};

export type RevisionTarget = {
    calculationId: string;
    calculationTitle: string;
    currentVersion: number;
    sourceVersion: number;
    referenceDate: string | null;
    status: EditableCalculationStatus;
};

export type SaveCalculationModalProps = {
    calculationType: string;
    defaultTitle: string;
    defaultDescription?: string;
    input: JsonRecord;
    result: JsonRecord;
    premises?: JsonRecord;
    methodology?: JsonRecord;
    formulas?: JsonRecord;
    summary?: JsonRecord;
    warnings?: JsonRecord;
    lines?: CalculationLinePayload[];
    revisionTarget?: RevisionTarget;
    engineVersion?: string;
    onRevisionSaved?: (version: number) => void;
    disabled?: boolean;
};

type ClientRecord = { id: string; name: string; tradeName: string | null; type: "INDIVIDUAL" | "COMPANY" };
type ProcessRecord = { id: string; caseNumber: string | null; title: string | null };
type ClientListResponse = { clients?: ClientRecord[]; message?: string };
type ProcessListResponse = { processes?: ProcessRecord[]; message?: string };
type ValidationErrors = { formErrors?: string[]; fieldErrors?: Record<string, string[] | undefined> };
type ApiResponse = { message?: string; errors?: ValidationErrors; revision?: { version?: number } };

function getApiError(payload: ApiResponse) {
    const fieldError = Object.values(payload.errors?.fieldErrors ?? {}).flatMap((errors) => errors ?? []).find(Boolean);
    return fieldError ?? payload.errors?.formErrors?.find(Boolean) ?? payload.message ?? "Não foi possível salvar o cálculo.";
}

function formatDateInput(value: string | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getInitialStatus(revisionTarget?: RevisionTarget): EditableCalculationStatus {
    if (!revisionTarget || revisionTarget.status === "FINALIZED") return "CALCULATED";
    return revisionTarget.status;
}

export default function SaveCalculationModal({
    calculationType,
    defaultTitle,
    defaultDescription = "",
    input,
    result,
    premises,
    methodology,
    formulas,
    summary,
    warnings,
    lines = [],
    revisionTarget,
    engineVersion = "1.0.0",
    onRevisionSaved,
    disabled = false,
}: SaveCalculationModalProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [saveDestination, setSaveDestination] = useState<SaveDestination>(revisionTarget ? "revision" : "new");
    const [clients, setClients] = useState<ClientRecord[]>([]);
    const [processes, setProcesses] = useState<ProcessRecord[]>([]);
    const [hasLoadedOptions, setHasLoadedOptions] = useState(false);
    const [title, setTitle] = useState(defaultTitle);
    const [description, setDescription] = useState(defaultDescription);
    const [clientId, setClientId] = useState("");
    const [legalProcessId, setLegalProcessId] = useState("");
    const [referenceDate, setReferenceDate] = useState("");
    const [status, setStatus] = useState<EditableCalculationStatus>("CALCULATED");
    const [notes, setNotes] = useState("");
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const isNewRecord = !revisionTarget || saveDestination === "new";

    useEffect(() => setIsMounted(true), []);

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !isSaving) setIsOpen(false);
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, isSaving]);

    async function loadOptions() {
        if (hasLoadedOptions || isLoadingOptions) return;
        setIsLoadingOptions(true);
        setErrorMessage("");
        try {
            const [clientsResponse, processesResponse] = await Promise.all([
                fetch("/api/clients", { method: "GET", cache: "no-store" }),
                fetch("/api/processes", { method: "GET", cache: "no-store" }),
            ]);
            const clientsPayload = (await clientsResponse.json()) as ClientListResponse;
            const processesPayload = (await processesResponse.json()) as ProcessListResponse;
            if (!clientsResponse.ok) throw new Error(clientsPayload.message ?? "Não foi possível carregar os clientes.");
            if (!processesResponse.ok) throw new Error(processesPayload.message ?? "Não foi possível carregar os processos.");
            setClients(clientsPayload.clients ?? []);
            setProcesses(processesPayload.processes ?? []);
            setHasLoadedOptions(true);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
        } finally {
            setIsLoadingOptions(false);
        }
    }

    function openModal() {
        if (disabled) return;
        const initialDestination: SaveDestination = revisionTarget ? "revision" : "new";
        setSaveDestination(initialDestination);
        setTitle(revisionTarget?.calculationTitle ?? defaultTitle);
        setDescription(defaultDescription);
        setClientId("");
        setLegalProcessId("");
        setReferenceDate(formatDateInput(revisionTarget?.referenceDate));
        setStatus(getInitialStatus(revisionTarget));
        setNotes("");
        setSuccessMessage("");
        setErrorMessage("");
        setIsOpen(true);
        if (!revisionTarget) void loadOptions();
    }

    function closeModal() {
        if (isSaving) return;
        setIsOpen(false);
        setSuccessMessage("");
        setErrorMessage("");
    }

    function changeSaveDestination(destination: SaveDestination) {
        setSaveDestination(destination);
        setErrorMessage("");
        setSuccessMessage("");
        if (destination === "new") void loadOptions();
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isNewRecord && title.trim().length < 2) {
            setErrorMessage("Informe um título para o cálculo.");
            return;
        }
        setIsSaving(true);
        setErrorMessage("");
        setSuccessMessage("");
        try {
            const endpoint = isNewRecord
                ? "/api/calculations"
                : `/api/calculations/${encodeURIComponent(revisionTarget!.calculationId)}/revisions`;
            const requestBody = isNewRecord
                ? {
                    type: calculationType,
                    title: title.trim(),
                    description: description.trim() || undefined,
                    clientId: clientId || undefined,
                    legalProcessId: legalProcessId || undefined,
                    referenceDate: referenceDate || undefined,
                    currency: "BRL",
                    status,
                    engineVersion,
                    input,
                    result,
                    premises,
                    methodology,
                    formulas,
                    summary,
                    warnings,
                    lines,
                    notes: notes.trim() || undefined,
                }
                : {
                    status,
                    engineVersion,
                    referenceDate: referenceDate || undefined,
                    input,
                    result,
                    premises,
                    methodology,
                    formulas,
                    summary,
                    warnings,
                    lines,
                    notes: notes.trim() || undefined,
                };
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });
            const payload = (await response.json()) as ApiResponse;
            if (!response.ok) throw new Error(getApiError(payload));
            const fallbackMessage = isNewRecord
                ? revisionTarget
                    ? "A cópia foi salva como um novo cálculo independente."
                    : "Cálculo salvo no histórico com sucesso."
                : "Nova revisão salva com sucesso.";
            setSuccessMessage(payload.message ?? fallbackMessage);
            const savedVersion = payload.revision?.version;
            if (!isNewRecord && typeof savedVersion === "number") onRevisionSaved?.(savedVersion);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar o cálculo.");
        } finally {
            setIsSaving(false);
        }
    }

    const successTitle = isNewRecord ? (revisionTarget ? "Cópia salva" : "Cálculo salvo") : "Nova revisão salva";
    const submitLabel = isSaving
        ? "Salvando..."
        : isNewRecord
            ? revisionTarget
                ? "Salvar como novo cálculo"
                : "Salvar cálculo"
            : "Salvar nova versão";

    const modal = isMounted && isOpen
        ? createPortal(
            <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
                <section
                    className={styles.modal}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="save-calculation-title"
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    <button type="button" className={styles.closeButton} disabled={isSaving} onClick={closeModal} aria-label="Fechar">
                        <X size={19} />
                    </button>

                    <div className={styles.modalHeader}>
                        <div className={styles.headerIcon}>{revisionTarget ? <History size={27} /> : <Save size={27} />}</div>
                        <div>
                            <span>Memória profissional</span>
                            <h2 id="save-calculation-title">{revisionTarget ? "Escolher forma de salvamento" : "Salvar no histórico"}</h2>
                            <p>
                                {revisionTarget
                                    ? "Salve no cálculo atual ou crie uma cópia independente com os dados já preenchidos."
                                    : "Vincule o cálculo a um cliente ou processo."}
                            </p>
                        </div>
                    </div>

                    {successMessage ? (
                        <div className={styles.successContent}>
                            <div className={styles.successIcon}><CheckCircle2 size={34} /></div>
                            <strong>{successTitle}</strong>
                            <p>{successMessage}</p>
                            <button type="button" className={styles.finishedButton} onClick={closeModal}>Fechar</button>
                        </div>
                    ) : (
                        <form className={styles.form} onSubmit={handleSubmit}>
                            {revisionTarget && (
                                <div className={styles.saveModeChooser}>
                                    <button
                                        type="button"
                                        className={styles.saveModeOption}
                                        data-active={saveDestination === "revision"}
                                        aria-pressed={saveDestination === "revision"}
                                        onClick={() => changeSaveDestination("revision")}
                                    >
                                        <History size={21} />
                                        <span>
                                            <strong>Salvar no mesmo cálculo</strong>
                                            <small>Cria a versão {revisionTarget.currentVersion + 1} e mantém o histórico anterior.</small>
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.saveModeOption}
                                        data-active={saveDestination === "new"}
                                        aria-pressed={saveDestination === "new"}
                                        onClick={() => changeSaveDestination("new")}
                                    >
                                        <Copy size={21} />
                                        <span>
                                            <strong>Salvar como novo cálculo</strong>
                                            <small>Cria uma cópia independente e não altera o cálculo original.</small>
                                        </span>
                                    </button>
                                </div>
                            )}

                            {isLoadingOptions && isNewRecord ? (
                                <div className={styles.loading}>
                                    <Loader2 className={styles.spin} size={28} />
                                    <span>Carregando clientes e processos...</span>
                                </div>
                            ) : (
                                <>
                                    {revisionTarget && !isNewRecord && (
                                        <div className={styles.revisionContext}>
                                            <div><span>Cálculo</span><strong>{revisionTarget.calculationTitle}</strong></div>
                                            <div><span>Versão carregada</span><strong>{revisionTarget.sourceVersion}</strong></div>
                                            <div><span>Nova versão</span><strong>{revisionTarget.currentVersion + 1}</strong></div>
                                        </div>
                                    )}

                                    {isNewRecord && (
                                        <>
                                            {revisionTarget && (
                                                <div className={styles.copyNotice}>
                                                    <Copy size={19} />
                                                    <div>
                                                        <strong>Cópia independente</strong>
                                                        <span>Os dados atuais serão gravados em outro registro. O cálculo original permanecerá intacto.</span>
                                                    </div>
                                                </div>
                                            )}
                                            <label className={styles.fullField}>
                                                <span>Título <strong>*</strong></span>
                                                <input
                                                    type="text"
                                                    value={title}
                                                    maxLength={200}
                                                    placeholder="Título do cálculo"
                                                    onChange={(event) => setTitle(event.target.value)}
                                                />
                                            </label>
                                            <label className={styles.fullField}>
                                                <span>Descrição</span>
                                                <textarea
                                                    value={description}
                                                    rows={3}
                                                    maxLength={10000}
                                                    placeholder="Descrição opcional"
                                                    onChange={(event) => setDescription(event.target.value)}
                                                />
                                            </label>
                                        </>
                                    )}

                                    <div className={styles.formGrid}>
                                        {isNewRecord && (
                                            <>
                                                <label>
                                                    <span><UserRound size={15} />Cliente</span>
                                                    <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                                                        <option value="">Nenhum cliente vinculado</option>
                                                        {clients.map((client) => (
                                                            <option key={client.id} value={client.id}>
                                                                {client.name}{client.tradeName ? ` — ${client.tradeName}` : ""}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label>
                                                    <span><BriefcaseBusiness size={15} />Processo</span>
                                                    <select value={legalProcessId} onChange={(event) => setLegalProcessId(event.target.value)}>
                                                        <option value="">Nenhum processo vinculado</option>
                                                        {processes.map((process) => (
                                                            <option key={process.id} value={process.id}>
                                                                {process.title ?? process.caseNumber ?? "Processo sem identificação"}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </>
                                        )}
                                        <label>
                                            <span><CalendarDays size={15} />Data-base</span>
                                            <input type="date" value={referenceDate} onChange={(event) => setReferenceDate(event.target.value)} />
                                        </label>
                                        <label>
                                            <span>Situação</span>
                                            <select value={status} onChange={(event) => setStatus(event.target.value as EditableCalculationStatus)}>
                                                <option value="CALCULATED">Calculado</option>
                                                <option value="FINALIZED">Finalizado</option>
                                                <option value="DRAFT">Rascunho</option>
                                            </select>
                                        </label>
                                    </div>

                                    <label className={styles.fullField}>
                                        <span>{isNewRecord ? "Observações do cálculo" : "Observações da versão"}</span>
                                        <textarea
                                            value={notes}
                                            rows={3}
                                            maxLength={10000}
                                            placeholder="Registre ajustes, critérios ou observações."
                                            onChange={(event) => setNotes(event.target.value)}
                                        />
                                    </label>
                                </>
                            )}

                            {errorMessage && (
                                <div className={styles.error}><AlertCircle size={18} /><span>{errorMessage}</span></div>
                            )}

                            <div className={styles.actions}>
                                <button type="button" className={styles.cancelButton} disabled={isSaving} onClick={closeModal}>Cancelar</button>
                                <button type="submit" className={styles.saveButton} disabled={isSaving || (isLoadingOptions && isNewRecord)}>
                                    {isSaving ? <Loader2 className={styles.spin} size={18} /> : isNewRecord && revisionTarget ? <Copy size={18} /> : <Save size={18} />}
                                    {submitLabel}
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
            <button type="button" className={styles.openButton} disabled={disabled} onClick={openModal}>
                <Save size={18} />
                {revisionTarget ? "Salvar cálculo" : "Salvar no histórico"}
            </button>
            {modal}
        </>
    );
}