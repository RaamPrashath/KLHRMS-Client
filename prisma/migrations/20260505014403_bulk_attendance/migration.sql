-- CreateTable
CREATE TABLE "attendanceWorkLog" (
    "id" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendanceWorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentDepartmentId" TEXT,
    "headMemberId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departmentMember" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departmentMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendanceWorkLog_attendanceRecordId_idx" ON "attendanceWorkLog"("attendanceRecordId");

-- CreateIndex
CREATE INDEX "attendanceWorkLog_organizationId_idx" ON "attendanceWorkLog"("organizationId");

-- CreateIndex
CREATE INDEX "attendanceWorkLog_organizationId_employeeId_idx" ON "attendanceWorkLog"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "attendanceWorkLog_organizationId_date_idx" ON "attendanceWorkLog"("organizationId", "date");

-- CreateIndex
CREATE INDEX "department_organizationId_idx" ON "department"("organizationId");

-- CreateIndex
CREATE INDEX "department_organizationId_status_idx" ON "department"("organizationId", "status");

-- CreateIndex
CREATE INDEX "department_parentDepartmentId_idx" ON "department"("parentDepartmentId");

-- CreateIndex
CREATE INDEX "department_headMemberId_idx" ON "department"("headMemberId");

-- CreateIndex
CREATE INDEX "departmentMember_departmentId_idx" ON "departmentMember"("departmentId");

-- CreateIndex
CREATE INDEX "departmentMember_memberId_idx" ON "departmentMember"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "departmentMember_departmentId_memberId_key" ON "departmentMember"("departmentId", "memberId");

-- AddForeignKey
ALTER TABLE "attendanceWorkLog" ADD CONSTRAINT "attendanceWorkLog_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "departmentMember" ADD CONSTRAINT "departmentMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departmentMember" ADD CONSTRAINT "departmentMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
