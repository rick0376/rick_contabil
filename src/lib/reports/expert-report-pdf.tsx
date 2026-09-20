// src/lib/reports/expert-report-pdf.tsx

import {
    Document as PdfDocument,
    Page,
    StyleSheet,
    Text,
    View,
    renderToBuffer,
} from "@react-pdf/renderer";

import {
    type ExpertReportExportSection,
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
} from "./expert-report-export.service";

const styles = StyleSheet.create({
    page: {
        paddingTop: 56,
        paddingRight: 42,
        paddingBottom: 52,
        paddingLeft: 42,
        fontFamily: "Helvetica",
        fontSize: 10,
        color: "#1f2937",
        lineHeight: 1.55,
    },

    landscapePage: {
        paddingTop: 48,
        paddingRight: 28,
        paddingBottom: 44,
        paddingLeft: 28,
        fontFamily: "Helvetica",
        fontSize: 8,
        color: "#1f2937",
    },

    coverPage: {
        padding: 54,
        fontFamily: "Helvetica",
        color: "#111827",
    },

    header: {
        position: "absolute",
        top: 20,
        right: 42,
        left: 42,
        flexDirection: "row",
        justifyContent:
            "space-between",
        paddingBottom: 6,
        borderBottomWidth: 0.7,
        borderBottomColor:
            "#cbd5e1",
        fontSize: 7,
        color: "#64748b",
    },

    landscapeHeader: {
        position: "absolute",
        top: 17,
        right: 28,
        left: 28,
        flexDirection: "row",
        justifyContent:
            "space-between",
        paddingBottom: 5,
        borderBottomWidth: 0.7,
        borderBottomColor:
            "#cbd5e1",
        fontSize: 6.5,
        color: "#64748b",
    },

    footer: {
        position: "absolute",
        right: 42,
        bottom: 18,
        left: 42,
        flexDirection: "row",
        justifyContent:
            "space-between",
        paddingTop: 6,
        borderTopWidth: 0.7,
        borderTopColor:
            "#cbd5e1",
        fontSize: 6.5,
        color: "#64748b",
    },

    landscapeFooter: {
        position: "absolute",
        right: 28,
        bottom: 15,
        left: 28,
        flexDirection: "row",
        justifyContent:
            "space-between",
        paddingTop: 5,
        borderTopWidth: 0.7,
        borderTopColor:
            "#cbd5e1",
        fontSize: 6,
        color: "#64748b",
    },

    watermark: {
        position: "absolute",
        top: "45%",
        left: "18%",
        fontSize: 54,
        fontWeight: 700,
        color: "#e2e8f0",
        transform:
            "rotate(-32deg)",
        letterSpacing: 5,
    },

    coverBrand: {
        paddingBottom: 14,
        borderBottomWidth: 2,
        borderBottomColor:
            "#312e81",
        textAlign: "center",
        fontSize: 13,
        fontWeight: 700,
        color: "#312e81",
        letterSpacing: 2,
    },

    coverCenter: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 30,
    },

    coverLabel: {
        marginBottom: 12,
        fontSize: 9,
        fontWeight: 700,
        color: "#7c3aed",
        letterSpacing: 1.5,
        textTransform: "uppercase",
    },

    coverTitle: {
        maxWidth: 480,
        textAlign: "center",
        fontSize: 25,
        fontWeight: 700,
        lineHeight: 1.3,
    },

    draftLabel: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: 700,
        color: "#b91c1c",
        letterSpacing: 2,
    },

    reportNumber: {
        marginTop: 14,
        fontSize: 13,
        fontWeight: 700,
        color: "#374151",
    },

    coverGrid: {
        width: "100%",
        marginTop: 34,
        flexDirection: "row",
        flexWrap: "wrap",
    },

    coverField: {
        width: "50%",
        padding: 9,
        borderWidth: 0.7,
        borderColor: "#d1d5db",
        backgroundColor:
            "#f8fafc",
    },

    label: {
        marginBottom: 4,
        fontSize: 7,
        fontWeight: 700,
        color: "#64748b",
        textTransform: "uppercase",
    },

    value: {
        fontSize: 9,
        fontWeight: 700,
        color: "#111827",
    },

    coverBottom: {
        paddingTop: 13,
        borderTopWidth: 0.7,
        borderTopColor:
            "#9ca3af",
        textAlign: "center",
        fontSize: 10,
    },

    documentControl: {
        marginBottom: 20,
        padding: 12,
        borderWidth: 0.8,
        borderColor: "#c4b5fd",
        backgroundColor:
            "#faf5ff",
    },

    controlTitle: {
        marginBottom: 10,
        fontSize: 15,
        fontWeight: 700,
        color: "#312e81",
    },

    controlRow: {
        flexDirection: "row",
    },

    controlCell: {
        width: "50%",
        padding: 7,
        borderWidth: 0.5,
        borderColor: "#ddd6fe",
        backgroundColor:
            "#ffffff",
    },

    hashBox: {
        marginTop: 7,
        padding: 7,
        borderWidth: 0.5,
        borderColor: "#ddd6fe",
        backgroundColor:
            "#ffffff",
        fontFamily: "Courier",
        fontSize: 6.5,
        color: "#312e81",
    },

    section: {
        marginBottom: 18,
    },

    sectionTitle: {
        marginBottom: 8,
        paddingBottom: 5,
        borderBottomWidth: 0.7,
        borderBottomColor:
            "#9ca3af",
        fontSize: 15,
        fontWeight: 700,
        color: "#111827",
    },

    sectionText: {
        fontSize: 9.5,
        lineHeight: 1.65,
        textAlign: "justify",
    },

    formulasText: {
        fontFamily: "Courier",
        fontSize: 8.5,
        lineHeight: 1.6,
    },

    emptyText: {
        padding: 9,
        borderWidth: 0.6,
        borderColor: "#d1d5db",
        color: "#6b7280",
        textAlign: "center",
        fontSize: 8,
    },

    tableTitle: {
        marginBottom: 10,
        fontSize: 14,
        fontWeight: 700,
        color: "#111827",
    },

    table: {
        width: "100%",
    },

    tableRow: {
        flexDirection: "row",
    },

    tableHeaderCell: {
        paddingVertical: 5,
        paddingHorizontal: 3,
        borderWidth: 0.4,
        borderColor: "#c4b5fd",
        backgroundColor:
            "#ede9fe",
        fontSize: 5.5,
        fontWeight: 700,
        color: "#4c1d95",
        textAlign: "center",
    },

    tableCell: {
        paddingVertical: 4,
        paddingHorizontal: 3,
        borderWidth: 0.35,
        borderColor: "#cbd5e1",
        fontSize: 5.4,
        textAlign: "right",
    },

    tableTextCell: {
        textAlign: "left",
    },

    signature: {
        width: 310,
        marginTop: 50,
        marginHorizontal: "auto",
        paddingTop: 7,
        borderTopWidth: 0.8,
        borderTopColor:
            "#374151",
        textAlign: "center",
    },

    signatureName: {
        fontSize: 10,
        fontWeight: 700,
    },

    signatureDetail: {
        marginTop: 3,
        fontSize: 8,
    },

    integrity: {
        marginTop: 18,
        padding: 11,
        borderWidth: 0.7,
        borderColor: "#86efac",
        backgroundColor:
            "#f0fdf4",
    },

    integrityTitle: {
        marginBottom: 5,
        fontSize: 12,
        fontWeight: 700,
        color: "#166534",
    },

    integrityText: {
        fontSize: 8,
        color: "#166534",
    },

    integrityHash: {
        marginTop: 6,
        fontFamily: "Courier",
        fontSize: 6.3,
        color: "#14532d",
    },
});

