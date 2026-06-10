"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Archive,
    BriefcaseBusiness,
    Building2,
    CalendarCheck2,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    Clock3,
    FileText,
    HelpCircle,
    KeyRound,
    Laptop,
    LayoutDashboard,
    ListChecks,
    Search,
    ShieldCheck,
    Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type DocArticle = {
    id: string;
    title: string;
    eyebrow: string;
    summary: string;
    icon: LucideIcon;
    screenshots?: DocScreenshot[];
    when: string[];
    steps: string[];
    fields?: string[];
    after?: string[];
    tips?: string[];
};

type DocGroup = {
    title: string;
    articles: DocArticle[];
};

type DocScreenshot = {
    src: string;
    alt: string;
    caption: string;
};

function shot(fileName: string, alt: string, caption: string): DocScreenshot {
    return {
        src: `/docs/screenshots/${encodeURIComponent(fileName)}`,
        alt,
        caption,
    };
}

const docGroups: DocGroup[] = [
    {
        title: "Getting Started",
        articles: [
            {
                id: "login",
                title: "Log in to HRMS",
                eyebrow: "Account access",
                summary: "Use this when you need to enter the employee portal and reach your workspace.",
                icon: KeyRound,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 181606.png",
                        "Kovan HRMS login screen with Microsoft sign-in and email password fields.",
                        "Login screen: use Microsoft sign-in or email and password, then complete verification if asked.",
                    ),
                ],
                when: [
                    "You have an HRMS account from HR or IT.",
                    "You want to access attendance, leave, assets, jobs, or helpdesk.",
                ],
                steps: [
                    "Open the HRMS link shared by your team.",
                    "Choose Sign in with Microsoft if your company uses Microsoft login, or enter your email and password.",
                    "If an OTP screen appears, open your email, copy the 6 digit code, and enter it in the verification boxes.",
                    "After login, choose the organization you want to work in.",
                ],
                after: [
                    "You land on the organization dashboard.",
                    "The left app sidebar shows only the modules your role can access.",
                ],
                tips: [
                    "If you cannot see a module, ask HR or your manager to check your role permissions.",
                    "If your password was newly created, sign out and sign in again once to refresh your session.",
                ],
            },
            {
                id: "navigation",
                title: "Move around the portal",
                eyebrow: "Navigation",
                summary: "Use the sidebar to open the module you need, then use page tabs or buttons for the task.",
                icon: LayoutDashboard,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 183706.png",
                        "Kovan HRMS dashboard with the left navigation sidebar and quick shortcuts.",
                        "Dashboard: use the left sidebar to switch modules, or use quick shortcuts for common tasks.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 175120.png",
                        "Documentation guide layout with a docs sidebar and article content.",
                        "Docs layout reference: pick a topic on the left, then read the matching steps on the right.",
                    ),
                ],
                when: [
                    "You are already inside an organization.",
                    "You want to move between Attendance, Leave, Employees, Jobs, Assets, Procurement, or Helpdesk.",
                ],
                steps: [
                    "Look at the left sidebar.",
                    "Click the module name you want to open.",
                    "Use tabs, filters, and action buttons inside the page to continue.",
                    "Use the account area at the bottom of the sidebar for profile and sign out actions.",
                ],
                after: [
                    "The selected module opens in the main work area.",
                    "The active sidebar item stays highlighted so you know where you are.",
                ],
                tips: [
                    "Most pages save filters while you stay on that module.",
                    "If a table looks empty, clear the search and date filters first.",
                ],
            },
        ],
    },
    {
        title: "Attendance",
        articles: [
            {
                id: "clock-in",
                title: "Clock in",
                eyebrow: "Daily attendance",
                summary: "Start your workday by recording where you are working and what you plan to work on.",
                icon: Clock3,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 183717.png",
                        "Clock-in confirmation popover showing detected office location and empty project fields.",
                        "Clock-in popover: confirm Office or Remote, then choose project, task, and work summary.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 184717.png",
                        "Clock-in popover filled with project, task, and work summary before submitting.",
                        "Filled clock-in form: once project, task, and summary are ready, click Clock In as Office.",
                    ),
                ],
                when: [
                    "You are starting work for the day.",
                    "You are switching from leave or no attendance into an active work session.",
                ],
                steps: [
                    "Open Attendance from the sidebar.",
                    "Click Clock In.",
                    "A clock-in popover opens.",
                    "Choose your work location, usually Office or Remote.",
                    "If the popover asks for location permission, allow it so the system can capture your current location.",
                    "Select a project and task if your team tracks work against projects.",
                    "Add a short description of what you plan to work on.",
                    "Click Clock In to start the session.",
                ],
                fields: [
                    "Work location: Pick Office or Remote.",
                    "Location: The browser fills latitude and longitude after you allow location access.",
                    "Project: Pick the active project you are working on.",
                    "Task: Pick the project task, if available.",
                    "Description: Write a short work summary.",
                ],
                after: [
                    "Your status changes to clocked in.",
                    "The attendance timer starts.",
                    "Today's attendance row shows as Present while the session is open.",
                ],
                tips: [
                    "If clock in is blocked, check your weekly plan for today's work location.",
                    "If project options are missing, ask your manager to add you to the project.",
                ],
            },
            {
                id: "clock-out",
                title: "Clock out",
                eyebrow: "Daily attendance",
                summary: "End your active session and submit the work summary for the day.",
                icon: CheckCircle2,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 185839.png",
                        "Attendance page showing an active timer and Clock Out button.",
                        "Attendance page while clocked in: use Clock Out at the top-right when the work session is complete.",
                    ),
                ],
                when: [
                    "You are done working for the day.",
                    "You need to close an active clock-in session.",
                ],
                steps: [
                    "Open Attendance.",
                    "Click Clock Out.",
                    "A clock-out popover opens.",
                    "Review the current session details.",
                    "Enter the work summary if it is not already filled.",
                    "Click Clock Out to finish.",
                ],
                fields: [
                    "Work summary: Mention what you completed or worked on.",
                    "Clock-out time: Usually filled automatically by the system.",
                ],
                after: [
                    "Your attendance row is completed with clock-in, clock-out, total hours, and status.",
                    "If the session crossed midnight, the system may split it into separate day rows.",
                    "A work log is created for the session if one does not already exist.",
                ],
                tips: [
                    "The work summary is required before clock out.",
                    "If you forgot to clock out, contact HR or your manager for a correction.",
                ],
            },
            {
                id: "my-attendance",
                title: "Check my attendance",
                eyebrow: "Attendance history",
                summary: "Review your attendance days, statuses, hours, and work summaries.",
                icon: CalendarCheck2,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 185640.png",
                        "Attendance heatmap showing daily hour colors for the month.",
                        "Heatmap: quickly spot full days, shorter days, and dates with no entry.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 185847.png",
                        "Attendance weekly view with days as columns and totals.",
                        "Weekly view: review your own attendance totals for the selected week.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 185906.png",
                        "Attendance monthly view with the month timeline and totals.",
                        "Monthly view: switch to Month to review attendance across a longer period.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 190032.png",
                        "Organization attendance list showing employees and daily clock details.",
                        "Team list view: managers can review employee attendance rows when they have access.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 190129.png",
                        "Attendance weekly table showing multiple employees and weekly totals.",
                        "Team week view: use this to compare employee attendance across the week.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 190151.png",
                        "Attendance monthly table with employees and many date columns.",
                        "Team month view: use horizontal scrolling to review all dates in the month.",
                    ),
                ],
                when: [
                    "You want to confirm your attendance was saved.",
                    "You want to review past days before payroll or reporting.",
                ],
                steps: [
                    "Open Attendance.",
                    "Use the date filters to choose the period you want to check.",
                    "Use the status filter if you only want Present, Half Day, or Absent days.",
                    "Open a row to review detailed work logs when available.",
                ],
                after: [
                    "You can see clock-in time, clock-out time, total hours, overtime, and status.",
                    "Managers may see additional employee filters depending on their role.",
                ],
                tips: [
                    "Clear filters if you cannot find a day.",
                    "Report missing or incorrect entries early so they can be corrected before payroll.",
                ],
            },
            {
                id: "timesheet",
                title: "Fill timesheet or work logs",
                eyebrow: "Work logging",
                summary: "Use work logs when your team needs a detailed project-wise breakdown of time.",
                icon: ClipboardCheck,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 190218.png",
                        "Timesheet calendar showing weekly work log blocks by day and time.",
                        "Timesheet calendar: click a day or plus button to add a work log block.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 190246.png",
                        "Add work log popover with project, task, duration, start, end, and description fields.",
                        "Add work log popover: fill project, task, duration, start and end time, then click Add log.",
                    ),
                ],
                when: [
                    "Your manager asks for project-level timesheet details.",
                    "Your clock session needs more detailed work entries.",
                ],
                steps: [
                    "Open Timesheet or Attendance, depending on your sidebar.",
                    "Choose the date you want to update.",
                    "Click Add Work Log or edit the existing row.",
                    "Select project and task.",
                    "Enter start time, end time, and the work description.",
                    "Save the row.",
                ],
                fields: [
                    "Project: The project you worked on.",
                    "Task: The task within that project.",
                    "Start time and end time: The working period.",
                    "Description: What you worked on during that period.",
                ],
                after: [
                    "The day total updates from the saved work logs.",
                    "The report view can include your project and task details.",
                ],
                tips: [
                    "Use separate rows when you worked on different projects in the same day.",
                    "Keep descriptions short but specific enough for review.",
                ],
            },
            {
                id: "weekly-plan",
                title: "Save weekly or monthly plan",
                eyebrow: "Work planning",
                summary: "Plan whether you will work from office, remote, or another allowed location.",
                icon: ListChecks,
                when: [
                    "Your team asks you to plan work location for the week or month.",
                    "You want your clock-in location to match your plan.",
                ],
                steps: [
                    "Open Weekly Plan.",
                    "Choose Weekly view or Monthly view.",
                    "For each day, select the work location.",
                    "Add a project if the day should be linked to planned work.",
                    "Click Save Week or Save Month.",
                ],
                fields: [
                    "Date: The day being planned.",
                    "Work location: Your planned location.",
                    "Project: Optional planned project.",
                ],
                after: [
                    "The plan is saved for the selected dates.",
                    "The attendance clock-in screen checks the plan for the current day.",
                ],
                tips: [
                    "If your plan changes, update it before clocking in.",
                    "Managers with access can view team weekly plans.",
                ],
            },
        ],
    },
    {
        title: "Leaves",
        articles: [
            {
                id: "apply-leave",
                title: "Apply for leave",
                eyebrow: "Leave request",
                summary: "Submit a leave request for approval and track its status.",
                icon: CalendarCheck2,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 190347.png",
                        "Apply Leave side drawer with empty leave type, dates, days, and reason fields.",
                        "Apply Leave drawer: start by choosing the leave type, start date, and end date.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 190410.png",
                        "Apply Leave drawer filled with casual leave, dates, calculated days, and reason field.",
                        "Filled leave request: review the calculated days and add a reason before submitting.",
                    ),
                ],
                when: [
                    "You need time off for one or more days.",
                    "You want the leave to appear in attendance and team calendars.",
                ],
                steps: [
                    "Open Leaves from the sidebar.",
                    "Click Apply Leave or Create Request.",
                    "A leave form opens.",
                    "Choose the leave type.",
                    "Select From Date and To Date.",
                    "Add the reason or note requested by your organization.",
                    "Review the number of days and click Submit.",
                ],
                fields: [
                    "Leave type: Casual, sick, earned, or any type configured by HR.",
                    "From Date and To Date: The leave period.",
                    "Reason: Short note for the approver.",
                ],
                after: [
                    "The request is saved as Pending.",
                    "Your manager or HR can approve or reject it.",
                    "Once approved, it appears in leave history, calendar, and summaries.",
                ],
                tips: [
                    "If the system says balance is insufficient, choose another leave type or contact HR.",
                    "If dates overlap an existing leave, cancel or adjust the old request first.",
                ],
            },
            {
                id: "leave-status",
                title: "Track leave status",
                eyebrow: "Leave history",
                summary: "Check whether your leave is pending, approved, rejected, or cancelled.",
                icon: FileText,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 190333.png",
                        "Leave Balances page showing allocated, used, and remaining leave by employee.",
                        "Leave balances: check allocated, used, and remaining days before applying.",
                    ),
                ],
                when: [
                    "You already submitted a leave request.",
                    "You want to confirm approval before taking leave.",
                ],
                steps: [
                    "Open Leaves.",
                    "Go to History or Requests.",
                    "Use filters for status, date, or leave type.",
                    "Open the request to view details and approver comments.",
                ],
                after: [
                    "Pending means it still needs approval.",
                    "Approved means your leave is accepted.",
                    "Rejected means the approver declined it.",
                    "Cancelled means the request was withdrawn.",
                ],
                tips: [
                    "Only pending leave can usually be cancelled by you.",
                    "For approved leave changes, contact HR or your manager.",
                ],
            },
            {
                id: "leave-calendar",
                title: "Use the leave calendar",
                eyebrow: "Team visibility",
                summary: "See leave days and holidays in a calendar view.",
                icon: CalendarCheck2,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 190436.png",
                        "Holidays page listing public holidays with date, mandatory, and recurring columns.",
                        "Holidays tab: review company holidays and sync or add holidays when you have access.",
                    ),
                ],
                when: [
                    "You want to check holidays.",
                    "Managers want to review team availability.",
                ],
                steps: [
                    "Open Leaves.",
                    "Go to Calendar.",
                    "Choose the month or date range.",
                    "Click an entry to view the leave or holiday details.",
                ],
                after: [
                    "Approved leaves and holidays show on the calendar.",
                    "Managers can plan schedules around team availability.",
                ],
            },
        ],
    },
    {
        title: "Organization",
        articles: [
            {
                id: "employees",
                title: "Find an employee",
                eyebrow: "Employee directory",
                summary: "Search employee details, role, department, manager, and contact information.",
                icon: Users,
                when: [
                    "You need to look up an employee.",
                    "HR needs to review or update employee information.",
                ],
                steps: [
                    "Open Employees.",
                    "Use the search box to find a name or email.",
                    "Use department or role filters if needed.",
                    "Click an employee row to open the full profile.",
                    "If you have edit access, update editable fields and save.",
                ],
                after: [
                    "The profile shows employee details, role, department, manager chain, and related information.",
                    "If Microsoft sync is enabled, some fields may be refreshed from Microsoft.",
                ],
                tips: [
                    "If a person is missing, check whether they are active in the organization.",
                    "Role changes affect what the employee can access.",
                ],
            },
            {
                id: "departments",
                title: "Create or update a department",
                eyebrow: "Departments",
                summary: "Use departments to group employees, heads, and related projects.",
                icon: Building2,
                when: [
                    "A new team or department is created.",
                    "Employees need to be assigned to an existing department.",
                ],
                steps: [
                    "Open Departments.",
                    "Click Create Department or open an existing department.",
                    "Fill the department name.",
                    "Choose the department head if needed.",
                    "Choose a parent department if this department belongs under another one.",
                    "Add members individually or in bulk.",
                    "Save the changes.",
                ],
                fields: [
                    "Name: Department name.",
                    "Head: Employee responsible for the department.",
                    "Parent department: Optional reporting group.",
                    "Members: Employees included in the department.",
                    "Status: Active or inactive.",
                ],
                after: [
                    "The department appears in filters and employee profiles.",
                    "Department heads and members are visible in the department detail page.",
                ],
            },
            {
                id: "projects",
                title: "Create a project and add members",
                eyebrow: "Projects",
                summary: "Projects organize work and feed project selection in attendance work logs.",
                icon: BriefcaseBusiness,
                when: [
                    "A new client, internal initiative, or delivery project begins.",
                    "Employees need to log attendance work against a project.",
                ],
                steps: [
                    "Open Projects.",
                    "Click Create Project.",
                    "Enter the project name and other details.",
                    "Set the project as Active if employees should use it.",
                    "Add members to the project.",
                    "Add tasks if the project needs task-level work logs.",
                    "Save the project.",
                ],
                fields: [
                    "Name: Project display name.",
                    "Department: Optional owning department.",
                    "Billable: Whether work is billable.",
                    "Dates: Project start and end dates.",
                    "Members: Employees who can log work against it.",
                    "Tasks: Work categories under the project.",
                ],
                after: [
                    "Assigned employees can select the project while clocking in or adding work logs.",
                    "Inactive projects are hidden from normal attendance selection.",
                ],
                tips: [
                    "If an employee cannot see a project in Attendance, check project membership first.",
                ],
            },
            {
                id: "permissions",
                title: "Update permissions",
                eyebrow: "Roles",
                summary: "Roles decide which modules and actions a member can use.",
                icon: ShieldCheck,
                when: [
                    "Someone needs access to a module.",
                    "A manager, HR admin, finance approver, or asset admin role changes.",
                ],
                steps: [
                    "Open Permissions.",
                    "Choose an existing role or create a new role.",
                    "Review the module list.",
                    "For each module, choose what the role can view, create, edit, delete, or approve.",
                    "Choose the access level, such as self, department, or organization.",
                    "Save the role.",
                    "Assign the role to employees from Employees if needed.",
                ],
                after: [
                    "Members with that role get the updated access.",
                    "They may need to refresh the page or sign in again to see all changes.",
                ],
                tips: [
                    "Give the smallest access level that lets the person do their job.",
                    "Use organization-level access only for trusted admin roles.",
                ],
            },
        ],
    },
    {
        title: "Recruitment",
        articles: [
            {
                id: "job-requisition",
                title: "Create a job requisition",
                eyebrow: "Hiring request",
                summary: "Raise a request for a new role before publishing or moving candidates.",
                icon: BriefcaseBusiness,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 190505.png",
                        "Job Requisitions page with draft, pending, approved, and approval status columns.",
                        "Job requisitions list: open an existing request or click New Requisition to create one.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 170034.png",
                        "Create Requisition page showing basic information and hiring context fields.",
                        "Create requisition form: fill the required sections, then submit for approval when ready.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 190535.png",
                        "Create Requisition form with basic job and hiring details.",
                        "Basic information section: enter job title, department, employment type, openings, and location.",
                    ),
                ],
                when: [
                    "A department needs to hire someone.",
                    "HR needs approval before opening a job.",
                ],
                steps: [
                    "Open Jobs.",
                    "Click New Job or Create Requisition.",
                    "Fill job title, department, priority, opening reason, and hiring details.",
                    "Add salary or compensation details if your organization requires them.",
                    "Add skills, experience, and screening rules.",
                    "Save as draft if it is not ready.",
                    "Click Submit when it is ready for approval.",
                ],
                after: [
                    "The requisition moves to Pending Approval.",
                    "Approvers can approve or reject it with comments.",
                    "After approval, HR can set up the pipeline and posting.",
                ],
                tips: [
                    "Use clear skills and experience requirements so screening works better.",
                    "Rejected requisitions usually need edits before resubmission.",
                ],
            },
            {
                id: "recruitment-kanban",
                title: "Use the candidate Kanban board",
                eyebrow: "Candidate pipeline",
                summary: "Move candidates through hiring stages from application to final decision.",
                icon: LayoutDashboard,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 170047.png",
                        "Candidates page listing job postings with role, total candidates, stages, priority, and openings.",
                        "Candidates landing page: choose the job posting whose pipeline you want to open.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 170056.png",
                        "Python Developer job overview with candidate, interview, offer, activity, and hiring team panels.",
                        "Job overview: review candidate totals, interview status, offers, and hiring team load.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 170122.png",
                        "Candidate Kanban board with Applied, Screening, Interview, HR Interview, and Offer columns.",
                        "Kanban board: drag candidate cards between stages or open a card to take action.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 190708.png",
                        "Python Developer Kanban board with candidates in Applied and empty downstream stages.",
                        "Pipeline columns: use stage columns to organize where each candidate currently stands.",
                    ),
                ],
                when: [
                    "Candidates have applied for a job.",
                    "Recruiters need to review, interview, offer, hire, or reject candidates.",
                ],
                steps: [
                    "Open Candidates.",
                    "Select the job posting.",
                    "Open Kanban view.",
                    "Review candidate cards in each stage column.",
                    "Drag a candidate card to another stage or open the card and choose Move.",
                    "Add notes when the reason for movement should be recorded.",
                ],
                after: [
                    "The candidate card appears in the new stage.",
                    "Stage history is saved.",
                    "The next stage may show special actions, such as schedule interview or send offer.",
                ],
                tips: [
                    "Use notes for important decisions.",
                    "Do not move a candidate to final stages until the decision is confirmed.",
                ],
            },
            {
                id: "screening-stage",
                title: "Screen candidates",
                eyebrow: "Default stage",
                summary: "Use regular stages like Applied, Screening, Shortlist, or Review for flexible candidate sorting.",
                icon: ListChecks,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 170132.png",
                        "Candidate profile with skill match, matching skills, missing skills, AI recommendation, and profile details.",
                        "Candidate profile: review AI recommendation, profile details, skills, and experience before moving stages.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 190812.png",
                        "Candidate profile showing rejected AI recommendation and missing skills.",
                        "Screening detail: use skills and recommendation sections to decide whether to move or reject.",
                    ),
                ],
                when: [
                    "You need a simple review step.",
                    "No interview or offer action is needed yet.",
                ],
                steps: [
                    "Open the candidate board.",
                    "Open the candidate card.",
                    "Review resume, profile details, notes, and score if available.",
                    "Add a note if you need to record feedback.",
                    "Move the candidate to the next stage, interview, rejected, or hold stage.",
                ],
                after: [
                    "The candidate remains in a normal pipeline stage until moved again.",
                ],
            },
            {
                id: "interview-stage",
                title: "Schedule and manage interviews",
                eyebrow: "Interview stage",
                summary: "Use interview stages when candidates need interviewer assignment and meetings.",
                icon: Users,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 170417.png",
                        "Interview stage workspace showing candidates grouped under assigned interviewers.",
                        "Interview workspace: add interviewers, distribute candidates, and save assignments.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 190759.png",
                        "Interview Kanban column with candidate cards and Join or Reschedule actions.",
                        "Interview column: candidate cards show actions like Join or Reschedule when interviews are assigned.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 191013.png",
                        "Interview assignment page with interviewer columns and assigned candidate cards.",
                        "Interview assignments: check each interviewer column, then save assignments when balanced.",
                    ),
                ],
                when: [
                    "A candidate reaches technical, HR, managerial, or final interview.",
                    "Interviewers need calendar invites or feedback tasks.",
                ],
                steps: [
                    "Move the candidate to an Interview stage.",
                    "Open the stage workspace.",
                    "Choose the candidate or candidates.",
                    "Click Assign Interview or Distribute.",
                    "A popover opens with interviewer options.",
                    "Select interviewer, date, time, and meeting details.",
                    "Preview warnings if shown.",
                    "Click Confirm and Send.",
                ],
                fields: [
                    "Interviewer: Person responsible for the interview.",
                    "Date and time: Interview schedule.",
                    "Meeting details: Online or offline meeting information.",
                    "Candidate list: One or more candidates being assigned.",
                ],
                after: [
                    "Interviewers receive the assignment.",
                    "Candidates can receive interview details if configured.",
                    "The interview can be started, rescheduled, completed, accepted, rejected, or reassigned.",
                ],
                tips: [
                    "If warnings appear, read them before confirming.",
                    "Complete the interview only after feedback is ready.",
                ],
            },
            {
                id: "offer-stage",
                title: "Send an offer",
                eyebrow: "Offer stage",
                summary: "Prepare and send an offer letter to selected candidates.",
                icon: FileText,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 170535.png",
                        "Offer stage table with candidates, offer status, last sent date, expiry, and actions.",
                        "Offer table: select candidates and click Send offer letter when ready.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 170612.png",
                        "Send offer letter modal with template list, offer preview, expiry, and Send button.",
                        "Send offer modal: choose the template, review the preview, set expiry, and send.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 170639.png",
                        "Offer template builder with editor and live offer preview.",
                        "Offer template builder: edit template sections and preview the letter before publishing.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 190854.png",
                        "Offer table with selected candidates and Send offer letter button.",
                        "Selected candidates: check the right rows before sending offer letters.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 191106.png",
                        "Send offer letter modal with template search, template list, preview, expiry field, and Send button.",
                        "Final offer review: confirm the selected template and click Send.",
                    ),
                ],
                when: [
                    "A candidate has cleared selection.",
                    "HR is ready to share the offer letter.",
                ],
                steps: [
                    "Move the candidate to the Offer stage.",
                    "Open the offer workspace.",
                    "Choose the offer template.",
                    "Review candidate details, job details, salary, and joining information.",
                    "Preview the offer letter.",
                    "Fix missing details if the preview warns you.",
                    "Click Send Offer.",
                ],
                after: [
                    "The offer is generated and sent to the candidate.",
                    "The candidate can accept, reject, or download it from the offer link.",
                    "Accepted candidates can be moved to Hired or Onboarding.",
                ],
                tips: [
                    "If salary details are missing, update the job or requisition details before sending.",
                ],
            },
            {
                id: "hired-rejected-onboarding",
                title: "Finish hiring",
                eyebrow: "Final stages",
                summary: "Use Hired, Rejected, and Onboarding stages to close the candidate journey cleanly.",
                icon: CheckCircle2,
                screenshots: [
                    shot(
                        "Screenshot 2026-06-10 170746.png",
                        "Accepted candidates table with selected rows and Send Onboarding Email button.",
                        "Accepted stage: select candidates and send onboarding email when they are ready.",
                    ),
                    shot(
                        "Screenshot 2026-06-10 173855.png",
                        "Onboarding page showing candidates, status, role selector, email field, and Send action.",
                        "Onboarding table: assign role and email, then send credentials or onboarding details.",
                    ),
                ],
                when: [
                    "A candidate has accepted or declined.",
                    "The hiring team made a final decision.",
                    "HR needs to start onboarding.",
                ],
                steps: [
                    "Move selected candidates to Hired when they are accepted.",
                    "Move declined or unsuitable candidates to Rejected.",
                    "Move accepted candidates to Onboarding if documents or credentials are needed.",
                    "In Onboarding, assign email, role, and required joining details.",
                    "Send the onboarding link or credentials when ready.",
                ],
                after: [
                    "Hired and Rejected are final decision stages.",
                    "Onboarding collects documents and prepares the candidate for employee access.",
                ],
                tips: [
                    "Keep final stage movement deliberate because it affects hiring reports.",
                ],
            },
        ],
    },
    {
        title: "Assets and Procurement",
        articles: [
            {
                id: "asset-create",
                title: "Add an asset",
                eyebrow: "Asset inventory",
                summary: "Create inventory for laptops, monitors, phones, cards, furniture, or other company assets.",
                icon: Laptop,
                when: [
                    "A new asset is received.",
                    "Existing inventory needs to be added to HRMS.",
                ],
                steps: [
                    "Open Assets.",
                    "Click Add Asset.",
                    "Fill asset name, code, category, serial number, brand, model, condition, and purchase details.",
                    "Choose status, usually Available for new stock.",
                    "Fill any category-specific fields.",
                    "Click Save.",
                ],
                after: [
                    "The asset appears in inventory.",
                    "Available assets can be issued to employees.",
                    "Warranty and reports use the saved purchase details.",
                ],
                tips: [
                    "Use Bulk Create when adding many similar assets.",
                    "Keep serial numbers accurate so returns and repairs are easier.",
                ],
            },
            {
                id: "asset-issue",
                title: "Issue an asset to an employee",
                eyebrow: "Assignment",
                summary: "Assign available assets to employees and keep a record of who has what.",
                icon: Archive,
                when: [
                    "An employee receives a laptop, monitor, phone, card, or other item.",
                    "HR or IT needs assignment history.",
                ],
                steps: [
                    "Open Assets.",
                    "Click Issue Asset.",
                    "A form opens with available assets.",
                    "Choose the employee.",
                    "Select one or more available assets.",
                    "Confirm condition while issuing.",
                    "Add notes if needed.",
                    "Click Issue.",
                ],
                after: [
                    "The asset status becomes Assigned.",
                    "The employee can see the asset in their employee asset view.",
                    "The assignment appears in reports.",
                ],
            },
            {
                id: "asset-return",
                title: "Return an asset",
                eyebrow: "Return flow",
                summary: "Record returned assets and decide whether they go back to stock or need action.",
                icon: ClipboardCheck,
                when: [
                    "An employee returns an assigned asset.",
                    "An offboarding employee needs to return company property.",
                ],
                steps: [
                    "Open the asset detail page or employee assigned assets.",
                    "Click Return.",
                    "A return popover opens.",
                    "Enter return date, returned condition, and notes.",
                    "Choose the next status, such as Available, In Maintenance, Damaged, Retired, or Disposed.",
                    "Click Confirm Return.",
                ],
                after: [
                    "The assignment is closed.",
                    "The asset status updates to the next status you selected.",
                    "The return appears in asset history and reports.",
                ],
                tips: [
                    "Choose In Maintenance if the asset needs repair before reuse.",
                ],
            },
            {
                id: "maintenance",
                title: "Create a maintenance ticket",
                eyebrow: "Repair and service",
                summary: "Track repair, service, inspection, replacement, upgrade, warranty, or damage checks.",
                icon: HelpCircle,
                when: [
                    "An asset needs repair or inspection.",
                    "An employee reports an asset issue.",
                ],
                steps: [
                    "Open the asset detail page.",
                    "Click Add Maintenance.",
                    "Choose maintenance type.",
                    "Enter issue description, service date, condition before maintenance, and notes.",
                    "Save the ticket.",
                    "Update the status as work moves from Open to In Progress to Completed.",
                ],
                after: [
                    "The ticket appears in the maintenance list.",
                    "Completing the ticket asks for the final asset condition and next asset status.",
                    "If replacement is needed, use the replacement or procurement flow.",
                ],
            },
            {
                id: "procurement",
                title: "Raise a procurement request",
                eyebrow: "Purchase request",
                summary: "Request purchase approval for new assets or replacements.",
                icon: FileText,
                when: [
                    "You need to buy new assets in bulk.",
                    "A maintenance ticket needs a replacement purchase.",
                ],
                steps: [
                    "Open Procurement.",
                    "Click New Requisition.",
                    "Choose Bulk for new stock or Replacement for an asset replacement.",
                    "Fill asset name, quantity, estimated cost, vendor preference, urgency, and justification.",
                    "For replacement, choose the linked maintenance ticket and enter the replacement reason.",
                    "Save as draft or click Submit.",
                ],
                after: [
                    "Submitted requests go to finance approval.",
                    "Approved requests can be used to prepare a purchase order.",
                    "Rejected requests show the decision comments.",
                ],
                tips: [
                    "Write a clear justification so finance can approve without follow-up.",
                ],
            },
            {
                id: "purchase-order",
                title: "Issue a purchase order",
                eyebrow: "Finance approval",
                summary: "Generate or send a purchase order after a procurement request is approved.",
                icon: FileText,
                when: [
                    "A procurement request is approved.",
                    "Finance is ready to share the purchase order.",
                ],
                steps: [
                    "Open Procurement.",
                    "Open the approved requisition.",
                    "Click Purchase Order Draft.",
                    "Review company, vendor, line items, signatory, and terms.",
                    "Preview the PDF.",
                    "Choose the admin recipient if it should be sent by email.",
                    "Click Issue Purchase Order.",
                ],
                after: [
                    "The purchase order is generated.",
                    "If email is configured, it is sent to the selected recipient.",
                    "The purchase order remains available for download.",
                ],
            },
        ],
    },
    {
        title: "Helpdesk",
        articles: [
            {
                id: "helpdesk-ticket",
                title: "Raise a helpdesk ticket",
                eyebrow: "Employee support",
                summary: "Ask for help with an asset issue or a general support request.",
                icon: HelpCircle,
                when: [
                    "Your assigned asset has a problem.",
                    "You need support from HR, IT, or admin.",
                ],
                steps: [
                    "Open Helpdesk.",
                    "Click New Request.",
                    "A helpdesk popover opens.",
                    "Choose Asset Issue or General Help Request.",
                    "If it is an asset issue, select the affected asset.",
                    "Enter subject, issue description, and preferred service date.",
                    "Choose maintenance type if shown.",
                    "Click Submit.",
                ],
                fields: [
                    "Request type: Asset issue or general help.",
                    "Asset: The affected item, if applicable.",
                    "Subject: Short title for the issue.",
                    "Description: What is wrong or what help is needed.",
                    "Service date: Preferred date for support.",
                ],
                after: [
                    "Your ticket is created as Open.",
                    "Admins or support team members are notified.",
                    "You can track the ticket under My Tickets.",
                ],
                tips: [
                    "Attach clear details in the description so support can act faster.",
                    "For urgent issues, mention urgency in the subject or description.",
                ],
            },
            {
                id: "helpdesk-track",
                title: "Track or withdraw my ticket",
                eyebrow: "My tickets",
                summary: "Follow ticket progress or withdraw requests that are no longer needed.",
                icon: ClipboardCheck,
                when: [
                    "You already submitted a helpdesk ticket.",
                    "The issue is fixed before support starts work.",
                ],
                steps: [
                    "Open Helpdesk.",
                    "Go to My Tickets.",
                    "Check the ticket status.",
                    "Open the ticket to see details and notes.",
                    "Click Withdraw if the ticket is still active and no longer needed.",
                ],
                after: [
                    "Open means support has not completed it yet.",
                    "In Progress means someone is working on it.",
                    "Completed means the request was resolved.",
                    "Cancelled means it was withdrawn or closed without resolution.",
                ],
                tips: [
                    "Completed tickets cannot be withdrawn.",
                    "If the problem returns, create a new ticket instead of reopening an old completed one.",
                ],
            },
        ],
    },
];

