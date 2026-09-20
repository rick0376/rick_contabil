// src/lib/reports/expert-report-docx.ts

import {
    AlignmentType,
    Document,
    Footer,
    Header,
    HeadingLevel,
    PageBreak,
    PageNumber,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
} from "docx";

import {
    type ExpertReportExportSource,
    formatExportDate,
    formatExportDateTime,
    formatExportLineValue,
    getExportCalculationLines,
    getExportLineColumns,
    getProfessionalCrc,
    getProfessionalName,
    getProfessionalTitle,
    getVisibleExportSections,
    splitExportText,
} from "./expert-report-export.service";

function createTextParagraph(
    text: string,
    options?: {
        bold?: boolean;
        size?: number;
        alignment?: typeof AlignmentType[keyof typeof AlignmentType];
        font?: string;
        color?: string;
        after?: number;
    },
) {
    return new Paragraph({
        alignment:
            options?.alignment ??
            AlignmentType.JUSTIFIED,

        spacing: {
            after:
                options?.after ??
                120,

            line: 320,
        },

        children: [
            new TextRun({
                text:
                    text.length > 0
                        ? text
                        : " ",

                bold:
                    options?.bold ??
                    false,

                size:
                    options?.size ??
                    22,

                font:
                    options?.font ??
                    "Arial",

                color:
                    options?.color,
            }),
        ],
    });
}

function createSectionTitle(
    title: string,
) {
    return new Paragraph({
        heading:
            HeadingLevel.HEADING_1,

        spacing: {
            before: 320,
            after: 160,
        },

        children: [
            new TextRun({
                text: title,
                bold: true,
                size: 28,
                font: "Arial",
                color: "172554",
            }),
        ],
    });
}

function createControlTable(
    source: ExpertReportExportSource,
) {
    const calculation =
        source.calculations[0];

    const rows = [
        [
            "Situação",
            source.revision.status,
        ],

        [
            "Revisão do laudo",
            String(
                source.revision.version,
            ),
        ],

        [
            "Modelo",
            source.revision
                .templateVersion,
        ],

        [
            "Versão do cálculo",
            calculation
                ? String(
                    calculation.revision
                        .version,
                )
                : "Não informada",
        ],

        [
            "Motor do cálculo",
            calculation?.revision
                .engineVersion ??
            "Não informado",
        ],

        [
            "Data-base",
            formatExportDate(
                source.revision
                    .referenceDate,
            ),
        ],

        [
            "Criado em",
            formatExportDateTime(
                source.revision
                    .createdAt,
            ),
        ],

        [
            "Hash do laudo",
            source.revision
                .integrityHash ??
            "Não disponível",
        ],
    ];

    return new Table({
        width: {
            size: 100,
            type:
                WidthType.PERCENTAGE,
        },

        rows: rows.map(
            ([label, value]) =>
                new TableRow({
                    cantSplit: true,

                    children: [
                        new TableCell({
                            width: {
                                size: 30,
                                type:
                                    WidthType.PERCENTAGE,
                            },

                            children: [
                                createTextParagraph(
                                    label,
                                    {
                                        bold: true,
                                        size: 18,
                                        alignment:
                                            AlignmentType.LEFT,
                                        after: 0,
                                    },
                                ),
                            ],
                        }),

                        new TableCell({
                            width: {
                                size: 70,
                                type:
                                    WidthType.PERCENTAGE,
                            },

                            children: [
                                createTextParagraph(
                                    value,
                                    {
                                        size: 18,
                                        alignment:
                                            AlignmentType.LEFT,
                                        after: 0,
                                    },
                                ),
                            ],
                        }),
                    ],
                }),
        ),
    });
}