function PdfPageChrome({
    source,
    landscape = false,
}: {
    source: ExpertReportExportSource;
    landscape?: boolean;
}) {
    const isDraft =
        source.report.status !==
        "FINALIZED" ||
        source.revision.status !==
        "FINALIZED";

    return (
        <>
            <View
                fixed
                style={
                    landscape
                        ? styles.landscapeHeader
                        : styles.header
                }
            >
                <Text>
                    {
                        source.revision
                            .title
                    }
                </Text>

                <Text>
                    Revisão{" "}
                    {
                        source.revision
                            .version
                    }
                </Text>
            </View>

            <View
                fixed
                style={
                    landscape
                        ? styles.landscapeFooter
                        : styles.footer
                }
            >
                <Text>
                    Hash:{" "}
                    {source.revision.integrityHash
                        ? `${source.revision.integrityHash.slice(
                            0,
                            12,
                        )}...${source.revision.integrityHash.slice(
                            -12,
                        )}`
                        : "não disponível"}
                </Text>

                <Text
                    render={({
                        pageNumber,
                        totalPages,
                    }) =>
                        `Página ${pageNumber} de ${totalPages}`
                    }
                />
            </View>

            {isDraft && (
                <Text
                    fixed
                    style={styles.watermark}
                >
                    {source.revision.status ===
                        "IN_REVIEW"
                        ? "EM REVISÃO"
                        : "RASCUNHO"}
                </Text>
            )}
        </>
    );
}

