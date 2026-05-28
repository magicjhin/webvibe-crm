-- CreateEnum
CREATE TYPE "ClientKind" AS ENUM ('individual', 'company');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "LeadUrgency" AS ENUM ('low', 'normal', 'high');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'to_contact', 'discussion', 'awaiting_proposal', 'proposal_sent', 'thinking', 'accepted', 'declined', 'postponed');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('landing', 'website', 'corporate', 'wordpress', 'headless_wp', 'nextjs', 'crm_dashboard', 'booking', 'quiz_funnel', 'maintenance', 'other');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('idea', 'estimating', 'awaiting_advance', 'in_progress', 'waiting_client', 'review', 'revisions', 'ready', 'paid', 'archived');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'waiting_client', 'review', 'done');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "kind" "ClientKind" NOT NULL DEFAULT 'individual',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "vatId" TEXT,
    "regNumber" TEXT,
    "address" TEXT,
    "language" TEXT NOT NULL DEFAULT 'lt',
    "status" "ClientStatus" NOT NULL DEFAULT 'active',
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "contact" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "budget" DECIMAL(12,2),
    "urgency" "LeadUrgency" NOT NULL DEFAULT 'normal',
    "source" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "nextContactAt" TIMESTAMP(3),
    "notes" TEXT,
    "clientId" TEXT,
    "convertedToProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL,
    "stack" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'idea',
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "advance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "startedAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "links" JSONB,
    "stages" JSONB,
    "hasMaintenance" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "priority" "TaskPriority" NOT NULL DEFAULT 'normal',
    "dueAt" TIMESTAMP(3),
    "description" TEXT,
    "checklist" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE INDEX "Client_kind_idx" ON "Client"("kind");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_nextContactAt_idx" ON "Lead"("nextContactAt");

-- CreateIndex
CREATE INDEX "Lead_clientId_idx" ON "Lead"("clientId");

-- CreateIndex
CREATE INDEX "Lead_convertedToProjectId_idx" ON "Lead"("convertedToProjectId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");

-- CreateIndex
CREATE INDEX "Project_deadlineAt_idx" ON "Project"("deadlineAt");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedToProjectId_fkey" FOREIGN KEY ("convertedToProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