function createCalculationTable(
    source: ExpertReportExportSource,
) {
    const lines =
        getExportCalculationLines(
            source,
        );

    if (lines.length === 0) {
        return null;
    }

    const calculation =
        source.calculations[0];

    const calculationType =
        calculation?.calculation
            .type ?? "";

    const currency =
        calculation?.calculation
            .currency ?? "BRL";

    const columns =
        getExportLineColumns(
            calculationType,
            lines,
        );

    const headerRow =
        new TableRow({
            tableHeader: true,
            cantSplit: true,

            children:
                columns.map(
                    (column) =>
                        new TableCell({
                            children: [
                                new Paragraph({
                                    alignment:
                                        AlignmentType.CENTER,

                                    spacing: {
                                        after: 0,
                                    },

                                    children: [
                                        new TextRun({
                                            text:
                                                column.label,

                                            bold: true,
                                            size: 13,
                                            font:
                                                "Arial",

                                            color:
                                                "312E81",
                                        }),
                                    ],
                                }),
                            ],
                        }),
                ),
        });

    const dataRows =
        lines.map(
            (line) =>
                new TableRow({
                    cantSplit: true,

                    children:
                        columns.map(
                            (
                                column,
                            ) =>
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            alignment:
                                                column.kind ===
                                                    "text"
                                                    ? AlignmentType.LEFT
                                                    : AlignmentType.RIGHT,

                                            spacing:
                                            {
                                                after: 0,
                                            },

                                            children:
                                                [
                                                    new TextRun(
                                                        {
                                                            text: formatExportLineValue(
                                                                column.getValue(
                                                                    line,
                                                                ),
                                                                column.kind,
                                                                currency,
                                                            ),

                                                            size: 12,
                                                            font:
                                                                "Arial",
                                                        },
                                                    ),
                                                ],
                                        }),
                                    ],
                                }),
                        ),
                }),
        );

    return new Table({
        width: {
            size: 100,
            type:
                WidthType.PERCENTAGE,
        },

        rows: [
            headerRow,
            ...dataRows,
        ],
    });
}