function PdfSection({
    section,
    source,
}: {
    section:
    ExpertReportExportSection;
    source: ExpertReportExportSource;
}) {
    return (
        <View
            style={styles.section}
            wrap
        >
            <Text
                style={
                    styles.sectionTitle
                }
            >
                {section.title}
            </Text>

            <Text
                style={
                    section.type ===
                        "FORMULAS"
                        ? styles.formulasText
                        : section.plainText
                            ?.trim()
                            ? styles.sectionText
                            : styles.emptyText
                }
            >
                {section.plainText?.trim() ||
                    "Nenhum conteúdo informado nesta seção."}
            </Text>

            {section.type ===
                "SIGNATURE" && (
                    <View
                        style={
                            styles.signature
                        }
                    >
                        <Text
                            style={
                                styles.signatureName
                            }
                        >
                            {getProfessionalName(
                                source,
                            )}
                        </Text>

                        <Text
                            style={
                                styles.signatureDetail
                            }
                        >
                            {getProfessionalTitle(
                                source,
                            )}
                        </Text>

                        <Text
                            style={
                                styles.signatureDetail
                            }
                        >
                            {getProfessionalCrc(
                                source,
                            )}
                        </Text>
                    </View>
                )}
        </View>
    );
}

function PdfCalculationTable({
    source,
}: {
    source: ExpertReportExportSource;
}) {
    const lines =
        getExportCalculationLines(
            source,
        );

    const calculation =
        source.calculations[0];

    const columns =
        getExportLineColumns(
            calculation?.calculation
                .type ?? "",
            lines,
        );

    const currency =
        calculation?.calculation
            .currency ?? "BRL";

    if (lines.length === 0) {
        return (
            <Text style={styles.emptyText}>
                Nenhuma linha detalhada foi
                registrada para esta
                revisão.
            </Text>
        );
    }

    return (
        <View style={styles.table}>
            <View
                style={styles.tableRow}
                wrap={false}
            >
                {columns.map(
                    (column) => (
                        <Text
                            key={
                                column.id
                            }
                            style={[
                                styles.tableHeaderCell,

                                {
                                    flex:
                                        column.id ===
                                            "label"
                                            ? 1.8
                                            : 1,
                                },
                            ]}
                        >
                            {column.label}
                        </Text>
                    ),
                )}
            </View>

            {lines.map(
                (line, lineIndex) => (
                    <View
                        key={`line-${lineIndex}`}
                        style={
                            styles.tableRow
                        }
                        wrap={false}
                    >
                        {columns.map(
                            (
                                column,
                            ) => (
                                <Text
                                    key={
                                        column.id
                                    }
                                    style={[
                                        styles.tableCell,

                                        column.kind ===
                                            "text"
                                            ? styles.tableTextCell
                                            : {},

                                        {
                                            flex:
                                                column.id ===
                                                    "label"
                                                    ? 1.8
                                                    : 1,
                                        },
                                    ]}
                                >
                                    {formatExportLineValue(
                                        column.getValue(
                                            line,
                                        ),
                                        column.kind,
                                        currency,
                                    )}
                                </Text>
                            ),
                        )}
                    </View>
                ),
            )}
        </View>
    );
}

