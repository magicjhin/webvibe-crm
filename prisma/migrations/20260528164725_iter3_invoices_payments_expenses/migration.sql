-- CreateEnum
CREATE TYPE "InvoiceKind" AS ENUM ('advance', 'final', 'full', 'maintenance');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'sent', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('advance', 'final', 'full', 'maintenance', 'other');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('ai_tools', 'hosting', 'domains', 'software', 'hardware', 'ads', 'transport', 'other');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "representative" TEXT,
ADD COLUMN     "technicalContactName" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "bankNote" TEXT,
ADD COLUMN     "defaultPaymentDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "personalCode" TEXT;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "kind" "InvoiceKind" NOT NULL DEFAULT 'advance',
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "periodKey" TEXT,
    "notes" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "qty" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "invoiceId" TEXT,
    "kind" "PaymentKind" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "vendor" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_projectId_idx" ON "Invoice"("projectId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_dueAt_idx" ON "Invoice"("dueAt");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_clientId_idx" ON "Payment"("clientId");

-- CreateIndex
CREATE INDEX "Payment_projectId_idx" ON "Payment"("projectId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE INDEX "Expense_occurredAt_idx" ON "Expense"("occurredAt");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
