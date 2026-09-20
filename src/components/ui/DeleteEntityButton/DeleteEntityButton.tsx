//src/components/ui/DeleteEntityButton/DeleteEntityButton.tsx

"use client";

import {
    AlertTriangle,
    Loader2,
    Trash2,
    X,
} from "lucide-react";
import {
    useEffect,
    useId,
    useState,
} from "react";
import { createPortal } from "react-dom";

import styles from "./styles.module.scss";

type DeleteEntityButtonProps = {
    endpoint: string;
    itemName: string;
    entityLabel: string;
    disabled?: boolean;
    redirectTo?: string;
};

type DeleteResponse = {
    message?: string;
};

export default function DeleteEntityButton({
    endpoint,
    itemName,
    entityLabel,
    disabled = false,
    redirectTo,
}: DeleteEntityButtonProps) {
    const titleId = useId();

    const [isMounted, setIsMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
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
            if (event.key === "Escape" && !isDeleting) {
                setIsOpen(false);
                setErrorMessage("");
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, isDeleting]);

    function openModal() {
        if (disabled) {
            return;
        }

        setErrorMessage("");
        setIsOpen(true);
    }

    function closeModal() {
        if (isDeleting) {
            return;
        }

        setIsOpen(false);
        setErrorMessage("");
    }

    async function confirmDelete() {
        setIsDeleting(true);
        setErrorMessage("");

        try {
            const response = await fetch(endpoint, {
                method: "DELETE",
            });

            const payload = (await response.json()) as DeleteResponse;

            if (!response.ok) {
                throw new Error(
                    payload.message ??
                    `Não foi possível excluir o ${entityLabel}.`,
                );
            }

            setIsOpen(false);

            if (redirectTo) {
                window.location.assign(redirectTo);
                return;
            }

            window.location.reload();
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : `Não foi possível excluir o ${entityLabel}.`,
            );
        } finally {
            setIsDeleting(false);
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
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className={styles.closeButton}
                            disabled={isDeleting}
                            title="Fechar"
                            aria-label="Fechar aviso"
                            onClick={closeModal}
                        >
                            <X size={19} />
                        </button>

                        <div className={styles.warningIcon}>
                            <AlertTriangle size={32} />
                        </div>

                        <span className={styles.warningLabel}>
                            Atenção
                        </span>

                        <h2 id={titleId}>
                            Excluir {entityLabel}?
                        </h2>

                        <p>Você está prestes a excluir:</p>

                        <strong className={styles.itemName}>
                            {itemName}
                        </strong>

                        <div className={styles.information}>
                            O registro será removido das listagens, mas os dados
                            históricos e de auditoria permanecerão preservados.
                        </div>

                        {errorMessage && (
                            <div className={styles.errorMessage}>
                                {errorMessage}
                            </div>
                        )}

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={styles.cancelButton}
                                disabled={isDeleting}
                                onClick={closeModal}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className={styles.confirmButton}
                                disabled={isDeleting}
                                onClick={() => void confirmDelete()}
                            >
                                {isDeleting ? (
                                    <Loader2
                                        className={styles.spin}
                                        size={18}
                                    />
                                ) : (
                                    <Trash2 size={18} />
                                )}

                                {isDeleting
                                    ? "Excluindo..."
                                    : "Sim, excluir"}
                            </button>
                        </div>
                    </section>
                </div>,
                document.body,
            )
            : null;

    return (
        <>
            <button
                type="button"
                className={styles.deleteButton}
                disabled={disabled}
                title={`Excluir ${entityLabel}`}
                aria-label={`Excluir ${entityLabel} ${itemName}`}
                onClick={openModal}
            >
                <Trash2 size={14} />
                Excluir
            </button>

            {modal}
        </>
    );
}