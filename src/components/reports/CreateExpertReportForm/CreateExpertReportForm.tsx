// src/components/reports/CreateExpertReportForm/CreateExpertReportForm.tsx

"use client";

import {
    ArrowLeft,
    Calculator,
    CalendarDays,
    CircleAlert,
    FilePlus2,
    History,
    Loader2,
    Scale,
} from "lucide-react";
import Link from "next/link";
import {
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    useRouter,
} from "next/navigation";

import styles from "./styles.module.scss";

type CreateExpertReportFormProps = {
    calculationId?: string;
    calculationVersion?: number;
};

type CalculationRevision = {
    id: string;
    version: number;
    engineVersion: string;
    referenceDate: string | null;
    integrityHash: string | null;
};

type CalculationRecord = {
    id: string;
    type: string;
    title: string | null;
    description: string | null;
    referenceDate: string | null;
    currentVersion: number;

    client: {
        id: string;
        name: string;
        tradeName: string | null;
        documentNumber: string | null;
    } | null;

    legalProcess: {
        id: string;
        caseNumber: string | null;
        title: string | null;
        court: string | null;
        courtDivision: string | null;
    } | null;

    revisions: CalculationRevision[];
};

type CalculationResponse = {
    calculation?: CalculationRecord;
    message?: string;
};

type CreateReportResponse = {
    report?: {
        id: string;
    };

    message?: string;

    errors?: unknown;
};

function formatDateInput(
    value: string | null,
) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (
        Number.isNaN(date.getTime())
    ) {
        return "";
    }

    return date
        .toISOString()
        .slice(0, 10);
}

function formatDate(
    value: string | null,
) {
    if (!value) {
        return "Não informada";
    }

    const date = new Date(value);

    if (
        Number.isNaN(date.getTime())
    ) {
        return "Não informada";
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
    ).format(date);
}

function getTypeLabel(type: string) {
    const normalized = type
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");

    const labels: Record<
        string,
        string
    > = {
        JUROS_SIMPLES:
            "Juros Simples",

        JUROS_COMPOSTOS:
            "Juros Compostos",

        VALOR_PRESENTE:
            "Valor Presente",

        VALOR_FUTURO:
            "Valor Futuro",

        SISTEMA_PRICE:
            "Sistema Price",

        PRICE:
            "Sistema Price",

        SISTEMA_SAC:
            "Sistema SAC",

        SAC:
            "Sistema SAC",

        SISTEMA_GAUSS:
            "Método de Gauss",

        METODO_DE_GAUSS:
            "Método de Gauss",

        GAUSS:
            "Método de Gauss",

        FLUXO_DE_CAIXA:
            "Fluxo de Caixa",

        FLUXO_CAIXA:
            "Fluxo de Caixa",

        ANALISE_PERICIAL:
            "Análise Pericial",
    };

    return labels[normalized] ?? type;
}