const allArticles = docGroups.flatMap((group) => group.articles.map((article) => ({ ...article, group: group.title })));

export function DocumentationPageShell({ orgSlug }: Readonly<{ orgSlug: string }>) {
    const [query, setQuery] = React.useState("");
    const [activeId, setActiveId] = React.useState(allArticles[0]?.id ?? "");

    const filteredGroups = React.useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return docGroups;

        return docGroups
            .map((group) => ({
                ...group,
                articles: group.articles.filter((article) => {
                    const haystack = [
                        group.title,
                        article.title,
                        article.eyebrow,
                        article.summary,
                        ...article.when,
                        ...article.steps,
                        ...(article.fields ?? []),
                        ...(article.after ?? []),
                        ...(article.tips ?? []),
                    ].join(" ").toLowerCase();
                    return haystack.includes(normalized);
                }),
            }))
            .filter((group) => group.articles.length > 0);
    }, [query]);

    function scrollToArticle(id: string) {
        setActiveId(id);
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    return (
        <div className="flex h-dvh min-h-0 bg-canvas text-neutral-900">
            <aside className="hidden w-[312px] shrink-0 border-r border-neutral-100 bg-surface md:flex md:flex-col">
                <DocsBrand orgSlug={orgSlug} />
                <div className="border-b border-neutral-100 px-5 py-4">
                    <label className="relative block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search helper docs"
                            className="h-10 w-full rounded-md border border-neutral-100 bg-neutral-50 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/10"
                        />
                    </label>
                </div>
                <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
                    {filteredGroups.length === 0 ? (
                        <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">
                            No matching guide found.
                        </div>
                    ) : (
                        filteredGroups.map((group) => (
                            <div key={group.title} className="mb-5">
                                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                    {group.title}
                                </p>
                                <div className="space-y-1">
                                    {group.articles.map((article) => (
                                        <button
                                            key={article.id}
                                            type="button"
                                            onClick={() => scrollToArticle(article.id)}
                                            className={cn(
                                                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition",
                                                activeId === article.id
                                                    ? "bg-primary-ghost text-primary"
                                                    : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900",
                                            )}
                                        >
                                            <article.icon className="size-4 shrink-0" />
                                            <span className="min-w-0 flex-1 truncate">{article.title}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </nav>
            </aside>

            <main className="min-w-0 flex-1 overflow-y-auto">
                <div className="sticky top-0 z-20 border-b border-neutral-100 bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
                    <DocsBrand orgSlug={orgSlug} compact />
                    <label className="relative mt-3 block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search helper docs"
                            className="h-10 w-full rounded-md border border-neutral-100 bg-neutral-50 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/10"
                        />
                    </label>
                </div>

                <section className="border-b border-neutral-100 bg-surface px-5 py-12 md:px-12 lg:px-20">
                    <div className="max-w-4xl">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-primary">Kovan Docs</p>
                        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-[40px] md:leading-[1.08]">
                            Employee helper guide
                        </h1>
                        <p className="mt-5 max-w-3xl text-base leading-7 text-neutral-500">
                            Short, practical guides for everyday HRMS tasks. Pick a topic from the sidebar and follow the steps exactly as they appear in the product.
                        </p>
                        <div className="mt-8 grid gap-3 sm:grid-cols-3">
                            <HeroStat label="Guides" value={String(allArticles.length)} />
                            <HeroStat label="Modules" value={String(docGroups.length)} />
                            <HeroStat label="Style" value="How-to" />
                        </div>
                    </div>
                </section>

                <section className="px-5 py-8 md:px-12 lg:px-20">
                    <div className="max-w-4xl space-y-5">
                        {filteredGroups.length === 0 ? (
                            <div className="rounded-xl border border-neutral-100 bg-surface p-8 text-center shadow-[var(--shadow-1)]">
                                <p className="text-lg font-semibold">No guide found</p>
                                <p className="mt-2 text-sm text-neutral-500">Try searching for clock in, leave, asset, offer, or helpdesk.</p>
                            </div>
                        ) : (
                            filteredGroups.map((group) => (
                                <div key={group.title} className="space-y-5">
                                    <div className="pt-4">
                                        <h2 className="text-xl font-semibold tracking-tight text-neutral-900">{group.title}</h2>
                                    </div>
                                    {group.articles.map((article) => (
                                        <GuideArticle
                                            key={article.id}
                                            article={article}
                                            active={activeId === article.id}
                                            onEnter={() => setActiveId(article.id)}
                                        />
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

function DocsBrand({ orgSlug, compact = false }: Readonly<{ orgSlug: string; compact?: boolean }>) {
    return (
        <div className={cn("flex items-center justify-between", compact ? "" : "border-b border-neutral-100 px-5 py-5")}>
            <Link href={`/${orgSlug}/documents`} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg border border-neutral-100 bg-canvas shadow-[var(--shadow-1)]">
                    <FileText className="size-5 text-primary" />
                </span>
                <span className="text-lg font-semibold tracking-tight">
                    Kovan <span className="font-normal text-neutral-500">Docs</span>
                </span>
            </Link>
            <Link
                href={`/${orgSlug}`}
                className="rounded-md border border-neutral-100 px-3 py-2 text-xs font-medium text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900"
            >
                Back to HRMS
            </Link>
        </div>
    );
}

function HeroStat({ label, value }: Readonly<{ label: string; value: string }>) {
    return (
        <div className="rounded-lg border border-neutral-100 bg-canvas px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</p>
            <p className="mt-1 text-xl font-semibold text-neutral-900">{value}</p>
        </div>
    );
}

function GuideArticle({
    article,
    active,
    onEnter,
}: Readonly<{
    article: DocArticle;
    active: boolean;
    onEnter: () => void;
}>) {
    const Icon = article.icon;

    return (
        <article
            id={article.id}
            onMouseEnter={onEnter}
            className={cn(
                "scroll-mt-8 rounded-xl border bg-surface p-5 shadow-[var(--shadow-1)] transition md:p-7",
                active ? "border-primary/30" : "border-neutral-100",
            )}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-ghost text-primary">
                    <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">{article.eyebrow}</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">{article.title}</h3>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-500">{article.summary}</p>
                </div>
            </div>

            <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-6">
                    {article.screenshots ? <ScreenshotGallery screenshots={article.screenshots} /> : null}
                    <GuideBlock title="When to use this" items={article.when} variant="plain" />
                    <GuideBlock title="Steps" items={article.steps} variant="steps" />
                    {article.fields ? <GuideBlock title="What to fill" items={article.fields} variant="plain" /> : null}
                    {article.after ? <GuideBlock title="What happens next" items={article.after} variant="plain" /> : null}
                </div>
                <aside className="h-fit rounded-lg border border-neutral-100 bg-canvas p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                        <ChevronRight className="size-4 text-primary" />
                        Quick notes
                    </div>
                    {article.tips?.length ? (
                        <ul className="mt-3 space-y-3 text-sm leading-6 text-neutral-500">
                            {article.tips.map((tip) => (
                                <li key={tip} className="flex gap-2">
                                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-3 text-sm leading-6 text-neutral-500">
                            Follow the steps in order. If a button or field is missing, your role may not have access.
                        </p>
                    )}
                </aside>
            </div>
        </article>
    );
}

function ScreenshotGallery({
    screenshots,
}: Readonly<{
    screenshots: DocScreenshot[];
}>) {
    return (
        <div className="space-y-4">
            <h4 className="text-[15px] font-semibold text-neutral-900">Visual reference</h4>
            <div className="grid gap-4">
                {screenshots.map((screenshot) => (
                    <figure key={screenshot.src} className="overflow-hidden rounded-lg border border-neutral-100 bg-canvas">
                        <div className="relative aspect-[16/9] w-full">
                            <Image
                                src={screenshot.src}
                                alt={screenshot.alt}
                                fill
                                sizes="(min-width: 1024px) 560px, 100vw"
                                className="object-cover object-top"
                            />
                        </div>
                        <figcaption className="border-t border-neutral-100 bg-surface px-4 py-3 text-xs leading-5 text-neutral-500">
                            {screenshot.caption}
                        </figcaption>
                    </figure>
                ))}
            </div>
        </div>
    );
}

function GuideBlock({
    title,
    items,
    variant,
}: Readonly<{
    title: string;
    items: string[];
    variant: "plain" | "steps";
}>) {
    return (
        <section>
            <h4 className="text-[15px] font-semibold text-neutral-900">{title}</h4>
            {variant === "steps" ? (
                <ol className="mt-3 space-y-3">
                    {items.map((item, index) => (
                        <li key={item} className="flex gap-3 text-sm leading-6 text-neutral-700">
                            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-neutral-50 font-mono text-xs text-neutral-500">
                                {index + 1}
                            </span>
                            <span className="pt-0.5">{item}</span>
                        </li>
                    ))}
                </ol>
            ) : (
                <ul className="mt-3 space-y-2">
                    {items.map((item) => (
                        <li key={item} className="flex gap-3 text-sm leading-6 text-neutral-700">
                            <CheckCircle2 className="mt-1 size-4 shrink-0 text-success-text" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