export async function buildExpertReportDocx(
    source: ExpertReportExportSource,
) {
    const visibleSections =
        getVisibleExportSections(
            source,
        );

    const bodySections =
        visibleSections.filter(
            (section) =>
                section.type !==
                "COVER",
        );

    const calculation =
        source.calculations[0];

    const children:
        Array<Paragraph | Table> = [];

    const isDraft =
        source.report.status !==
        "FINALIZED" ||
        source.revision.status !==
        "FINALIZED";

    children.push(
        new Paragraph({
            alignment:
                AlignmentType.CENTER,

            spacing: {
                before: 700,
                after: 260,
            },

            children: [
                new TextRun({
                    text:
                        "LAUDO PERICIAL CONTÁBIL",

                    bold: true,
                    size: 32,
                    font: "Arial",
                    color: "312E81",
                }),
            ],
        }),
    );

    if (isDraft) {
        children.push(
            new Paragraph({
                alignment:
                    AlignmentType.CENTER,

                spacing: {
                    after: 360,
                },

                children: [
                    new TextRun({
                        text:
                            source.revision
                                .status ===
                                "IN_REVIEW"
                                ? "EM REVISÃO"
                                : "RASCUNHO",

                        bold: true,
                        size: 28,
                        font: "Arial",
                        color: "B91C1C",
                    }),
                ],
            }),
        );
    }

    children.push(
        new Paragraph({
            alignment:
                AlignmentType.CENTER,

            spacing: {
                before: 600,
                after: 260,
            },

            children: [
                new TextRun({
                    text:
                        source.revision
                            .title,

                    bold: true,
                    size: 38,
                    font: "Arial",
                    color: "111827",
                }),
            ],
        }),
    );

    if (
        source.revision
            .reportNumber
    ) {
        children.push(
            createTextParagraph(
                `Laudo nº ${source.revision.reportNumber}`,
                {
                    bold: true,
                    size: 24,
                    alignment:
                        AlignmentType.CENTER,
                },
            ),
        );
    }

    children.push(
        createTextParagraph(
            `Processo: ${source.legalProcess
                ?.caseNumber ??
            source.legalProcess
                ?.title ??
            "Não vinculado"
            }`,
            {
                size: 22,
                alignment:
                    AlignmentType.CENTER,
            },
        ),

        createTextParagraph(
            `Interessado: ${source.client?.name ??
            "Não informado"
            }`,
            {
                size: 22,
                alignment:
                    AlignmentType.CENTER,
            },
        ),

        createTextParagraph(
            `Cálculo: ${calculation
                ?.calculation
                .title ??
            calculation
                ?.calculation
                .type ??
            "Não informado"
            }`,
            {
                size: 22,
                alignment:
                    AlignmentType.CENTER,
            },
        ),

        createTextParagraph(
            `${source.revision.place ??
            "Local não informado"
            } - ${formatExportDate(
                source.revision
                    .referenceDate,
            )}`,
            {
                size: 22,
                alignment:
                    AlignmentType.CENTER,
            },
        ),

        new Paragraph({
            children: [
                new PageBreak(),
            ],
        }),
    );

    children.push(
        createSectionTitle(
            "Controle documental",
        ),

        createControlTable(source),
    );

    for (const section of bodySections) {
        children.push(
            createSectionTitle(
                section.title,
            ),
        );

        const textLines =
            splitExportText(
                section.plainText,
            );

        for (const line of textLines) {
            children.push(
                createTextParagraph(
                    line,
                    {
                        font:
                            section.type ===
                                "FORMULAS"
                                ? "Courier New"
                                : "Arial",
                    },
                ),
            );
        }

        if (
            section.type ===
            "CALCULATIONS"
        ) {
            const table =
                createCalculationTable(
                    source,
                );

            if (table) {
                children.push(table);
            }
        }

        if (
            section.type ===
            "SIGNATURE"
        ) {
            children.push(
                createTextParagraph(
                    " ",
                    {
                        after: 420,
                    },
                ),

                createTextParagraph(
                    "____________________________________________",
                    {
                        alignment:
                            AlignmentType.CENTER,

                        after: 80,
                    },
                ),

                createTextParagraph(
                    getProfessionalName(
                        source,
                    ),
                    {
                        bold: true,
                        alignment:
                            AlignmentType.CENTER,

                        after: 40,
                    },
                ),

                createTextParagraph(
                    getProfessionalTitle(
                        source,
                    ),
                    {
                        alignment:
                            AlignmentType.CENTER,

                        after: 40,
                    },
                ),

                createTextParagraph(
                    getProfessionalCrc(
                        source,
                    ),
                    {
                        alignment:
                            AlignmentType.CENTER,
                    },
                ),
            );
        }
    }

    children.push(
        createSectionTitle(
            "Integridade e rastreabilidade",
        ),

        createTextParagraph(
            `Este documento foi elaborado a partir da revisão ${calculation?.revision
                .version ??
            "não informada"
            } do cálculo e da revisão ${source.revision.version} do laudo. Alterações posteriores exigem nova revisão.`,
        ),

        createTextParagraph(
            `Hash do laudo: ${source.revision
                .integrityHash ??
            "não disponível"
            }`,
            {
                font: "Courier New",
                size: 16,
            },
        ),
    );

    const document =
        new Document({
            creator:
                getProfessionalName(
                    source,
                ),

            title:
                source.revision
                    .title,

            description:
                "Laudo Pericial Contábil gerado pelo LHP Sistema Contábil.",

            sections: [
                {
                    properties: {
                        page: {
                            margin: {
                                top: 1134,
                                right: 900,
                                bottom: 1134,
                                left: 900,
                            },
                        },
                    },

                    headers: {
                        default:
                            new Header({
                                children: [
                                    new Paragraph({
                                        alignment:
                                            AlignmentType.RIGHT,

                                        children:
                                            [
                                                new TextRun(
                                                    {
                                                        text: source
                                                            .revision
                                                            .title,

                                                        size: 15,
                                                        font:
                                                            "Arial",

                                                        color:
                                                            "64748B",
                                                    },
                                                ),
                                            ],
                                    }),
                                ],
                            }),
                    },

                    footers: {
                        default:
                            new Footer({
                                children: [
                                    new Paragraph({
                                        alignment:
                                            AlignmentType.RIGHT,

                                        children:
                                            [
                                                new TextRun(
                                                    {
                                                        children:
                                                            [
                                                                "Página ",
                                                                PageNumber.CURRENT,
                                                                " de ",
                                                                PageNumber.TOTAL_PAGES,
                                                            ],

                                                        size: 15,
                                                        font:
                                                            "Arial",

                                                        color:
                                                            "64748B",
                                                    },
                                                ),
                                            ],
                                    }),
                                ],
                            }),
                    },

                    children,
                },
            ],
        });

    return Packer.toBuffer(
        document,
    );
}