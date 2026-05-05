-- CreateEnum
CREATE TYPE "HrmsRole" AS ENUM ('SUPER_ADMIN', 'HR', 'ADMIN', 'MANAGER', 'EMPLOYEE');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "hrmsRole" "HrmsRole";
