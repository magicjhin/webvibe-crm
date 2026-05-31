-- CreateEnum
CREATE TYPE "ContractKind" AS ENUM ('STAGED', 'ADVANCE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('draft', 'sent', 'signed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('draft', 'sent', 'accepted', 'declined', 'revisions');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('active', 'paused', 'cancelled', 'overdue_payment');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "maintenanceId" TEXT;

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "kind" "ContractKind" NOT NULL DEFAULT 'STAGED',
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'draft',
    "terms" JSONB NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "signTokenHash" TEXT,
    "signTokenExpiresAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signerName" TEXT,
    "signerIp" TEXT,
    "signerUserAgent" TEXT,
    "signatureUrl" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'draft',
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "validUntil" TIMESTAMP(3),
    "scopeIncluded" JSONB NOT NULL,
    "scopeExcluded" JSONB,
    "milestones" JSONB,
    "paymentPlan" JSONB,
    "warranty" TEXT,
    "portfolioLinks" JSONB,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "contractId" TEXT,
    "monthlyAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "includes" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "nextInvoiceAt" TIMESTAMP(3) NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contract_number_key" ON "Contract"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_signTokenHash_key" ON "Contract"("signTokenHash");

-- CreateIndex
CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");

-- CreateIndex
CREATE INDEX "Contract_projectId_idx" ON "Contract"("projectId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_number_key" ON "Proposal"("number");

-- CreateIndex
CREATE INDEX "Proposal_clientId_idx" ON "Proposal"("clientId");

-- CreateIndex
CREATE INDEX "Proposal_projectId_idx" ON "Proposal"("projectId");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Maintenance_contractId_key" ON "Maintenance"("contractId");

-- CreateIndex
CREATE INDEX "Maintenance_status_idx" ON "Maintenance"("status");

-- CreateIndex
CREATE INDEX "Maintenance_nextInvoiceAt_idx" ON "Maintenance"("nextInvoiceAt");

-- CreateIndex
CREATE INDEX "Maintenance_clientId_idx" ON "Maintenance"("clientId");

-- CreateIndex
CREATE INDEX "Maintenance_projectId_idx" ON "Maintenance"("projectId");

-- CreateIndex
CREATE INDEX "Invoice_maintenanceId_idx" ON "Invoice"("maintenanceId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_maintenanceId_periodKey_key" ON "Invoice"("maintenanceId", "periodKey");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "Maintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

