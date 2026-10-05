# TaskMaster | Enterprise Project & Task Management Platform

A production-grade, multi-tenant-ready Project & Task Management Platform designed for modern organisations. Built with a high-performance Monorepo architecture featuring Next.js 15, Node.js Express, MongoDB Replica Sets, Redis, BullMQ, and Socket.IO.

---

## 🏛️ Monorepo Architecture

```
task-management/
├── .github/workflows/          # GitHub Actions CI/CD pipelines
├── apps/
│   ├── api/                    # Node.js + Express + Mongoose + Redis + BullMQ backend
│   │   ├── src/
│   │   │   ├── config/         # Zod validated env, Mongoose & Redis managers, Pino logger
│   │   │   ├── common/         # AppError hierarchy, middlewares (auth, validation, errors)
│   │   │   └── modules/        # Feature modules (health, auth, users, orgs, projects, tasks)
│   │   └── tests/              # Unit & Integration tests (Vitest + Supertest)
│   │
│   └── web/                    # Next.js 15 App Router + Tailwind CSS + shadcn/ui
│       ├── src/
│       │   ├── app/            # App Router pages and layouts
│       │   ├── components/     # UI primitives & Layout components
│       │   └── lib/            # Zod env validation, API client, utils
│       └── tests/              # Unit & Component tests
│
├── packages/
│   ├── shared/                 # Shared TypeScript types, Zod schemas, RBAC policy engine
│   └── tsconfig/               # Strict shared tsconfig presets
│
├── docker-compose.yml          # Local dev environment (Mongo RS, Redis, MailHog, API, Web)
├── PERMISSIONS_MATRIX.md       # Comprehensive RBAC & permissions matrix
├── THREAT_MODEL.md             # Security architecture & OWASP Top 10 mitigation
└── turbo.json                  # Turborepo task pipeline configuration
```

---

## ⚡ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 15 (App Router), TypeScript Strict Mode, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, React Hook Form, Zod, Framer Motion, dnd-kit, Recharts, next-themes, Lucide Icons |
| **Backend** | Node.js (LTS), Express, TypeScript Strict, MongoDB (Replica Set for ACID transactions), Mongoose, Redis (ioredis), BullMQ, Socket.IO, Pino, Argon2id, jsonwebtoken, Helmet, CORS |
| **Tooling & DevOps**| Turborepo, pnpm workspaces, Vitest, Supertest, Docker & Docker Compose, GitHub Actions, ESLint, Prettier, Husky, Commitlint |

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v20+ LTS or v22+
- **pnpm**: v9.0+ (`npm install -g pnpm`)
- **Docker & Docker Compose** (for running MongoDB replica set, Redis, and MailHog)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/taskmaster.git
cd taskmaster

# Install all monorepo dependencies
pnpm install
```

### 3. Start Local Infrastructure
```bash
# Start MongoDB (with replica set rs0), Redis, and MailHog
docker compose up -d mongo redis mailhog
```

### 4. Build Shared Packages
```bash
pnpm --filter @taskmaster/shared build
```

### 5. Run Development Servers
```bash
# Run both Web (port 3000) and API (port 5000) concurrently
pnpm dev

# Or run services individually:
pnpm dev:api    # Starts API on http://localhost:5000
pnpm dev:web    # Starts Web on http://localhost:3000
```

---

## 🧪 Testing & Validation

```bash
# Run all unit and integration tests across the monorepo
pnpm test

# Run type checking across all workspaces
pnpm typecheck

# Run linting
pnpm lint

# Check code formatting
pnpm format:check
```

---

## 🔐 Security & RBAC

- Central policy evaluation via `can(user, permission, resource, context)`.
- See [PERMISSIONS_MATRIX.md](file:///f:/task-managment/PERMISSIONS_MATRIX.md) for the complete permission matrix.
- See [THREAT_MODEL.md](file:///f:/task-managment/THREAT_MODEL.md) for security threat mitigations and ASVS Level 2 alignment.

---

## 🗺️ Phased Delivery Plan

- ✅ **Phase 1**: Monorepo scaffold, tooling, Docker, env validation, CI pipeline, RBAC engine & health endpoints.
- ⏳ **Phase 2**: Auth (Login, Invite, Reset, 2FA, Sessions), Token rotation, Redis blocklist, Audit logging.
- ⏳ **Phase 3**: Organisation, Users, Teams & Departments management (Super Admin / Admin UIs).
- ⏳ **Phase 4**: Projects, Milestones, and Memberships.
- ⏳ **Phase 5**: Tasks CRUD, Subtasks, Comments, Attachments, Kanban & List views.
- ⏳ **Phase 6**: Real-time Notifications, Reminders, and BullMQ Background Jobs.
- ⏳ **Phase 7**: Dashboards, Analytics, Burndown charts, Server-side Exports, Global Command Palette.
- ⏳ **Phase 8**: Hardening, Security review, E2E tests, and Production Deployment setup.
