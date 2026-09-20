// src/components/reports/ExpertReportWorkflowActions/ExpertReportWorkflowActions.tsx

"use client";

import {
    CheckCircle2,
    CircleAlert,
    CopyPlus,
    Loader2,
    LockKeyhole,
} from "lucide-react";
import {
    useState,
} from "react";

import styles from "./styles.module.scss";

type ReportStatus =
    | "DRAFT"
    | "IN_REVIEW"
    | "FINALIZED"
    | "ARCHIVED";

type RevisionStatus =
    | "DRAFT"
    | "IN_REVIEW"
    | "FINALIZED";

type WorkflowResponse = {
    message?: string;
    code?: string;
};

type ExpertReportWorkflowActionsProps = {
    reportId: string;
    reportStatus: ReportStatus;
    revisionStatus: RevisionStatus;
    revisionVersion: number;
    onCompleted: () =>
        | void
        | Promise<void>;
};

type WorkflowAction =
    | "FINALIZE"
    | "NEW_REVISION";

export default function ExpertReportWorkflowActions({
    reportId,
    reportStatus,
    revisionStatus,
    revisionVersion,
    onCompleted,
}: ExpertReportWorkflowActionsProps) {
    const [
        activeAction,
        setActiveAction,
    ] =
        useState<WorkflowAction | null>(
            null,
        );

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    const [
        successMessage,
        setSuccessMessage,
    ] = useState("");

    const canFinalize =
        reportStatus !== "ARCHIVED" &&
        revisionStatus ===
        "IN_REVIEW";

    const canCreateRevision =
        reportStatus ===
        "FINALIZED" &&
        revisionStatus ===
        "FINALIZED";

    if (
        !canFinalize &&
        !canCreateRevision
    ) {
        return null;
    }

    async function executeAction(
        action: WorkflowAction,
    ) {
        const isFinalize =
            action === "FINALIZE";

        const confirmationMessage =
            isFinalize
                ? [
                    `Finalizar a revisão ${revisionVersion}?`,
                    "",
                    "A revisão ficará bloqueada para edição.",
                    "Somente uma nova revisão poderá ser alterada.",
                    "",
                    "Confirme também que todas as alterações foram salvas.",
                ].join("\n")
                : [
                    `Criar a revisão ${revisionVersion + 1}?`,
                    "",
                    "O conteúdo da revisão finalizada será copiado para um novo rascunho.",
                    "A revisão anterior permanecerá intacta.",
                ].join("\n");

        if (
            !window.confirm(
                confirmationMessage,
            )
        ) {
            return;
        }

        setActiveAction(action);
        setErrorMessage("");
        setSuccessMessage("");

        const endpoint =
            isFinalize
                ? `/api/reports/${encodeURIComponent(
                    reportId,
                )}/finalize`
                : `/api/reports/${encodeURIComponent(
                    reportId,
                )}/revisions`;

        try {
            const response =
                await fetch(endpoint, {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                });

            const payload =
                (await response.json()) as WorkflowResponse;

            if (!response.ok) {
                throw new Error(
                    payload.message ??
                    "Não foi possível concluir a operação.",
                );
            }

            setSuccessMessage(
                payload.message ??
                (isFinalize
                    ? "Revisão finalizada com sucesso."
                    : "Nova revisão criada com sucesso."),
            );

            await onCompleted();
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Não foi possível concluir a operação.",
            );
        } finally {
            setActiveAction(null);
        }
    }

    return (
        <section
            className={
                styles.container
            }
        >
            <div
                className={
                    styles.information
                }
            >
                {canFinalize ? (
                    <LockKeyhole
                        size={21}
                    />
                ) : (
                    <CopyPlus
                        size={21}
                    />
                )}

                <div>
                    <strong>
                        {canFinalize
                            ? "Finalização da revisão"
                            : "Nova revisão do laudo"}
                    </strong>

                    <p>
                        {canFinalize
                            ? "A finalização congela o conteúdo atualmente salvo e gera o hash definitivo."
                            : "A nova revisão será um rascunho independente, preservando a versão finalizada."}
                    </p>
                </div>
            </div>

            <div
                className={
                    styles.actions
                }
            >
                {canFinalize && (
                    <button
                        type="button"
                        className={
                            styles.finalizeButton
                        }
                        disabled={
                            activeAction !==
                            null
                        }
                        onClick={() =>
                            void executeAction(
                                "FINALIZE",
                            )
                        }
                    >
                        {activeAction ===
                            "FINALIZE" ? (
                            <Loader2
                                className={
                                    styles.spin
                                }
                                size={18}
                            />
                        ) : (
                            <LockKeyhole
                                size={18}
                            />
                        )}

                        {activeAction ===
                            "FINALIZE"
                            ? "Finalizando..."
                            : `Finalizar revisão ${revisionVersion}`}
                    </button>
                )}

                {canCreateRevision && (
                    <button
                        type="button"
                        className={
                            styles.revisionButton
                        }
                        disabled={
                            activeAction !==
                            null
                        }
                        onClick={() =>
                            void executeAction(
                                "NEW_REVISION",
                            )
                        }
                    >
                        {activeAction ===
                            "NEW_REVISION" ? (
                            <Loader2
                                className={
                                    styles.spin
                                }
                                size={18}
                            />
                        ) : (
                            <CopyPlus
                                size={18}
                            />
                        )}

                        {activeAction ===
                            "NEW_REVISION"
                            ? "Criando revisão..."
                            : `Criar revisão ${revisionVersion + 1}`}
                    </button>
                )}
            </div>

            {errorMessage && (
                <div
                    className={
                        styles.errorMessage
                    }
                    role="alert"
                >
                    <CircleAlert
                        size={18}
                    />

                    <span>
                        {errorMessage}
                    </span>
                </div>
            )}

            {successMessage && (
                <div
                    className={
                        styles.successMessage
                    }
                    role="status"
                >
                    <CheckCircle2
                        size={18}
                    />

                    <span>
                        {successMessage}
                    </span>
                </div>
            )}
        </section>
    );
}