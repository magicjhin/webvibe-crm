-- Импорт существующих (старых) документов: храним ссылку на загруженный PDF
-- в Vercel Blob. Если поле задано — документ считается импортированным,
-- и PDF-роут отдаёт этот файл вместо генерации из шаблона.
ALTER TABLE "Invoice" ADD COLUMN "importedPdfUrl" TEXT;
ALTER TABLE "Contract" ADD COLUMN "importedPdfUrl" TEXT;
