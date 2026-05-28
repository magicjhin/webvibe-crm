-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "companyName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "vatId" TEXT,
    "regNumber" TEXT,
    "address" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "swift" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "signatureUrl" TEXT,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'WV',
    "invoiceCounter" INTEGER NOT NULL DEFAULT 0,
    "invoicePadding" INTEGER NOT NULL DEFAULT 3,
    "contractPrefix" TEXT NOT NULL DEFAULT 'WVS',
    "contractCounter" INTEGER NOT NULL DEFAULT 0,
    "contractPadding" INTEGER NOT NULL DEFAULT 6,
    "proposalPrefix" TEXT NOT NULL DEFAULT 'WVP',
    "proposalCounter" INTEGER NOT NULL DEFAULT 0,
    "proposalPadding" INTEGER NOT NULL DEFAULT 3,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "documentLanguage" TEXT NOT NULL DEFAULT 'lt',
    "pdfFooterNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
