-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "mustChangePin" BOOLEAN NOT NULL DEFAULT true;

-- Alumnos que ya tienen un PIN distinto al default del taller: asumimos que ya lo personalizaron
-- en algún momento y no hace falta forzarlos a cambiarlo de nuevo.
UPDATE "Student" s
SET "mustChangePin" = false
FROM "Config" c
WHERE c.id = 1 AND s.pin <> c."defaultStudentPin";
