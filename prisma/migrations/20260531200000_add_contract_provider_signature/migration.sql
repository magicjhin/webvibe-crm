-- Подпись исполнителя (моя) на договоре — отдельно от подписи заказчика.
ALTER TABLE "Contract" ADD COLUMN "providerSignedAt" TIMESTAMP(3);
ALTER TABLE "Contract" ADD COLUMN "providerSignerName" TEXT;
ALTER TABLE "Contract" ADD COLUMN "providerSignatureUrl" TEXT;