export default function CreateExpertReportForm({
    calculationId,
    calculationVersion,
}: CreateExpertReportFormProps) {
    const router = useRouter();

    const [
        calculation,
        setCalculation,
    ] =
        useState<CalculationRecord | null>(
            null,
        );

    const [
        title,
        setTitle,
    ] = useState("");

    const [
        reportNumber,
        setReportNumber,
    ] = useState("");

    const [
        purpose,
        setPurpose,
    ] = useState("");

    const [
        referenceDate,
        setReferenceDate,
    ] = useState("");

    const [
        place,
        setPlace,
    ] = useState("");

    const [
        notes,
        setNotes,
    ] = useState("");

    const [
        isLoading,
        setIsLoading,
    ] = useState(
        Boolean(calculationId),
    );

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    useEffect(() => {
        if (!calculationId) {
            setIsLoading(false);

            setErrorMessage(
                "Nenhum cálculo foi informado para a geração do laudo.",
            );

            return;
        }

        const targetCalculationId =
            calculationId;

        let isActive = true;

        async function loadCalculation() {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const response =
                    await fetch(
                        `/api/calculations/${encodeURIComponent(
                            targetCalculationId,
                        )}`,
                        {
                            method: "GET",
                            cache: "no-store",
                        },
                    );

                const payload =
                    (await response.json()) as CalculationResponse;

                if (
                    !response.ok ||
                    !payload.calculation
                ) {
                    throw new Error(
                        payload.message ??
                        "Não foi possível carregar o cálculo.",
                    );
                }

                if (!isActive) {
                    return;
                }

                const loadedCalculation =
                    payload.calculation;

                const selectedRevision =
                    calculationVersion
                        ? loadedCalculation.revisions.find(
                            (revision) =>
                                revision.version ===
                                calculationVersion,
                        )
                        : loadedCalculation
                            .revisions[0];

                if (!selectedRevision) {
                    throw new Error(
                        calculationVersion
                            ? `A versão ${calculationVersion} do cálculo não foi encontrada.`
                            : "O cálculo ainda não possui revisão disponível.",
                    );
                }

                setCalculation(
                    loadedCalculation,
                );

                setTitle(
                    `Laudo Pericial Contábil - ${loadedCalculation.title ??
                    getTypeLabel(
                        loadedCalculation.type,
                    )
                    }`,
                );

                setPurpose(
                    loadedCalculation.description ??
                    "Apresentar a metodologia, as fórmulas e a memória de cálculo utilizadas na apuração contábil.",
                );

                setReferenceDate(
                    formatDateInput(
                        selectedRevision.referenceDate ??
                        loadedCalculation.referenceDate,
                    ),
                );
            } catch (error) {
                if (!isActive) {
                    return;
                }

                setCalculation(null);

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Não foi possível carregar o cálculo.",
                );
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        }

        void loadCalculation();

        return () => {
            isActive = false;
        };
    }, [
        calculationId,
        calculationVersion,
    ]);

    const selectedRevision =
        useMemo(() => {
            if (!calculation) {
                return null;
            }

            if (calculationVersion) {
                return (
                    calculation.revisions.find(
                        (revision) =>
                            revision.version ===
                            calculationVersion,
                    ) ?? null
                );
            }

            return (
                calculation.revisions[0] ??
                null
            );
        }, [
            calculation,
            calculationVersion,
        ]);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (
            !calculationId ||
            !selectedRevision
        ) {
            setErrorMessage(
                "O cálculo e a versão de origem são obrigatórios.",
            );

            return;
        }

        setIsSubmitting(true);
        setErrorMessage("");

        try {
            const response =
                await fetch(
                    "/api/reports",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify({
                            calculationId,

                            calculationVersion:
                                selectedRevision.version,

                            title:
                                title.trim() ||
                                undefined,

                            reportNumber:
                                reportNumber.trim() ||
                                undefined,

                            purpose:
                                purpose.trim() ||
                                undefined,

                            referenceDate:
                                referenceDate ||
                                undefined,

                            place:
                                place.trim() ||
                                undefined,

                            notes:
                                notes.trim() ||
                                undefined,
                        }),
                    },
                );

            const payload =
                (await response.json()) as CreateReportResponse;

            if (
                !response.ok ||
                !payload.report?.id
            ) {
                throw new Error(
                    payload.message ??
                    "Não foi possível criar o laudo.",
                );
            }

            router.push(
                `/laudos/${encodeURIComponent(
                    payload.report.id,
                )}/editar`,
            );

            router.refresh();
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Não foi possível criar o laudo.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isLoading) {
        return (
            <section
                className={
                    styles.loadingState
                }
            >
                <Loader2
                    className={
                        styles.spin
                    }
                    size={34}
                />

                <strong>
                    Preparando dados do laudo...
                </strong>

                <p>
                    Carregando a versão selecionada
                    do cálculo.
                </p>
            </section>
        );
    }

    if (
        errorMessage &&
        !calculation
    ) {
        return (
            <section
                className={
                    styles.errorState
                }
            >
                <CircleAlert size={35} />

                <strong>
                    Não foi possível iniciar o
                    laudo
                </strong>

                <p>{errorMessage}</p>

                <Link href="/historico">
                    <ArrowLeft size={17} />
                    Voltar ao histórico
                </Link>
            </section>
        );
    }

    return (
        <form
            className={styles.form}
            onSubmit={handleSubmit}
        >
            <section
                className={
                    styles.sourceCard
                }
            >
                <div
                    className={
                        styles.cardHeader
                    }
                >
                    <div
                        className={
                            styles.headerIcon
                        }
                    >
                        <Calculator
                            size={23}
                        />
                    </div>

                    <div>
                        <span>
                            Fonte do documento
                        </span>

                        <h2>
                            Cálculo selecionado
                        </h2>

                        <p>
                            Esta versão ficará
                            vinculada ao laudo de
                            forma permanente.
                        </p>
                    </div>
                </div>

                <div
                    className={
                        styles.sourceGrid
                    }
                >
                    <div>
                        <Calculator
                            size={18}
                        />

                        <span>
                            Cálculo
                        </span>

                        <strong>
                            {calculation?.title ??
                                getTypeLabel(
                                    calculation?.type ??
                                    "",
                                )}
                        </strong>
                    </div>

                    <div>
                        <History
                            size={18}
                        />

                        <span>
                            Versão
                        </span>

                        <strong>
                            {selectedRevision?.version ??
                                "—"}
                        </strong>
                    </div>

                    <div>
                        <Scale size={18} />

                        <span>
                            Motor
                        </span>

                        <strong>
                            {selectedRevision?.engineVersion ??
                                "—"}
                        </strong>
                    </div>

                    <div>
                        <CalendarDays
                            size={18}
                        />

                        <span>
                            Data-base
                        </span>

                        <strong>
                            {formatDate(
                                selectedRevision?.referenceDate ??
                                calculation?.referenceDate ??
                                null,
                            )}
                        </strong>
                    </div>
                </div>

                <div
                    className={
                        styles.relationships
                    }
                >
                    <div>
                        <span>Cliente</span>

                        <strong>
                            {calculation?.client
                                ?.name ??
                                "Não vinculado"}
                        </strong>

                        {calculation?.client
                            ?.documentNumber && (
                                <small>
                                    {
                                        calculation
                                            .client
                                            .documentNumber
                                    }
                                </small>
                            )}
                    </div>

                    <div>
                        <span>Processo</span>

                        <strong>
                            {calculation
                                ?.legalProcess
                                ?.title ??
                                calculation
                                    ?.legalProcess
                                    ?.caseNumber ??
                                "Não vinculado"}
                        </strong>

                        {calculation
                            ?.legalProcess
                            ?.court && (
                                <small>
                                    {
                                        calculation
                                            .legalProcess
                                            .court
                                    }
                                </small>
                            )}
                    </div>
                </div>
            </section>

            <section
                className={
                    styles.formCard
                }
            >
                <div
                    className={
                        styles.cardHeader
                    }
                >
                    <div
                        className={
                            styles.headerIcon
                        }
                    >
                        <FilePlus2
                            size={23}
                        />
                    </div>

                    <div>
                        <span>
                            Primeira revisão
                        </span>

                        <h2>
                            Identificação do laudo
                        </h2>

                        <p>
                            Estes dados poderão ser
                            revisados antes da
                            finalização.
                        </p>
                    </div>
                </div>

                <div
                    className={
                        styles.fields
                    }
                >
                    <label
                        className={
                            styles.fullField
                        }
                    >
                        Título do laudo

                        <input
                            type="text"
                            value={title}
                            onChange={(event) =>
                                setTitle(
                                    event.target
                                        .value,
                                )
                            }
                            required
                            maxLength={250}
                        />
                    </label>

                    <div
                        className={
                            styles.twoColumns
                        }
                    >
                        <label>
                            Número do laudo

                            <input
                                type="text"
                                value={
                                    reportNumber
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setReportNumber(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Ex.: 001/2026"
                                maxLength={100}
                            />
                        </label>

                        <label>
                            Data-base

                            <input
                                type="date"
                                value={
                                    referenceDate
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setReferenceDate(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                            />
                        </label>
                    </div>

                    <label
                        className={
                            styles.fullField
                        }
                    >
                        Objeto e finalidade

                        <textarea
                            value={purpose}
                            onChange={(event) =>
                                setPurpose(
                                    event.target
                                        .value,
                                )
                            }
                            rows={6}
                            maxLength={10000}
                        />
                    </label>

                    <label
                        className={
                            styles.fullField
                        }
                    >
                        Local de emissão

                        <input
                            type="text"
                            value={place}
                            onChange={(event) =>
                                setPlace(
                                    event.target
                                        .value,
                                )
                            }
                            placeholder="Ex.: São Paulo - SP"
                            maxLength={250}
                        />
                    </label>

                    <label
                        className={
                            styles.fullField
                        }
                    >
                        Observações internas

                        <textarea
                            value={notes}
                            onChange={(event) =>
                                setNotes(
                                    event.target
                                        .value,
                                )
                            }
                            rows={4}
                            maxLength={10000}
                            placeholder="Informações internas que não precisam aparecer no texto principal."
                        />
                    </label>
                </div>

                {errorMessage && (
                    <div
                        className={
                            styles.errorMessage
                        }
                    >
                        <CircleAlert
                            size={18}
                        />

                        <span>
                            {errorMessage}
                        </span>
                    </div>
                )}

                <div
                    className={
                        styles.actions
                    }
                >
                    <Link
                        href={
                            calculationId
                                ? `/historico/${encodeURIComponent(
                                    calculationId,
                                )}`
                                : "/historico"
                        }
                        className={
                            styles.cancelButton
                        }
                    >
                        <ArrowLeft size={17} />
                        Cancelar
                    </Link>

                    <button
                        type="submit"
                        className={
                            styles.submitButton
                        }
                        disabled={
                            isSubmitting ||
                            !selectedRevision
                        }
                    >
                        {isSubmitting ? (
                            <Loader2
                                className={
                                    styles.spin
                                }
                                size={18}
                            />
                        ) : (
                            <FilePlus2
                                size={18}
                            />
                        )}

                        {isSubmitting
                            ? "Criando laudo..."
                            : "Criar laudo e editar"}
                    </button>
                </div>
            </section>
        </form>
    );
}