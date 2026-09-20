// src/lib/printing/calculation-print.ts

export type PrintOrientation = "portrait" | "landscape";
export type PrintStatusTone = "danger" | "warning" | "success" | "neutral";

export type CalculationPrintRow = {
    label: string;
    value: string;
    highlight?: boolean;
};

export type ProfessionalPrintColumn = {
    key: string;
    label: string;
    align?: "left" | "center" | "right";
};

export type ProfessionalPrintTable = {
    columns: ProfessionalPrintColumn[];
    rows: Array<Record<string, string>>;
    footer?: Record<string, string>;
    compact?: boolean;
};

export type ProfessionalPrintStatus = {
    title: string;
    description?: string;
    badge?: string;
    tone: PrintStatusTone;
    rows?: CalculationPrintRow[];
};

export type ProfessionalPrintSection = {
    title: string;
    description?: string;
    rows?: CalculationPrintRow[];
    columns?: 1 | 2 | 3 | 4;
    formulas?: string[];
    substitutions?: string[];
    note?: string;
    status?: ProfessionalPrintStatus;
    table?: ProfessionalPrintTable;
    pageBreakBefore?: boolean;
};

export type ProfessionalPrintDocument = {
    title: string;
    subtitle?: string;
    documentType?: string;
    orientation?: PrintOrientation;
    metadata?: CalculationPrintRow[];
    sections: ProfessionalPrintSection[];
    footerText?: string;
};

export type CalculationPrintDocument = {
    title: string;
    modeLabel: string;
    primaryLabel: string;
    primaryValue: string;
    inputRows: CalculationPrintRow[];
    resultRows: CalculationPrintRow[];
    formulas: string[];
    substitutions: string[];
    notice: string;
};

export type PrintDocumentResult = {
    ok: boolean;
    error?: string;
};

function escapeHtml(value: string) {
    const replacements: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    };

    return value.replace(/[&<>"']/g, (character) => replacements[character]);
}

function formatIssuedAt() {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date());
}

function renderDataRows(rows: CalculationPrintRow[], columns = 2) {
    const safeColumns = Math.min(4, Math.max(1, columns));
    const cells = rows
        .map(
            (row) => `
                <div class="data-cell${row.highlight ? " data-cell-highlight" : ""}">
                    <span>${escapeHtml(row.label)}</span>
                    <strong>${escapeHtml(row.value)}</strong>
                </div>
            `,
        )
        .join("");

    return `<div class="data-grid data-grid-${safeColumns}">${cells}</div>`;
}

function renderFormulaBlock(title: string, lines: string[]) {
    if (lines.length === 0) {
        return "";
    }

    return `
        <div class="formula-box">
            <h3>${escapeHtml(title)}</h3>
            ${lines.map((line) => `<div class="formula-line">${escapeHtml(line)}</div>`).join("")}
        </div>
    `;
}

function renderStatus(status: ProfessionalPrintStatus) {
    const rows = status.rows?.length
        ? `<div class="status-data">${renderDataRows(status.rows, Math.min(4, status.rows.length))}</div>`
        : "";

    return `
        <div class="status-box status-${status.tone}">
            <div class="status-header">
                <div>
                    <strong>${escapeHtml(status.title)}</strong>
                    ${status.description ? `<p>${escapeHtml(status.description)}</p>` : ""}
                </div>
                ${status.badge ? `<span class="status-badge">${escapeHtml(status.badge)}</span>` : ""}
            </div>
            ${rows}
        </div>
    `;
}

function renderTable(table: ProfessionalPrintTable) {
    const header = table.columns
        .map((column) => `<th class="align-${column.align ?? "left"}">${escapeHtml(column.label)}</th>`)
        .join("");

    const body = table.rows
        .map(
            (row) => `
                <tr>
                    ${table.columns
                    .map(
                        (column) =>
                            `<td class="align-${column.align ?? "left"}">${escapeHtml(row[column.key] ?? "")}</td>`,
                    )
                    .join("")}
                </tr>
            `,
        )
        .join("");

    const footer = table.footer
        ? `
            <tfoot>
                <tr>
                    ${table.columns
            .map(
                (column) =>
                    `<td class="align-${column.align ?? "left"}">${escapeHtml(
                        table.footer?.[column.key] ?? "",
                    )}</td>`,
            )
            .join("")}
                </tr>
            </tfoot>
        `
        : "";

    return `
        <div class="table-wrapper">
            <table class="${table.compact ? "compact-table" : ""}">
                <thead><tr>${header}</tr></thead>
                <tbody>${body}</tbody>
                ${footer}
            </table>
        </div>
    `;
}

