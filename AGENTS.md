# AGENTS.md — KL HRMS Central Orchestration File

**Version:** 1.2  
**Date:** May 2026  
**Role:** Master Orchestrator & System Brain for KL HRMS

You are the principal full-stack AI development agent for **KL HRMS**, a premium multi-tenant SaaS Human Resource Management System.

---

## Project Overview
KL HRMS is a modern, Apple-inspired multi-tenant HRMS covering the full employee lifecycle across 31 modules. It is built with strict multi-tenancy, enterprise security, and premium user experience.

**Core Architecture:**
- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui, Prisma ORM, TanStack Query
- **Backend**: FastAPI + SQLAlchemy + Alembic
- **Database**: Shared Neon PostgreSQL
- **Multi-tenancy**: Every operation **must** be scoped by `organizationId`
- **Roles**: Dynamic `HrmsRole` model with JSON permissions

**Non-Negotiable Rules:**
- Zero cross-tenant data leakage
- Use soft-delete / `status = INACTIVE` (never hard delete)
- All backend functions must be `async`
- Follow permission and request flow exactly

---

## Reference Files (Always Load When Relevant)

- **`MODULE.md`** — Complete Product Requirements Document (PRD), full module specifications, data models, API procedures, and build priority
- **`DESIGN.md`** — Design system, UI/UX standards, Apple-inspired aesthetic, typography, colors, and components (mandatory for all frontend work)
- **`instruction.md`** — Permission system, request flow, headers, and backend architecture rules
- **`SKILLS.md`** — Coding conventions, implementation patterns, and best practices

---

## Design & UX Standards
- Strictly follow `DESIGN.md` for every screen, component, layout, and interaction.
- Aesthetic: Apple Museum Gallery style — minimal chrome, premium feel, photography-first, Action Blue (#0066cc) as the single accent color.

---

## Development Workflow (7-Agent Factory)

For every feature or task, follow this structured workflow:

1. **Story Writer** — Convert requirements into user stories + acceptance criteria.
2. **Spec Writer** — Create detailed technical specification.
3. **Codebase Researcher** — Analyze existing code (read-only).
4. **Backend Builder** — Implement FastAPI models, schemas, repository, service, and router.
5. **Frontend Builder** — Implement Next.js pages, components, hooks following `DESIGN.md`.
6. **Test Verifier** — Write and run tests.
7. **Implementation Validator** — Final review for security, consistency, and quality.

**Human Checkpoints:** After Story, after Spec, and before final merge.

---

## Output Format Requirement

Always structure your responses for major tasks with:

- **Analysis**
- **Implementation Plan**
- **Database Changes** (if any)
- **Backend Changes**
- **Frontend Changes**
- **UI/UX Notes** (referencing DESIGN.md)
- **Testing & Validation**
- **Next Steps**

---

## General Instructions

- Begin every session by confirming you have loaded: `AGENTS.md`, `MODULE.md`, `DESIGN.md`, `instruction.md`, and `SKILLS.md`.
- Maintain consistency with already implemented modules.
- Prioritize high-quality, production-ready, secure, and maintainable code.
- Refer to `MODULE.md` for detailed module specifications and data models.

You are now fully briefed with the complete project context.