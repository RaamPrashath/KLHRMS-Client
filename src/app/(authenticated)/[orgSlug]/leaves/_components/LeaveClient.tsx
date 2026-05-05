"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaveRequestsTable } from "./LeaveRequestsTable";
import { LeaveBalanceCards } from "./LeaveBalanceCards";
import { LeaveBalanceManager } from "./LeaveBalanceManager";
import { LeaveCalendarView } from "./LeaveCalendarView";
import { LeaveRequestForm } from "./LeaveRequestForm";
import { LeaveTypeManager } from "./LeaveTypeManager";
import { HolidayManager } from "./HolidayManager";
import { HrmsRole } from "@/lib/hrms-roles";
import { CalendarDays, LayoutList, BarChart3, Settings2, Palmtree, Wallet } from "lucide-react";

export interface LeaveClientProps {
  orgSlug: string;
  orgId: string;
  role: HrmsRole | null;
  canManageTypes: boolean;
  canApprove: boolean;
  canManageHolidays: boolean;
  canManageBalances: boolean;
}

export function LeaveClient({
  orgSlug,
  orgId,
  role,
  canManageTypes,
  canApprove,
  canManageHolidays,
  canManageBalances,
}: LeaveClientProps) {
  const [activeTab, setActiveTab] = useState("requests");

  const tabs = [
    { value: "requests", label: "Requests", icon: LayoutList },
    { value: "balances", label: "My Balance", icon: BarChart3 },
    ...(canManageBalances
      ? [{ value: "manage-balances", label: "Manage Balances", icon: Wallet }]
      : []),
    { value: "calendar", label: "Calendar", icon: CalendarDays },
    ...(canManageTypes ? [{ value: "types", label: "Leave Types", icon: Settings2 }] : []),
    ...(canManageHolidays ? [{ value: "holidays", label: "Holidays", icon: Palmtree }] : []),
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col gap-0">
      {/* ── Top bar: tabs left, action right ── */}
      <div className="flex items-center justify-between border-b bg-background sticky top-0 z-10 px-0">
        <TabsList className="h-11 rounded-none bg-transparent p-0 gap-0 flex items-end">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="
                  relative h-11 rounded-none border-b-2 border-transparent
                  px-4 pb-0 pt-0
                  text-sm font-medium text-muted-foreground
                  transition-all duration-150
                  hover:text-foreground
                  data-[state=active]:border-foreground
                  data-[state=active]:text-foreground
                  data-[state=active]:shadow-none
                  data-[state=active]:bg-transparent
                  bg-transparent
                  flex items-center gap-2
                "
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <AnimatePresence mode="wait">
          {activeTab === "requests" && (
            <motion.div
              key="new-request-btn"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="pb-1"
            >
              <LeaveRequestForm orgSlug={orgSlug} orgId={orgId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Tab content ── */}
      <div className="pt-6">
        <TabsContent value="requests" className="mt-0">
          <LeaveRequestsTable
            orgSlug={orgSlug}
            orgId={orgId}
            canApprove={canApprove}
          />
        </TabsContent>

        <TabsContent value="balances" className="mt-0">
          <LeaveBalanceCards orgSlug={orgSlug} orgId={orgId} />
        </TabsContent>

        {canManageBalances && (
          <TabsContent value="manage-balances" className="mt-0">
            <LeaveBalanceManager orgSlug={orgSlug} orgId={orgId} />
          </TabsContent>
        )}

        <TabsContent value="calendar" className="mt-0">
          <LeaveCalendarView orgSlug={orgSlug} orgId={orgId} role={role} />
        </TabsContent>

        {canManageTypes && (
          <TabsContent value="types" className="mt-0">
            <LeaveTypeManager orgSlug={orgSlug} orgId={orgId} />
          </TabsContent>
        )}

        {canManageHolidays && (
          <TabsContent value="holidays" className="mt-0">
            <HolidayManager orgSlug={orgSlug} orgId={orgId} />
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
}