function renderSection(section: ProfessionalPrintSection, index: number) {
    const content: string[] = [];

    if (section.rows?.length) {
        content.push(renderDataRows(section.rows, section.columns ?? 2));
    }

    if (section.status) {
        content.push(renderStatus(section.status));
    }

    if (section.formulas?.length || section.substitutions?.length) {
        content.push(`
            <div class="formula-grid">
                ${renderFormulaBlock("Fórmulas", section.formulas ?? [])}
                ${renderFormulaBlock("Substituição dos valores", section.substitutions ?? [])}
            </div>
        `);
    }

    if (section.table) {
        content.push(renderTable(section.table));
    }

    if (section.note) {
        content.push(`<div class="section-note">${escapeHtml(section.note)}</div>`);
    }

    return `
        <section class="document-section${section.pageBreakBefore ? " page-break-before" : ""}">
            <div class="section-heading">
                <h2>${index + 1}. ${escapeHtml(section.title)}</h2>
                ${section.description ? `<p>${escapeHtml(section.description)}</p>` : ""}
            </div>
            ${content.join("")}
        </section>
    `;
}

function buildProfessionalHtml(data: ProfessionalPrintDocument) {
    const issuedAt = formatIssuedAt();
    const orientation = data.orientation ?? "portrait";
    const sections = data.sections.map(renderSection).join("");

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>${escapeHtml(data.title)}</title>

                <style>
                    @page {
                        size: A4 ${orientation};
                        margin: 10mm;
                    }

                    * {
                        box-sizing: border-box;
                    }

                    html,
                    body {
                        width: 100%;
                        min-height: 0;
                        margin: 0;
                        padding: 0;
                        background: #ffffff;
                        color: #172033;
                        font-family: Arial, Helvetica, sans-serif;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    body {
                        padding: 10mm;
                    }

                    .document {
                        width: 100%;
                        margin: 0 auto;
                    }

                    .document-header {
                        padding-bottom: 5mm;
                        border-bottom: 1.5px solid #173665;
                    }

                    .header-meta {
                        display: grid;
                        grid-template-columns: 1fr auto 1fr;
                        align-items: center;
                        gap: 12px;
                        color: #475569;
                        font-size: 9px;
                    }

                    .header-meta span:nth-child(2) {
                        color: #173665;
                        font-weight: 700;
                        text-align: center;
                        text-transform: uppercase;
                    }

                    .header-meta span:last-child {
                        text-align: right;
                    }

                    .document-header h1 {
                        margin: 4mm 0 1.5mm;
                        color: #173665;
                        font-family: Georgia, "Times New Roman", serif;
                        font-size: 23px;
                        line-height: 1.2;
                        text-align: center;
                    }

                    .document-header p {
                        margin: 0;
                        color: #475569;
                        font-size: 10px;
                        line-height: 1.5;
                        text-align: center;
                    }

                    .document-metadata {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        margin-top: 5mm;
                        border: 1px solid #94a3b8;
                    }

                    .metadata-item {
                        display: grid;
                        grid-template-columns: minmax(120px, 0.8fr) minmax(0, 1.2fr);
                        min-height: 11mm;
                        border-bottom: 1px solid #cbd5e1;
                    }

                    .metadata-item:nth-child(odd) {
                        border-right: 1px solid #cbd5e1;
                    }

                    .metadata-item:nth-last-child(-n + 2) {
                        border-bottom: 0;
                    }

                    .metadata-item span,
                    .metadata-item strong {
                        display: flex;
                        align-items: center;
                        padding: 2.5mm 3mm;
                    }

                    .metadata-item span {
                        background: #f1f5f9;
                        color: #334155;
                        font-size: 8px;
                        font-weight: 700;
                        text-transform: uppercase;
                    }

                    .metadata-item strong {
                        color: #0f172a;
                        font-size: 9px;
                    }

                    .document-section {
                        margin-top: 6mm;
                    }

                    .section-heading {
                        margin-bottom: 2.5mm;
                    }

                    .section-heading h2 {
                        margin: 0;
                        color: #173665;
                        font-family: Georgia, "Times New Roman", serif;
                        font-size: 16px;
                        line-height: 1.25;
                    }

                    .section-heading p {
                        margin: 1mm 0 0;
                        color: #64748b;
                        font-size: 8.5px;
                        line-height: 1.5;
                    }

                    .data-grid {
                        display: grid;
                        border-top: 1px solid #94a3b8;
                        border-left: 1px solid #94a3b8;
                    }

                    .data-grid-1 {
                        grid-template-columns: 1fr;
                    }

                    .data-grid-2 {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .data-grid-3 {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }

                    .data-grid-4 {
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                    }

                    .data-cell {
                        min-width: 0;
                        break-inside: avoid;
                        page-break-inside: avoid;
                        min-height: 14mm;
                        padding: 2.5mm 3mm;
                        border-right: 1px solid #94a3b8;
                        border-bottom: 1px solid #94a3b8;
                        background: #ffffff;
                    }

                    .data-cell span,
                    .data-cell strong {
                        display: block;
                    }

                    .data-cell span {
                        margin-bottom: 1.2mm;
                        color: #475569;
                        font-size: 7px;
                        font-weight: 700;
                        letter-spacing: 0.02em;
                        text-transform: uppercase;
                    }

                    .data-cell strong {
                        color: #0f172a;
                        font-size: 10px;
                        line-height: 1.35;
                        overflow-wrap: anywhere;
                    }

                    .data-cell-highlight {
                        border-left: 3px solid #173665;
                        background: #f8fafc;
                    }

                    .formula-grid {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 3mm;
                    }

                    .formula-box {
                        min-width: 0;
                        break-inside: avoid;
                        page-break-inside: avoid;
                        border: 1px solid #94a3b8;
                    }

                    .formula-box h3 {
                        margin: 0;
                        padding: 2.5mm 3mm;
                        border-bottom: 1px solid #cbd5e1;
                        background: #f1f5f9;
                        color: #334155;
                        font-size: 8px;
                        text-transform: uppercase;
                    }

                    .formula-line {
                        padding: 2mm 3mm;
                        border-bottom: 1px dotted #cbd5e1;
                        color: #172033;
                        font-family: "Courier New", monospace;
                        font-size: 8px;
                        line-height: 1.45;
                        overflow-wrap: anywhere;
                    }

                    .formula-line:last-child {
                        border-bottom: 0;
                    }

                    .section-note {
                        margin-top: 3mm;
                        padding: 3mm;
                        border: 1px solid #94a3b8;
                        background: #ffffff;
                        color: #334155;
                        font-size: 8px;
                        line-height: 1.55;
                    }

                    .status-box {
                        break-inside: avoid;
                        page-break-inside: avoid;
                        border: 1px solid #94a3b8;
                        border-left-width: 4px;
                        background: #ffffff;
                    }

                    .status-header {
                        display: flex;
                        align-items: flex-start;
                        justify-content: space-between;
                        gap: 5mm;
                        padding: 3.5mm 4mm;
                    }

                    .status-header strong {
                        display: block;
                        margin-bottom: 1.5mm;
                        color: #0f172a;
                        font-family: Georgia, "Times New Roman", serif;
                        font-size: 13px;
                    }

                    .status-header p {
                        max-width: 170mm;
                        margin: 0;
                        color: #475569;
                        font-size: 8px;
                        line-height: 1.55;
                    }

                    .status-badge {
                        flex: 0 0 auto;
                        padding: 2mm 3mm;
                        border: 1px solid currentColor;
                        border-radius: 2px;
                        font-size: 7px;
                        font-weight: 800;
                        text-transform: uppercase;
                        white-space: nowrap;
                    }

                    .status-data {
                        border-top: 1px dotted #94a3b8;
                    }

                    .status-data .data-grid {
                        border: 0;
                    }

                    .status-data .data-cell {
                        min-height: 12mm;
                        border-bottom: 0;
                        border-color: #cbd5e1;
                    }

                    .status-danger {
                        border-color: #dc2626;
                        color: #b91c1c;
                    }

                    .status-warning {
                        border-color: #d97706;
                        color: #b45309;
                    }

                    .status-success {
                        border-color: #15803d;
                        color: #166534;
                    }

                    .status-neutral {
                        border-color: #475569;
                        color: #334155;
                    }

                    .table-wrapper {
                        width: 100%;
                        overflow: visible;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: auto;
                    }

                    thead {
                        display: table-header-group;
                    }

                    tfoot {
                        display: table-footer-group;
                    }

                    tr {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }

                    th,
                    td {
                        padding: 2mm 2.2mm;
                        border: 1px solid #94a3b8;
                        color: #172033;
                        font-size: 7.5px;
                        line-height: 1.3;
                        vertical-align: middle;
                    }

                    th {
                        background: #e2e8f0;
                        color: #173665;
                        font-weight: 800;
                        text-transform: uppercase;
                    }

                    tbody tr:nth-child(even) {
                        background: #f8fafc;
                    }

                    tfoot td {
                        background: #e2e8f0;
                        color: #0f172a;
                        font-weight: 800;
                    }

                    .compact-table th,
                    .compact-table td {
                        padding: 1.3mm 1.5mm;
                        font-size: 6.8px;
                    }

                    .align-left {
                        text-align: left;
                    }

                    .align-center {
                        text-align: center;
                    }

                    .align-right {
                        text-align: right;
                    }

                    .page-break-before {
                        break-before: page;
                        page-break-before: always;
                    }

                    .document-footer {
                        display: flex;
                        justify-content: space-between;
                        gap: 10mm;
                        margin-top: 7mm;
                        padding-top: 3mm;
                        border-top: 1px solid #64748b;
                        color: #64748b;
                        font-size: 7px;
                    }

                    @media print {
                        html,
                        body {
                            width: 100%;
                            min-height: 0 !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            overflow: visible !important;
                        }

                        body {
                            zoom: ${orientation === "portrait" ? "0.94" : "0.92"};
                        }

                        .document {
                            width: 100%;
                            margin: 0;
                        }
                    }
                </style>
            </head>

            <body>
                <main class="document">
                    <header class="document-header">
                        <div class="header-meta">
                            <span>${escapeHtml(issuedAt)}</span>
                            <span>${escapeHtml(data.documentType ?? "Memória técnica")}</span>
                            <span>LHP Sistema Contábil</span>
                        </div>
                        <h1>${escapeHtml(data.title)}</h1>
                        ${data.subtitle ? `<p>${escapeHtml(data.subtitle)}</p>` : ""}
                    </header>

                    ${data.metadata?.length
            ? `<section class="document-metadata">${data.metadata
                .map(
                    (item) => `
                                        <div class="metadata-item">
                                            <span>${escapeHtml(item.label)}</span>
                                            <strong>${escapeHtml(item.value)}</strong>
                                        </div>
                                    `,
                )
                .join("")}</section>`
            : ""
        }

                    ${sections}

                    <footer class="document-footer">
                        <span>LHP Sistema Contábil</span>
                        <span>${escapeHtml(data.footerText ?? "Documento gerado automaticamente")}</span>
                    </footer>
                </main>
            </body>
        </html>
    `;
}

export function printProfessionalDocument(data: ProfessionalPrintDocument): PrintDocumentResult {
    const printWindow = window.open("", "_blank", "width=1280,height=900");

    if (!printWindow) {
        return {
            ok: false,
            error:
                "O navegador bloqueou a janela de impressão. Autorize pop-ups para este endereço e tente novamente.",
        };
    }

    printWindow.document.open();
    printWindow.document.write(buildProfessionalHtml(data));
    printWindow.document.close();

    const startPrinting = () => {
        window.setTimeout(() => {
            printWindow.focus();
            void printWindow.document.body.offsetHeight;
            printWindow.print();
        }, 350);
    };

    if (printWindow.document.readyState === "complete") {
        startPrinting();
    } else {
        printWindow.addEventListener("load", startPrinting, { once: true });
    }

    printWindow.onafterprint = () => printWindow.close();

    return { ok: true };
}

export function printCalculationDocument(data: CalculationPrintDocument): PrintDocumentResult {
    return printProfessionalDocument({
        title: data.title,
        subtitle: "Memória de cálculo financeiro",
        documentType: data.modeLabel,
        orientation: "portrait",
        metadata: [
            { label: "Modalidade", value: data.modeLabel },
            { label: "Data da emissão", value: formatIssuedAt() },
        ],
        sections: [
            {
                title: "Dados utilizados",
                rows: data.inputRows,
                columns: 2,
            },
            {
                title: "Resultado do cálculo",
                rows: [
                    ...data.resultRows,
                    {
                        label: data.primaryLabel,
                        value: data.primaryValue,
                        highlight: true,
                    },
                ],
                columns: 2,
            },
            {
                title: "Memória matemática",
                formulas: data.formulas,
                substitutions: data.substitutions,
            },
            {
                title: "Observações",
                note: data.notice,
            },
        ],
        footerText: "Documento gerado automaticamente pela calculadora",
    });
}