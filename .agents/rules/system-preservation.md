# CRITICAL SYSTEM PRESERVATION RULE — NEA PROJECT

## 1. Absolute Rule: Do Not Change Existing Systems Without Permission

You must treat every existing, working, or previously implemented system in this NEA project as **protected and immutable by default**.

**No existing system, feature, functionality, workflow, database structure, security policy, configuration, or integration may be modified, removed, replaced, disabled, bypassed, or redesigned unless explicitly authorized by the user for that specific change.**

This rule remains active for every future task until the user explicitly directs to change or remove this preservation rule.

## 2. Permission Must Be Explicit

You may modify a protected system only when the user clearly authorizes the specific change.

Examples of valid authorization:
- "Change the email notification system."
- "Modify the resident registration process."
- "Update the Web Push implementation."
- "Change the database structure for this specific requirement."

The following are NOT authorization to modify existing systems:
- "Fix the bug."
- "Improve the application."
- "Make it better."
- "Fix the error."
- "Implement this feature."
- "Make the UI professional."

These instructions authorize only the requested task, not unrelated changes to existing systems.

If fixing a bug requires changing a protected system, stop and explain:
1. Which system needs to change.
2. Why the change is necessary.
3. What exactly you intend to modify.
4. Which existing features or dependencies might be affected.

Wait for the user's explicit approval before making that change.

## 3. Additive Changes Only by Default

For new requirements, prefer the smallest possible, isolated, backward-compatible change.

You must:
- Preserve existing working functionality.
- Reuse existing components, services, database tables, and integrations when appropriate.
- Avoid rewriting entire files when a small change is sufficient.
- Avoid changing unrelated code.
- Preserve existing UI layouts, routes, user roles, and workflows unless explicitly instructed otherwise.
- Avoid introducing duplicate implementations of existing functionality.
- Keep changes scoped to the exact task requested.

Do not assume that a refactor, redesign, replacement, or optimization is permitted just because it appears technically better.

## 4. Database and Security Protection

Treat the database and its security configuration as highly protected systems.

Never perform unauthorized changes to:
- Database tables, columns, relationships, or existing data.
- Row Level Security (RLS) policies.
- Database triggers, functions, or constraints.
- User roles, permissions, or authentication rules.
- Resident verification or permanent-address validation.
- Notification targeting or delivery tracking.
- Environment variables, API keys, or application secrets.

Never disable RLS, weaken access controls, remove validation, expose secret keys, or introduce broad permissions as a shortcut to fixing an error.

Before any authorized database change, explain its purpose, scope, risks, and rollback approach. Prefer a narrow, reversible migration whenever possible.

## 5. NEA Project-Specific Protected Systems

Unless the user explicitly authorizes a change, preserve the existing behavior and architecture of:

- Resident registration, login, authentication, and role verification.
- The two existing roles: `resident` and `municipality_admin`.
- Municipality and ward management for Wards 1–19.
- Permanent resident addresses and their verification rules.
- Electricity outage notices and general electricity notices.
- Municipality-wide and ward-specific notice targeting.
- In-app notifications.
- Email notifications through Resend.
- Web Push notifications, service workers, VAPID configuration, and push subscriptions.
- Notification delivery tracking and error reporting.
- Resident electricity-problem reporting and photo uploads.
- Existing Supabase tables, RLS policies, triggers, and Edge Functions.
- English/Nepali language support.
- Dark/light themes.
- Existing routes, pages, responsive layouts, and working UI components.

This list is not exhaustive. Any other existing system is protected by the same rule.

## 6. Mandatory Workflow Before Editing

For every new task:

**Step 1 — Understand:** Identify the exact requirement and the relevant files or database objects.

**Step 2 — Inspect:** Examine the existing implementation before proposing changes. Do not guess how the system works.

**Step 3 — Check dependencies:** Determine whether the requested change could affect another existing feature.

**Step 4 — Plan:** Describe the smallest safe change and identify any risks.

**Step 5 — Obtain approval if necessary:** If the task requires a protected system to change beyond the scope of the explicit instruction, stop and ask for permission.

**Step 6 — Implement:** Make only the authorized changes. Preserve everything else.

**Step 7 — Verify:** Run appropriate checks and confirm that related existing functionality remains intact. Do not claim a test passed unless it was actually performed.

**Step 8 — Report:** List the files or database objects changed, what was changed, what was deliberately left untouched, and the verification results.

## 7. Error-Handling Rule

Never solve one problem by silently creating another.

If a fix could break authentication, notifications, data integrity, permissions, resident information, or any other existing feature, do not apply it automatically.

Do not delete code, reset the database, overwrite configuration, regenerate secrets, replace a service, or redeploy unrelated systems without the required authorization.

If the cause of an error is uncertain, investigate first and ask for the necessary information rather than making speculative changes.

## 8. Conflict Resolution

If a new instruction conflicts with this preservation rule, follow the new instruction only for the specific system and change the user explicitly identifies.

Do not interpret permission to change one feature as permission to modify other features.

If an instruction is ambiguous, ask one clear question before making a potentially destructive or unrelated change.

## 9. Final Enforcement Rule

**DEFAULT STATE: PROTECTED — NO UNAUTHORIZED CHANGES.**

Until the user explicitly authorizes a change:
- Do not modify existing systems beyond the scope of the request.
- Do not remove or disable existing functionality.
- Do not make unrelated improvements or refactors.
- Do not weaken security or validation.
- Do not assume permission.

The priority is to preserve the stability, security, data integrity, and existing functionality of the NEA project while implementing only the changes authorized.

A successful task means fulfilling the exact requirement **without unnecessarily changing anything else**.
