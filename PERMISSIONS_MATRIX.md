# TaskMaster Permissions & RBAC Matrix

TaskMaster enforces a strict, centralized, server-side Role-Based and Attribute-Based Access Control (RBAC/ABAC) policy layer. Permissions are evaluated on every incoming request, background task, and WebSocket event via the central `can(user, permission, resource, context)` policy engine.

---

## 1. Role Hierarchy & Descriptions

| Role | Scope | Description |
|---|---|---|
| **SUPER ADMIN** | Entire Workspace / Organization | Highest level administrative authority. Manages organization branding, billing, security policies, audit logs, system health, and all users. Protected from deletion. |
| **ADMIN** | Assigned Teams & Projects | Project manager / Team lead level. Can create projects, create and assign tasks, manage users within their scope (invite, deactivate regular users), and approve task reviews. Cannot modify Super Admins or other Admins. |
| **USER** (Employee) | Assigned Tasks & Member Projects | Executes tasks assigned to them, logs time, adds comments, uploads attachments, manages personal private to-dos, and requests task reassignment or deadline extensions. |

---

## 2. Project-Level Roles

Users participating in specific projects are also assigned a scoped Project Role:

| Project Role | Capabilities |
|---|---|
| **MANAGER** | Full project management: update project metadata, milestones, add/remove members, manage all tasks in the project. |
| **CONTRIBUTOR** | Create tasks, update assigned tasks, move task status, comment, log time, submit tasks for review. |
| **VIEWER** | Read-only access to project overview, board, list, timeline, and task activity. |

---

## 3. Permissions Matrix Table

| Resource | Action / Permission Key | SUPER ADMIN | ADMIN | USER (Employee) | Contextual / ABAC Rule |
|---|---|:---:|:---:|:---:|---|
| **Organization** | `org:manage` | ✅ | ❌ | ❌ | Workspace level |
| | `org:security_policies` | ✅ | ❌ | ❌ | 2FA rules, password policy, IP allow-list |
| | `org:audit_view` | ✅ | ❌ | ❌ | Immutable audit log inspection |
| | `org:audit_export` | ✅ | ❌ | ❌ | Audit trail CSV/JSON export |
| | `org:system_health` | ✅ | ❌ | ❌ | DB, Redis, BullMQ queue status |
| **Users** | `user:create` | ✅ | ❌ | ❌ | Direct creation |
| | `user:invite` | ✅ | ✅ | ❌ | Invite link generation |
| | `user:view` | ✅ | ✅ | ✅ | Member directory |
| | `user:update` | ✅ | ✅ | ❌ | Admin can only update regular Users |
| | `user:suspend` | ✅ | ✅ | ❌ | Admin cannot suspend Admins/Super Admins |
| | `user:delete` | ✅ | ❌ | ❌ | Super Admin cannot delete other Super Admins |
| | `user:reset_credentials`| ✅ | ❌ | ❌ | Force password reset / credential revoke |
| | `user:force_logout` | ✅ | ❌ | ❌ | Invalidate all Redis session tokens |
| | `user:assign_roles` | ✅ | ❌ | ❌ | Change user role hierarchy |
| **Teams / Depts**| `team:create` | ✅ | ✅ | ❌ | Department / Team creation |
| | `team:view` | ✅ | ✅ | ✅ | View assigned teams |
| | `team:update` | ✅ | ✅ | ❌ | Edit team details & leads |
| | `team:delete` | ✅ | ❌ | ❌ | Remove teams |
| | `team:manage_members` | ✅ | ✅ | ❌ | Add/remove team members |
| **Projects** | `project:create` | ✅ | ✅ | ❌ | Create new project |
| | `project:view_all` | ✅ | ❌ | ❌ | View all org projects |
| | `project:view_member` | ✅ | ✅ | ✅ | View projects where user is member |
| | `project:update` | ✅ | ✅ | ❌ | Update project settings / milestones |
| | `project:archive` | ✅ | ✅ | ❌ | Archive project |
| | `project:delete` | ✅ | ❌ | ❌ | Soft delete project |
| | `project:manage_members`| ✅ | ✅ | ❌ | Add/remove project members |
| **Tasks** | `task:create` | ✅ | ✅ | ❌ | Create project task |
| | `task:view` | ✅ | ✅ | ✅ | Scoped to member projects / personal |
| | `task:update_any` | ✅ | ✅ | ❌ | Update any task in managed project |
| | `task:update_assigned`| ✅ | ✅ | ✅ | User can update tasks assigned to them |
| | `task:delete` | ✅ | ✅ | ❌ | Delete task |
| | `task:assign` | ✅ | ✅ | ❌ | Assign/reassign task to members |
| | `task:approve` | ✅ | ✅ | ❌ | Approve/reject task review workflow |
| | `task:request_review` | ✅ | ✅ | ✅ | Mark ready for review |
| | `task:log_time` | ✅ | ✅ | ✅ | Log time against assigned tasks |
| | `task:comment` | ✅ | ✅ | ✅ | Comment on visible tasks |
| | `task:attach_file` | ✅ | ✅ | ✅ | Upload attachments |
| **Personal Tasks**| `personal_task:manage`| ✅ | ✅ | ✅ | Strictly private to the creator |
| **Analytics** | `analytics:org_view` | ✅ | ❌ | ❌ | Org-wide KPIs & velocity |
| | `analytics:team_view`| ✅ | ✅ | ❌ | Team workload & burndown |
| | `analytics:personal_view`| ✅ | ✅ | ✅ | Personal workload & time logged |
| | `analytics:export` | ✅ | ✅ | ❌ | Server-side background export |

---

## 4. Policy Engine Code Usage

```typescript
import { can, PERMISSIONS } from '@taskmaster/shared';

// Example: Evaluate task update permission
const allowed = can(
  currentUser,
  PERMISSIONS.TASK_UPDATE_ASSIGNED,
  'task',
  { targetTask: taskDoc }
);

if (!allowed) {
  throw new ForbiddenError('You are not authorized to update this task');
}
```