function ExpertReportPdfDocument({
    source,
}: {
    source: ExpertReportExportSource;
}) {
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

    const calculationSectionIndex =
        bodySections.findIndex(
            (section) =>
                section.type ===
                "CALCULATIONS",
        );

    const sectionsBeforeCalculation =
        calculationSectionIndex >= 0
            ? bodySections.slice(
                0,
                calculationSectionIndex,
            )
            : bodySections;

    const calculationSection =
        calculationSectionIndex >= 0
            ? bodySections[
            calculationSectionIndex
            ]
            : null;

    const sectionsAfterCalculation =
        calculationSectionIndex >= 0
            ? bodySections.slice(
                calculationSectionIndex +
                1,
            )
            : [];

    const calculation =
        source.calculations[0];

    const isDraft =
        source.report.status !==
        "FINALIZED" ||
        source.revision.status !==
        "FINALIZED";

    return (
        <PdfDocument
            title={
                source.revision.title
            }
            author={getProfessionalName(
                source,
            )}
            subject="Laudo Pericial Contábil"
            creator="LHP Sistema Contábil"
        >
            <Page
                size="A4"
                style={styles.coverPage}
                wrap={false}
            >
                {isDraft && (
                    <Text
                        style={
                            styles.watermark
                        }
                    >
                        {source.revision
                            .status ===
                            "IN_REVIEW"
                            ? "EM REVISÃO"
                            : "RASCUNHO"}
                    </Text>
                )}

                <Text
                    style={
                        styles.coverBrand
                    }
                >
                    LAUDO PERICIAL CONTÁBIL
                </Text>

                <View
                    style={
                        styles.coverCenter
                    }
                >
                    <Text
                        style={
                            styles.coverLabel
                        }
                    >
                        Documento técnico
                    </Text>

                    <Text
                        style={
                            styles.coverTitle
                        }
                    >
                        {
                            source.revision
                                .title
                        }
                    </Text>

                    {isDraft && (
                        <Text
                            style={
                                styles.draftLabel
                            }
                        >
                            {source.revision
                                .status ===
                                "IN_REVIEW"
                                ? "EM REVISÃO"
                                : "RASCUNHO"}
                        </Text>
                    )}

                    {source.revision
                        .reportNumber && (
                            <Text
                                style={
                                    styles.reportNumber
                                }
                            >
                                Laudo nº{" "}
                                {
                                    source
                                        .revision
                                        .reportNumber
                                }
                            </Text>
                        )}

                    <View
                        style={
                            styles.coverGrid
                        }
                    >
                        <View
                            style={
                                styles.coverField
                            }
                        >
                            <Text
                                style={
                                    styles.label
                                }
                            >
                                Processo
                            </Text>

                            <Text
                                style={
                                    styles.value
                                }
                            >
                                {source
                                    .legalProcess
                                    ?.caseNumber ??
                                    source
                                        .legalProcess
                                        ?.title ??
                                    "Não vinculado"}
                            </Text>
                        </View>

                        <View
                            style={
                                styles.coverField
                            }
                        >
                            <Text
                                style={
                                    styles.label
                                }
                            >
                                Interessado
                            </Text>

                            <Text
                                style={
                                    styles.value
                                }
                            >
                                {source
                                    .client
                                    ?.name ??
                                    "Não informado"}
                            </Text>
                        </View>

                        <View
                            style={
                                styles.coverField
                            }
                        >
                            <Text
                                style={
                                    styles.label
                                }
                            >
                                Cálculo
                            </Text>

                            <Text
                                style={
                                    styles.value
                                }
                            >
                                {calculation
                                    ?.calculation
                                    .title ??
                                    calculation
                                        ?.calculation
                                        .type ??
                                    "Não informado"}
                            </Text>
                        </View>

                        <View
                            style={
                                styles.coverField
                            }
                        >
                            <Text
                                style={
                                    styles.label
                                }
                            >
                                Versão do cálculo
                            </Text>

                            <Text
                                style={
                                    styles.value
                                }
                            >
                                {calculation
                                    ?.revision
                                    .version ??
                                    "—"}
                            </Text>
                        </View>
                    </View>
                </View>

                <View
                    style={
                        styles.coverBottom
                    }
                >
                    <Text>
                        {source.revision
                            .place ??
                            "Local não informado"}
                    </Text>

                    <Text>
                        {formatExportDate(
                            source.revision
                                .referenceDate,
                        )}
                    </Text>
                </View>
            </Page>

            <Page
                size="A4"
                style={styles.page}
                wrap
            >
                <PdfPageChrome
                    source={source}
                />

                <View
                    style={
                        styles.documentControl
                    }
                >
                    <Text
                        style={
                            styles.controlTitle
                        }
                    >
                        Controle documental
                    </Text>

                    <View
                        style={
                            styles.controlRow
                        }
                    >
                        <View
                            style={
                                styles.controlCell
                            }
                        >
                            <Text
                                style={
                                    styles.label
                                }
                            >
                                Situação
                            </Text>

                            <Text>
                                {
                                    source
                                        .revision
                                        .status
                                }
                            </Text>
                        </View>

                        <View
                            style={
                                styles.controlCell
                            }
                        >
                            <Text
                                style={
                                    styles.label
                                }
                            >
                                Revisão do laudo
                            </Text>

                            <Text>
                                {
                                    source
                                        .revision
                                        .version
                                }
                            </Text>
                        </View>
                    </View>

                    <View
                        style={
                            styles.controlRow
                        }
                    >
                        <View
                            style={
                                styles.controlCell
                            }
                        >
                            <Text
                                style={
                                    styles.label
                                }
                            >
                                Modelo
                            </Text>

                            <Text>
                                {
                                    source
                                        .revision
                                        .templateVersion
                                }
                            </Text>
                        </View>

                        <View
                            style={
                                styles.controlCell
                            }
                        >
                            <Text
                                style={
                                    styles.label
                                }
                            >
                                Motor do cálculo
                            </Text>

                            <Text>
                                {calculation
                                    ?.revision
                                    .engineVersion ??
                                    "Não informado"}
                            </Text>
                        </View>
                    </View>

                    <View
                        style={
                            styles.controlRow
                        }
                    >
                        <View
                            style={
                                styles.controlCell
                            }
                        >
                            <Text
                                style={
                                    styles.label
                                }
                            >
                                Criado em
                            </Text>

                            <Text>
                                {formatExportDateTime(
                                    source
                                        .revision
                                        .createdAt,
                                )}
                            </Text>
                        </View>

                        <View
                            style={
                                styles.controlCell
                            }
                        >
                            <Text
                                style={
                                    styles.label
                                }
                            >
                                Data-base
                            </Text>

                            <Text>
                                {formatExportDate(
                                    source
                                        .revision
                                        .referenceDate,
                                )}
                            </Text>
                        </View>
                    </View>

                    <Text
                        style={
                            styles.hashBox
                        }
                    >
                        Hash do laudo:{" "}
                        {source.revision
                            .integrityHash ??
                            "não disponível"}
                    </Text>
                </View>

                {sectionsBeforeCalculation.map(
                    (section) => (
                        <PdfSection
                            key={
                                section.id
                            }
                            section={
                                section
                            }
                            source={
                                source
                            }
                        />
                    ),
                )}

                {!calculationSection && (
                    <View
                        style={
                            styles.integrity
                        }
                    >
                        <Text
                            style={
                                styles.integrityTitle
                            }
                        >
                            Integridade e
                            rastreabilidade
                        </Text>

                        <Text
                            style={
                                styles.integrityText
                            }
                        >
                            Este documento foi
                            elaborado a partir da
                            revisão{" "}
                            {calculation
                                ?.revision
                                .version ??
                                "não informada"}{" "}
                            do cálculo e da
                            revisão{" "}
                            {
                                source
                                    .revision
                                    .version
                            }{" "}
                            do laudo.
                        </Text>

                        <Text
                            style={
                                styles.integrityHash
                            }
                        >
                            Hash:{" "}
                            {source.revision
                                .integrityHash ??
                                "não disponível"}
                        </Text>
                    </View>
                )}
            </Page>

            {calculationSection && (
                <Page
                    size="A4"
                    orientation="landscape"
                    style={
                        styles.landscapePage
                    }
                    wrap
                >
                    <PdfPageChrome
                        source={source}
                        landscape
                    />

                    <Text
                        style={
                            styles.tableTitle
                        }
                    >
                        {
                            calculationSection.title
                        }
                    </Text>

                    {calculationSection
                        .plainText && (
                            <Text
                                style={{
                                    marginBottom: 10,
                                    fontSize: 7,
                                }}
                            >
                                {
                                    calculationSection.plainText
                                }
                            </Text>
                        )}

                    <PdfCalculationTable
                        source={source}
                    />
                </Page>
            )}

            {sectionsAfterCalculation.length >
                0 && (
                    <Page
                        size="A4"
                        style={
                            styles.page
                        }
                        wrap
                    >
                        <PdfPageChrome
                            source={
                                source
                            }
                        />

                        {sectionsAfterCalculation.map(
                            (
                                section,
                            ) => (
                                <PdfSection
                                    key={
                                        section.id
                                    }
                                    section={
                                        section
                                    }
                                    source={
                                        source
                                    }
                                />
                            ),
                        )}

                        <View
                            style={
                                styles.integrity
                            }
                        >
                            <Text
                                style={
                                    styles.integrityTitle
                                }
                            >
                                Integridade e
                                rastreabilidade
                            </Text>

                            <Text
                                style={
                                    styles.integrityText
                                }
                            >
                                Este documento foi
                                elaborado a partir da
                                revisão{" "}
                                {calculation
                                    ?.revision
                                    .version ??
                                    "não informada"}{" "}
                                do cálculo e da
                                revisão{" "}
                                {
                                    source
                                        .revision
                                        .version
                                }{" "}
                                do laudo. Alterações
                                posteriores exigem
                                nova revisão.
                            </Text>

                            <Text
                                style={
                                    styles.integrityHash
                                }
                            >
                                Hash:{" "}
                                {source.revision
                                    .integrityHash ??
                                    "não disponível"}
                            </Text>
                        </View>
                    </Page>
                )}
        </PdfDocument>
    );
}

export async function buildExpertReportPdf(
    source: ExpertReportExportSource,
) {
    return renderToBuffer(
        <ExpertReportPdfDocument
            source={source}
        />,
    );
}