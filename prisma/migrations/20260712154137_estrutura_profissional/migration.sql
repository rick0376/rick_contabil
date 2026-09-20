-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'CORRESPONDENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "LegalProcessStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProcessPartyRole" AS ENUM ('PLAINTIFF', 'DEFENDANT', 'INTERESTED_PARTY', 'THIRD_PARTY', 'EXPERT_ASSISTANT', 'OTHER');

-- CreateEnum
CREATE TYPE "CalculationStatus" AS ENUM ('DRAFT', 'CALCULATED', 'FINALIZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CalculationRevisionStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "ExpertReportStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'FINALIZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportSectionType" AS ENUM ('COVER', 'IDENTIFICATION', 'PARTIES', 'EXPERTISE_OBJECT', 'CASE_SUMMARY', 'ANALYZED_DOCUMENTS', 'PREMISES', 'METHODOLOGY', 'INPUT_DATA', 'FORMULAS', 'CALCULATIONS', 'RESULTS', 'QUESTIONS', 'CONCLUSION', 'CLOSING', 'SIGNATURE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "QuestionOrigin" AS ENUM ('COURT', 'PLAINTIFF', 'DEFENDANT', 'EXPERT', 'OTHER');

-- CreateEnum
CREATE TYPE "GeneratedDocumentType" AS ENUM ('CALCULATION_MEMORY', 'EXPERT_REPORT', 'AMORTIZATION_SCHEDULE', 'OTHER');

-- CreateEnum
CREATE TYPE "GeneratedDocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'ARCHIVE', 'RESTORE', 'DELETE', 'FINALIZE', 'GENERATE_DOCUMENT', 'DOWNLOAD_DOCUMENT');

-- DropForeignKey
ALTER TABLE "Calculation" DROP CONSTRAINT "Calculation_userId_fkey";

-- AlterTable
ALTER TABLE "Calculation" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'BRL',
ADD COLUMN     "currentVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "legalProcessId" TEXT,
ADD COLUMN     "referenceDate" TIMESTAMP(3),
ADD COLUMN     "status" "CalculationStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "input" DROP NOT NULL,
ALTER COLUMN "result" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "cpf" TEXT,
    "crcNumber" TEXT,
    "crcState" TEXT,
    "crcCategory" TEXT,
    "businessName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "addressLine" TEXT,
    "addressNumber" TEXT,
    "addressComplement" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "reportClosingText" TEXT,
    "signatureName" TEXT,
    "signatureTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ClientType" NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "documentNumber" TEXT,
    "secondaryDocument" TEXT,
    "stateRegistration" TEXT,
    "birthOrFoundationDate" TIMESTAMP(3),
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAddress" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "AddressType" NOT NULL DEFAULT 'RESIDENTIAL',
    "street" TEXT NOT NULL,
    "number" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Brasil',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalProcess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseNumber" TEXT,
    "title" TEXT,
    "court" TEXT,
    "courtDivision" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "actionClass" TEXT,
    "subject" TEXT,
    "expertiseObject" TEXT,
    "appointmentDate" TIMESTAMP(3),
    "deadlineDate" TIMESTAMP(3),
    "referenceDate" TIMESTAMP(3),
    "status" "LegalProcessStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LegalProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessParty" (
    "id" TEXT NOT NULL,
    "legalProcessId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "role" "ProcessPartyRole" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationRevision" (
    "id" TEXT NOT NULL,
    "calculationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "CalculationRevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "engineVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "referenceDate" TIMESTAMP(3),
    "input" JSONB NOT NULL,
    "premises" JSONB,
    "methodology" JSONB,
    "formulas" JSONB,
    "result" JSONB NOT NULL,
    "summary" JSONB,
    "warnings" JSONB,
    "notes" TEXT,
    "integrityHash" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationLine" (
    "id" TEXT NOT NULL,
    "calculationRevisionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "label" TEXT,
    "competence" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "paymentDate" TIMESTAMP(3),
    "openingBalance" DECIMAL(20,2),
    "correctionRate" DECIMAL(18,10),
    "monetaryCorrection" DECIMAL(20,2),
    "correctedBalance" DECIMAL(20,2),
    "interestRate" DECIMAL(18,10),
    "interest" DECIMAL(20,2),
    "amortization" DECIMAL(20,2),
    "installment" DECIMAL(20,2),
    "insurance" DECIMAL(20,2),
    "fee" DECIMAL(20,2),
    "fine" DECIMAL(20,2),
    "payment" DECIMAL(20,2),
    "closingBalance" DECIMAL(20,2),
    "debit" DECIMAL(20,2),
    "credit" DECIMAL(20,2),
    "dayCount" INTEGER,
    "weightedBalance" DECIMAL(24,2),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legalProcessId" TEXT,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "reportNumber" TEXT,
    "status" "ExpertReportStatus" NOT NULL DEFAULT 'DRAFT',
    "purpose" TEXT,
    "referenceDate" TIMESTAMP(3),
    "place" TEXT,
    "issuedAt" TIMESTAMP(3),
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ExpertReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertReportSection" (
    "id" TEXT NOT NULL,
    "expertReportId" TEXT NOT NULL,
    "type" "ReportSectionType" NOT NULL,
    "title" TEXT NOT NULL,
    "plainText" TEXT,
    "content" JSONB,
    "position" INTEGER NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpertReportSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertReportCalculation" (
    "id" TEXT NOT NULL,
    "expertReportId" TEXT NOT NULL,
    "calculationId" TEXT NOT NULL,
    "calculationRevisionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpertReportCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertQuestion" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "legalProcessId" TEXT NOT NULL,
    "expertReportId" TEXT,
    "origin" "QuestionOrigin" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpertQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legalProcessId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "integrityHash" TEXT,
    "documentDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProcessDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSourceDocument" (
    "id" TEXT NOT NULL,
    "expertReportId" TEXT NOT NULL,
    "processDocumentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportSourceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertReportId" TEXT,
    "calculationRevisionId" TEXT,
    "type" "GeneratedDocumentType" NOT NULL,
    "status" "GeneratedDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER,
    "integrityHash" TEXT,
    "pageCount" INTEGER,
    "templateVersion" TEXT,
    "errorMessage" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "description" TEXT,
    "previousData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE INDEX "Client_createdAt_idx" ON "Client"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Client_userId_documentNumber_key" ON "Client"("userId", "documentNumber");

-- CreateIndex
CREATE INDEX "ClientAddress_clientId_idx" ON "ClientAddress"("clientId");

-- CreateIndex
CREATE INDEX "ClientAddress_isPrimary_idx" ON "ClientAddress"("isPrimary");

-- CreateIndex
CREATE INDEX "LegalProcess_userId_idx" ON "LegalProcess"("userId");

-- CreateIndex
CREATE INDEX "LegalProcess_status_idx" ON "LegalProcess"("status");

-- CreateIndex
CREATE INDEX "LegalProcess_createdAt_idx" ON "LegalProcess"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LegalProcess_userId_caseNumber_key" ON "LegalProcess"("userId", "caseNumber");

-- CreateIndex
CREATE INDEX "ProcessParty_legalProcessId_idx" ON "ProcessParty"("legalProcessId");

-- CreateIndex
CREATE INDEX "ProcessParty_clientId_idx" ON "ProcessParty"("clientId");

-- CreateIndex
CREATE INDEX "ProcessParty_role_idx" ON "ProcessParty"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessParty_legalProcessId_clientId_role_key" ON "ProcessParty"("legalProcessId", "clientId", "role");

-- CreateIndex
CREATE INDEX "CalculationRevision_calculationId_idx" ON "CalculationRevision"("calculationId");

-- CreateIndex
CREATE INDEX "CalculationRevision_createdById_idx" ON "CalculationRevision"("createdById");

-- CreateIndex
CREATE INDEX "CalculationRevision_status_idx" ON "CalculationRevision"("status");

-- CreateIndex
CREATE INDEX "CalculationRevision_createdAt_idx" ON "CalculationRevision"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalculationRevision_calculationId_version_key" ON "CalculationRevision"("calculationId", "version");

-- CreateIndex
CREATE INDEX "CalculationLine_calculationRevisionId_idx" ON "CalculationLine"("calculationRevisionId");

-- CreateIndex
CREATE INDEX "CalculationLine_competence_idx" ON "CalculationLine"("competence");

-- CreateIndex
CREATE INDEX "CalculationLine_dueDate_idx" ON "CalculationLine"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "CalculationLine_calculationRevisionId_sequence_key" ON "CalculationLine"("calculationRevisionId", "sequence");

-- CreateIndex
CREATE INDEX "ExpertReport_userId_idx" ON "ExpertReport"("userId");

-- CreateIndex
CREATE INDEX "ExpertReport_legalProcessId_idx" ON "ExpertReport"("legalProcessId");

-- CreateIndex
CREATE INDEX "ExpertReport_clientId_idx" ON "ExpertReport"("clientId");

-- CreateIndex
CREATE INDEX "ExpertReport_status_idx" ON "ExpertReport"("status");

-- CreateIndex
CREATE INDEX "ExpertReport_createdAt_idx" ON "ExpertReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExpertReport_userId_reportNumber_key" ON "ExpertReport"("userId", "reportNumber");

-- CreateIndex
CREATE INDEX "ExpertReportSection_expertReportId_idx" ON "ExpertReportSection"("expertReportId");

-- CreateIndex
CREATE INDEX "ExpertReportSection_type_idx" ON "ExpertReportSection"("type");

-- CreateIndex
CREATE INDEX "ExpertReportSection_position_idx" ON "ExpertReportSection"("position");

-- CreateIndex
CREATE INDEX "ExpertReportCalculation_expertReportId_idx" ON "ExpertReportCalculation"("expertReportId");

-- CreateIndex
CREATE INDEX "ExpertReportCalculation_calculationId_idx" ON "ExpertReportCalculation"("calculationId");

-- CreateIndex
CREATE INDEX "ExpertReportCalculation_calculationRevisionId_idx" ON "ExpertReportCalculation"("calculationRevisionId");

-- CreateIndex
CREATE INDEX "ExpertReportCalculation_position_idx" ON "ExpertReportCalculation"("position");

-- CreateIndex
CREATE UNIQUE INDEX "ExpertReportCalculation_expertReportId_calculationRevisionI_key" ON "ExpertReportCalculation"("expertReportId", "calculationRevisionId");

-- CreateIndex
CREATE INDEX "ExpertQuestion_createdById_idx" ON "ExpertQuestion"("createdById");

-- CreateIndex
CREATE INDEX "ExpertQuestion_legalProcessId_idx" ON "ExpertQuestion"("legalProcessId");

-- CreateIndex
CREATE INDEX "ExpertQuestion_expertReportId_idx" ON "ExpertQuestion"("expertReportId");

-- CreateIndex
CREATE INDEX "ExpertQuestion_origin_idx" ON "ExpertQuestion"("origin");

-- CreateIndex
CREATE INDEX "ExpertQuestion_sequence_idx" ON "ExpertQuestion"("sequence");

-- CreateIndex
CREATE INDEX "ProcessDocument_userId_idx" ON "ProcessDocument"("userId");

-- CreateIndex
CREATE INDEX "ProcessDocument_legalProcessId_idx" ON "ProcessDocument"("legalProcessId");

-- CreateIndex
CREATE INDEX "ProcessDocument_clientId_idx" ON "ProcessDocument"("clientId");

-- CreateIndex
CREATE INDEX "ProcessDocument_createdAt_idx" ON "ProcessDocument"("createdAt");

-- CreateIndex
CREATE INDEX "ReportSourceDocument_expertReportId_idx" ON "ReportSourceDocument"("expertReportId");

-- CreateIndex
CREATE INDEX "ReportSourceDocument_processDocumentId_idx" ON "ReportSourceDocument"("processDocumentId");

-- CreateIndex
CREATE INDEX "ReportSourceDocument_position_idx" ON "ReportSourceDocument"("position");

-- CreateIndex
CREATE UNIQUE INDEX "ReportSourceDocument_expertReportId_processDocumentId_key" ON "ReportSourceDocument"("expertReportId", "processDocumentId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_userId_idx" ON "GeneratedDocument"("userId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_expertReportId_idx" ON "GeneratedDocument"("expertReportId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_calculationRevisionId_idx" ON "GeneratedDocument"("calculationRevisionId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_type_idx" ON "GeneratedDocument"("type");

-- CreateIndex
CREATE INDEX "GeneratedDocument_status_idx" ON "GeneratedDocument"("status");

-- CreateIndex
CREATE INDEX "GeneratedDocument_createdAt_idx" ON "GeneratedDocument"("createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_userId_idx" ON "AuditEvent"("userId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_action_idx" ON "AuditEvent"("action");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Calculation_clientId_idx" ON "Calculation"("clientId");

-- CreateIndex
CREATE INDEX "Calculation_legalProcessId_idx" ON "Calculation"("legalProcessId");

-- CreateIndex
CREATE INDEX "Calculation_status_idx" ON "Calculation"("status");

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAddress" ADD CONSTRAINT "ClientAddress_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalProcess" ADD CONSTRAINT "LegalProcess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessParty" ADD CONSTRAINT "ProcessParty_legalProcessId_fkey" FOREIGN KEY ("legalProcessId") REFERENCES "LegalProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessParty" ADD CONSTRAINT "ProcessParty_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calculation" ADD CONSTRAINT "Calculation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calculation" ADD CONSTRAINT "Calculation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calculation" ADD CONSTRAINT "Calculation_legalProcessId_fkey" FOREIGN KEY ("legalProcessId") REFERENCES "LegalProcess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationRevision" ADD CONSTRAINT "CalculationRevision_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "Calculation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationRevision" ADD CONSTRAINT "CalculationRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationLine" ADD CONSTRAINT "CalculationLine_calculationRevisionId_fkey" FOREIGN KEY ("calculationRevisionId") REFERENCES "CalculationRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertReport" ADD CONSTRAINT "ExpertReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertReport" ADD CONSTRAINT "ExpertReport_legalProcessId_fkey" FOREIGN KEY ("legalProcessId") REFERENCES "LegalProcess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertReport" ADD CONSTRAINT "ExpertReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertReportSection" ADD CONSTRAINT "ExpertReportSection_expertReportId_fkey" FOREIGN KEY ("expertReportId") REFERENCES "ExpertReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertReportCalculation" ADD CONSTRAINT "ExpertReportCalculation_expertReportId_fkey" FOREIGN KEY ("expertReportId") REFERENCES "ExpertReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertReportCalculation" ADD CONSTRAINT "ExpertReportCalculation_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "Calculation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertReportCalculation" ADD CONSTRAINT "ExpertReportCalculation_calculationRevisionId_fkey" FOREIGN KEY ("calculationRevisionId") REFERENCES "CalculationRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertQuestion" ADD CONSTRAINT "ExpertQuestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertQuestion" ADD CONSTRAINT "ExpertQuestion_legalProcessId_fkey" FOREIGN KEY ("legalProcessId") REFERENCES "LegalProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertQuestion" ADD CONSTRAINT "ExpertQuestion_expertReportId_fkey" FOREIGN KEY ("expertReportId") REFERENCES "ExpertReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessDocument" ADD CONSTRAINT "ProcessDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessDocument" ADD CONSTRAINT "ProcessDocument_legalProcessId_fkey" FOREIGN KEY ("legalProcessId") REFERENCES "LegalProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessDocument" ADD CONSTRAINT "ProcessDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSourceDocument" ADD CONSTRAINT "ReportSourceDocument_expertReportId_fkey" FOREIGN KEY ("expertReportId") REFERENCES "ExpertReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSourceDocument" ADD CONSTRAINT "ReportSourceDocument_processDocumentId_fkey" FOREIGN KEY ("processDocumentId") REFERENCES "ProcessDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_expertReportId_fkey" FOREIGN KEY ("expertReportId") REFERENCES "ExpertReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_calculationRevisionId_fkey" FOREIGN KEY ("calculationRevisionId") REFERENCES "CalculationRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
