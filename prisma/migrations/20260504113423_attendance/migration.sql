/*
  Warnings:

  - You are about to drop the `Member` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_organizationId_roleId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_userId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_organizationId_fkey";

-- DropTable
DROP TABLE "Member";

-- DropTable
DROP TABLE "Organization";

-- DropTable
DROP TABLE "Role";

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roleId" TEXT,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendanceRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "totalHours" DOUBLE PRECISION,
    "overtimeHours" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ABSENT',
    "enteredByManagerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workHourPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "standardHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "overtimeThreshold" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "lateThresholdMinutes" INTEGER NOT NULL DEFAULT 15,
    "workStartHour" INTEGER NOT NULL DEFAULT 9,
    "workStartMinute" INTEGER NOT NULL DEFAULT 0,
    "halfDayMaxHours" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "absentAfterHour" INTEGER NOT NULL DEFAULT 18,

    CONSTRAINT "workHourPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "member_organizationId_idx" ON "member"("organizationId");

-- CreateIndex
CREATE INDEX "member_userId_idx" ON "member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "member"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "role_organizationId_idx" ON "role"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "role_organizationId_id_key" ON "role"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "role_organizationId_name_key" ON "role"("organizationId", "name");

-- CreateIndex
CREATE INDEX "attendanceRecord_organizationId_idx" ON "attendanceRecord"("organizationId");

-- CreateIndex
CREATE INDEX "attendanceRecord_organizationId_date_idx" ON "attendanceRecord"("organizationId", "date");

-- CreateIndex
CREATE INDEX "attendanceRecord_organizationId_employeeId_idx" ON "attendanceRecord"("organizationId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "attendanceRecord_employeeId_date_key" ON "attendanceRecord"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "workHourPolicy_organizationId_key" ON "workHourPolicy"("organizationId");

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_roleId_fkey" FOREIGN KEY ("organizationId", "roleId") REFERENCES "role"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
