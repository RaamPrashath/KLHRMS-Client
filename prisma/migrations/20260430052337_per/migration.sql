/*
  Warnings:

  - You are about to drop the column `role` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `isDefault` on the `Role` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organizationId,id]` on the table `Role` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_roleId_fkey";

-- DropIndex
DROP INDEX "Member_roleId_key";

-- AlterTable
ALTER TABLE "Member" DROP COLUMN "role";

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "isDefault";

-- DropEnum
DROP TYPE "MemberRole";

-- CreateIndex
CREATE UNIQUE INDEX "Role_organizationId_id_key" ON "Role"("organizationId", "id");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_organizationId_roleId_fkey" FOREIGN KEY ("organizationId", "roleId") REFERENCES "Role"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
