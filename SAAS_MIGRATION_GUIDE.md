# LPG ERP SaaS Migration Guide

## Purpose

This guide describes how to transform the current single-company LPG ERP into a secure, multi-tenant SaaS product. It is an architecture and delivery guide only. It does not change the current application code.

The current product consists of:

- A Node.js 20+, Express 5, MongoDB, Mongoose, JWT, and Zod backend in `C:\p\lpg-erp`.
- A React 19, Vite, React Router, Axios, TanStack Query, and JSX frontend in `C:\p\lpg-erp-client`.
- LPG-specific workflows for purchases, FIFO inventory, cylinder sales, customer receivables, supplier payables, payments, advances, expenses, salary, profit, and reporting.

The SaaS version must support many independent companies using the same application while ensuring that no tenant can read, write, aggregate, or infer another tenant's data.

---

## 1. SaaS Product Model

### 1.1 Core concepts

Introduce these concepts explicitly:

- **Platform**: the SaaS operator and shared infrastructure.
- **Tenant**: one customer company or LPG business using the product.
- **Tenant membership**: a user's relationship to a tenant, including role and status.
- **Workspace**: the tenant-facing company environment in the UI.
- **Subscription**: the tenant's plan, billing state, limits, and renewal information.
- **Feature entitlement**: a capability enabled by plan or tenant configuration.

A user may belong to one tenant in the first SaaS release. Design the data model so multi-tenant users can be supported later without restructuring every business collection.

### 1.2 Recommended initial experience

Use a company-first onboarding flow:

1. User creates an account.
2. User creates a company/workspace.
3. User becomes the tenant owner.
4. The system creates default cylinder types, expense categories, settings, and an initial subscription.
5. User invites staff.
6. User imports or enters customers, suppliers, opening balances, inventory, and historical data.
7. User reaches the operational dashboard.

Avoid exposing tenant IDs as a primary user-facing concept. The active workspace should be selected through a server-validated membership context.

---

## 2. Non-Negotiable Tenant Isolation

Tenant isolation is the most important SaaS requirement. Authentication alone is not tenant isolation.

### 2.1 Tenant key

Add a required `tenantId` to every tenant-owned collection, including:

- `Customer`
- `Supplier`
- `CylinderType`
- `Purchase`
- `PurchaseBatch`
- `Sale`
- `SaleBatchAllocation`
- `CustomerPayment`
- `SupplierPayment`
- `Expense`
- `ExpenseCategory`
- `StaffMember`
- `SalaryPayment`
- `ProfitSharePayment`
- `StockMovement`
- `PriceHistory`
- `AuditLog`
- Any future report snapshots, imports, notifications, or integrations

Do not rely on `createdBy` as a tenant boundary. A user can change roles, leave a tenant, or belong to multiple tenants.

### 2.2 Tenant context middleware

After JWT authentication, resolve an active tenant context:

```text
JWT -> user -> membership -> active tenant -> req.tenant
```

The middleware must:

- Verify that the authenticated user is active.
- Verify that the selected tenant exists and is active.
- Verify that the user has an active membership in that tenant.
- Attach `req.tenantId`, `req.membership`, and `req.tenantRole`.
- Reject missing or invalid tenant context with `403`.

Never trust a client-submitted `tenantId` without checking membership. Prefer deriving it from the authenticated session or a server-validated active workspace selection.

### 2.3 Query rules

Every read and write must include tenant scope:

```js
Model.find({ tenantId: req.tenantId, ...filters });
Model.findOne({ tenantId: req.tenantId, _id: id });
Model.updateOne({ tenantId: req.tenantId, _id: id }, update);
Model.deleteOne({ tenantId: req.tenantId, _id: id });
```

Services must receive tenant context explicitly rather than reading global state:

```js
createSale({ tenantId, userId, input });
monthlyReport({ tenantId, from, to });
```

Do not add tenant filtering only in routes. Service methods and transaction queries must also enforce it, because services may be called from multiple controllers, jobs, imports, or tests.

### 2.4 References must be tenant-safe

When loading related documents, verify both IDs belong to the same tenant:

- A sale's customer must belong to the current tenant.
- A sale's cylinder types must belong to the current tenant.
- A sale's FIFO batches must belong to the current tenant.
- A payment's customer/supplier and linked transaction must belong to the current tenant.
- A purchase batch and its purchase must belong to the current tenant.

Never assume that a valid MongoDB ObjectId is safe.

### 2.5 Database indexes

Add compound indexes beginning with `tenantId` for high-volume and frequently filtered fields:

```text
{ tenantId: 1, createdAt: -1 }
{ tenantId: 1, saleDate: -1 }
{ tenantId: 1, purchaseDate: -1 }
{ tenantId: 1, paymentDate: -1 }
{ tenantId: 1, status: 1 }
{ tenantId: 1, invoiceNumber: 1 }
{ tenantId: 1, paymentNumber: 1 }
```

Tenant-scoped unique identifiers must use compound uniqueness:

```text
{ tenantId: 1, invoiceNumber: 1 } unique
{ tenantId: 1, purchaseNumber: 1 } unique
{ tenantId: 1, paymentNumber: 1 } unique
{ tenantId: 1, batchNumber: 1 } unique
```

A global unique invoice number would incorrectly couple separate companies.

---

## 3. Identity, Membership, and Roles

### 3.1 Replace the current user model gradually

The current `User` model has one global role. SaaS roles should be membership-scoped.

Recommended models:

```text
User
- email
- passwordHash
- name
- status
- emailVerifiedAt
- lastLoginAt

Tenant
- name
- slug
- legalName
- country
- currency
- timezone
- status
- ownerUserId

Membership
- tenantId
- userId
- role
- status
- invitedBy
- joinedAt

Invitation
- tenantId
- email
- role
- tokenHash
- expiresAt
- acceptedAt
```

Recommended roles:

- `owner`: subscription, billing, tenant deletion, ownership transfer.
- `admin`: users, configuration, voids, stock adjustments, reports, settings.
- `manager`: operational control without billing or tenant deletion.
- `staff`: daily sales, purchases, payments, and permitted records.
- `viewer`: read-only access.

Keep authorization on the backend. Frontend role-aware navigation is only a usability feature.

### 3.2 Session design

Options:

- Short-lived access JWT plus refresh token rotation.
- Secure, HTTP-only cookies for browser sessions.
- Server-side session storage for easy revocation.

For a browser SaaS product, prefer HTTP-only secure cookies or a carefully designed access/refresh token system. Avoid long-lived tokens in `localStorage` for production if possible.

The session must identify both the user and active tenant membership. On every privileged request, re-check membership status or use short token lifetimes.

### 3.3 Account security

Add:

- Email verification.
- Password reset tokens with one-time use and expiry.
- Login rate limiting per IP and account.
- Optional MFA for owners and admins.
- Session/device management.
- Audit events for login, logout, password reset, invitation, role changes, and tenant changes.
- Protection against account enumeration in password reset responses.

---

## 4. Tenant Onboarding and Provisioning

Create an idempotent provisioning service:

```text
provisionTenant({ ownerUser, companyDetails })
```

It should create:

- Tenant.
- Owner membership.
- Default tenant settings.
- Default cylinder types.
- Default expense categories.
- Default report preferences.
- Initial subscription/trial.
- Audit event.

Provisioning should run in a MongoDB transaction where possible. If external billing is involved, use an outbox/job pattern and make retries safe.

Never use the current global seed flow for production tenant creation. Keep seed scripts only for local development and platform-level fixtures.

---

## 5. Billing and Subscription Architecture

### 5.1 Subscription models

Add platform-owned collections:

```text
Plan
- code
- name
- monthlyPrice
- annualPrice
- limits
- features
- active

Subscription
- tenantId
- planId
- provider
- providerCustomerId
- providerSubscriptionId
- status
- currentPeriodStart
- currentPeriodEnd
- cancelAtPeriodEnd
- trialEndsAt

BillingEvent
- providerEventId
- type
- tenantId
- payloadHash
- processedAt
- status
```

Use a billing provider such as Stripe or Paddle rather than storing card data. Store only provider identifiers and safe billing metadata.

### 5.2 Entitlements

Create one server-side entitlement service:

```text
canUse(tenant, "sales")
canUse(tenant, "advanced-reports")
canCreateWithinLimit(tenant, "users")
```

Do not scatter plan checks across React components or route handlers.

Examples of enforceable limits:

- Maximum active users.
- Maximum customers/suppliers.
- Maximum monthly sales or purchases.
- Historical reporting depth.
- Number of warehouses or branches.
- Export availability.
- API access.
- Audit retention.

When a subscription is past due, choose and document behavior:

- Read-only mode.
- Limited operational access.
- Grace period.
- Full suspension after grace period.

Never silently delete tenant data because of billing status.

---

## 6. Branches and Future Multi-Location Support

Even if the first SaaS release supports one location per tenant, reserve a `locationId` boundary for future growth.

Recommended future model:

```text
Location
- tenantId
- name
- code
- address
- timezone
- status
```

Operational collections can then be scoped by:

```text
tenantId + locationId
```

Tenant-wide records such as customers, suppliers, users, and billing may remain tenant-scoped, while inventory, batches, stock movements, sales, and purchases can become location-scoped.

Do not add branches halfway through the product without deciding whether customers and balances are shared or location-specific.

---

## 7. Accounting and LPG Domain Rules in SaaS

The SaaS migration must preserve the current authoritative rules.

### 7.1 Inventory

- Purchase quantities normalize to KG.
- Purchases create batches.
- Sales consume batches FIFO.
- Historical batch costs remain immutable snapshots.
- Inventory is tenant-scoped, and later location-scoped if branches are introduced.
- Stock adjustments require role permission and audit records.

### 7.2 Customer balances

Maintain separate concepts:

- `totalDue`: current receivable owed by the customer.
- `advanceBalance`: unused money held for future sales.
- Sale-linked payments: money received during a sale.
- Advance payments: money received before a future sale.
- Advance applications: internal allocation records, not new cash receipts.

Customer advances are allowed only when current due is zero. A sale may consume available advances and must update the remaining advance atomically.

### 7.3 Supplier balances

Maintain equivalent concepts:

- `totalDue`: current payable owed to the supplier.
- `advanceBalance`: unused money paid to the supplier for future purchases.
- Purchase-linked payments.
- Supplier advances.
- Advance applications against purchases.

Supplier advances are allowed only when current payable is zero. A future purchase consumes available advances atomically.

### 7.4 Cash and bank reporting

Receipt classification must remain server-calculated:

- Sale initial payment uses the selected payment method.
- Customer payment-page cash is cash.
- Customer payment-page bank transfer is bank.
- Advance receipts use their selected method.
- Advance applications are excluded from cash/bank receipt totals because they are internal allocations.

Reports must never recalculate financial truth from frontend rows.

---

## 8. API Refactoring Plan

### 8.1 Central tenant-aware repositories

The current controllers and services directly use Mongoose models. Introduce a tenant-aware repository or query helper layer after the data model migration:

```js
const scoped = (tenantId, filter = {}) => ({ tenantId, ...filter });

Customer.find(scoped(tenantId, filter));
```

For stronger safety, expose repository methods that require tenant context and avoid raw model access in business services.

### 8.2 Route groups

Organize routes conceptually:

```text
/api/auth/*
/api/tenants/*
/api/memberships/*
/api/billing/*
/api/workspace/*
/api/customers/*
/api/suppliers/*
/api/purchases/*
/api/sales/*
/api/payments/*
/api/reports/*
```

Keep response envelopes compatible with the current client during migration:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Version public APIs before making breaking changes:

```text
/api/v1/...
```

### 8.3 Idempotency

Add idempotency keys to mutation endpoints that can be retried by browsers, webhooks, imports, or mobile clients:

- Create sale.
- Create purchase.
- Create customer payment.
- Create supplier payment.
- Create advance payment.
- Import batch.
- Billing webhook processing.

Store the key with tenant ID, user ID, endpoint, request hash, result, and expiry. A repeated key must return the original result rather than create a second financial transaction.

### 8.4 Transaction boundaries

Keep the following atomic:

- Sale + FIFO allocations + stock movements + payment + customer balance + advance application.
- Purchase + batch + stock movement + payment + supplier balance + advance application.
- Advance payment + advance balance update.
- Void transaction + reverse balances + reverse stock + payment status updates.

Do not use a distributed transaction across MongoDB and a billing provider. Use an outbox and retryable state transitions instead.

---

## 9. Frontend SaaS Changes

### 9.1 Workspace shell

Add:

- Workspace switcher or current-company selector.
- Tenant/company name in the top bar.
- Subscription status and usage indicator.
- Invite-user flow.
- Tenant settings separated from personal settings.
- Billing page visible to owners/admins.

The existing `Shell` navigation should become capability-aware rather than hard-coded only by role.

### 9.2 Query scoping

The frontend should not manually attach tenant IDs to every request. The active tenant should be represented by the authenticated session or a server-issued workspace context.

TanStack Query keys should include the active workspace identity to prevent cache leakage:

```js
["customers", tenantId, filters][("dashboard", tenantId, range)];
```

Clear or invalidate tenant-scoped caches when the active workspace changes.

### 9.3 Empty and access states

Add clear states for:

- No workspace selected.
- Invitation pending.
- Subscription expired.
- Feature not included in plan.
- Usage limit reached.
- Tenant suspended.
- Tenant data loading.
- Tenant access revoked.

Do not show another tenant's cached data while switching workspaces.

### 9.4 Forms and reporting

Continue using centralized service modules. The frontend should:

- Display server validation messages.
- Never compute authoritative totals for submission.
- Show tenant currency and timezone.
- Use tenant-specific date boundaries.
- Respect feature entitlements.
- Keep customer and supplier advances visibly separate from due/payable balances.

---

## 10. Tenant Settings and Localization

Move hard-coded global assumptions into tenant settings:

```text
TenantSettings
- tenantId
- currencyCode
- currencySymbol
- locale
- timezone
- fiscalYearStart
- dateFormat
- numberFormat
- defaultPaymentMethod
- reportPreferences
- invoicePrefix
- purchasePrefix
```

Every date report must interpret date-only input in the tenant timezone. Store timestamps in UTC, but convert boundaries using the tenant timezone rather than the server's local timezone.

Invoice and payment number prefixes must be tenant-scoped and configurable. Numeric formatting must use tenant locale and currency.

---

## 11. Data Migration from the Single-Company Version

### 11.1 Choose the first tenant

Create one tenant for the current company's data. Assign all existing records to that tenant:

```text
current company -> tenantId = <new tenant>
```

Do not infer tenant ownership from user IDs alone if the current database contains migrated or manually created records.

### 11.2 Migration order

Recommended order:

1. Create the initial tenant.
2. Create or map the owner user.
3. Create memberships.
4. Add `tenantId` to master data.
5. Add `tenantId` to transactions.
6. Add `tenantId` to payment and audit records.
7. Backfill supplier and customer advance balances from active advance payments.
8. Recalculate balances and compare against stored totals.
9. Create tenant-scoped indexes.
10. Enable required-field validation after backfill is complete.

### 11.3 Reconciliation checks

Before enabling production traffic, verify per tenant:

- Customer total due equals expected receivable calculation.
- Supplier total due equals expected payable calculation.
- Customer advance balance equals unconsumed customer advances.
- Supplier advance balance equals unconsumed supplier advances.
- Active payment totals match transaction payment totals.
- Stock movement totals match batch remaining quantities.
- FIFO allocations reference batches in the same tenant.
- Every audit record references a tenant.

Export reconciliation results and retain them with the migration release.

---

## 12. Security and Privacy

### 12.1 Application security

- Use strong production JWT/session secrets.
- Keep secrets in the deployment secret manager, not repository files.
- Rotate secrets with a planned session invalidation strategy.
- Validate all IDs and query filters.
- Prevent regex denial-of-service in search filters.
- Limit request body sizes and file upload sizes.
- Apply per-user and per-tenant rate limits.
- Add CSRF protection when using cookie authentication.
- Keep Helmet, safe CORS, and structured error responses.
- Never return stack traces or credentials.

### 12.2 Financial auditability

Audit:

- Sale/purchase creation and voiding.
- Payment and advance creation.
- Advance application.
- Stock adjustments.
- Customer/supplier balance changes.
- User role and membership changes.
- Subscription changes.
- Imports and exports.

Audit records should include tenant ID, actor user ID, event type, entity type, entity ID, timestamp, request ID, and before/after snapshots where appropriate.

### 12.3 Privacy and retention

Define:

- Data retention period.
- Export format.
- Tenant deletion process.
- Soft-delete behavior.
- Legal hold behavior.
- Backup retention.
- Data residency requirements.
- Support impersonation controls and audit logs.

Support access must be time-limited, explicitly approved, and visible to the tenant owner where possible.

---

## 13. Observability and Operations

Add platform-level observability before onboarding real tenants:

- Structured JSON logs.
- Request ID on every request and response.
- Tenant ID and user ID in safe log context.
- Error tracking with tenant-safe redaction.
- MongoDB query duration metrics.
- API latency by route and tenant plan.
- Background job metrics.
- Billing webhook processing metrics.
- Audit event failure alerts.
- Database connection and transaction failure alerts.

Never place passwords, JWTs, payment secrets, or full financial payloads in logs.

Create operational dashboards for:

- Active tenants.
- New tenant onboarding.
- Trial conversion.
- Subscription failures.
- Request errors by route.
- Database health.
- Import failures.
- Usage-limit events.

---

## 14. Background Jobs and Integrations

As the product grows, move non-request work into a job system:

- Billing webhook processing.
- Email invitations.
- Password reset emails.
- Scheduled report exports.
- Large data imports.
- Data exports.
- Subscription reminders.
- Reconciliation jobs.
- Usage aggregation.

Jobs must carry:

```text
tenantId
actorUserId when applicable
jobId
idempotencyKey
attempt count
```

Every job must be tenant-scoped and safe to retry.

---

## 15. Testing Strategy

### 15.1 Unit tests

Test:

- Tenant query scoping.
- Membership authorization.
- Role authorization.
- Date boundaries by tenant timezone.
- Customer and supplier balance calculations.
- Advance eligibility.
- Advance application order.
- FIFO allocation.
- Cash/bank classification.
- Subscription entitlement checks.
- Idempotency behavior.

### 15.2 Integration tests

For every tenant-sensitive endpoint, test:

1. User A can access Tenant A.
2. User A cannot access Tenant B.
3. A valid ID from Tenant B returns not found or forbidden without leaking information.
4. Related records from another tenant are rejected.
5. Reports include only the active tenant's data.
6. Aggregates cannot cross tenant boundaries.

### 15.3 End-to-end tests

Cover:

- Create workspace.
- Invite member.
- Login and switch workspace.
- Create purchase.
- Create sale.
- Record cash and bank payments.
- Record customer and supplier advances.
- Apply advances to future transactions.
- View dashboard and reports.
- Upgrade/downgrade subscription.
- Reach and recover from usage limits.
- Cancel a subscription without losing data.

### 15.4 Security tests

Include automated checks for:

- Broken object-level authorization.
- Tenant ID tampering.
- Cross-tenant aggregation.
- JWT replay and expiry.
- Password reset token reuse.
- Invitation token reuse.
- Rate-limit bypass.
- NoSQL injection in filters.
- Search regex abuse.
- Export authorization.

---

## 16. Delivery Phases

### Phase 0: Freeze and baseline

- Freeze the current single-company release.
- Tag a known-good version.
- Back up the database.
- Capture current reports, balances, inventory, and payment totals.
- Document current API behavior.

### Phase 1: Tenant foundation

- Add Tenant and Membership models.
- Add tenant context middleware.
- Add `tenantId` to every tenant-owned model.
- Add tenant-safe indexes.
- Migrate the existing company's data into one tenant.
- Add cross-tenant integration tests.

### Phase 2: SaaS identity

- Add signup, email verification, invitations, membership management, and workspace selection.
- Replace global roles with membership roles.
- Add session and password-reset improvements.

### Phase 3: Tenant-aware operations

- Make all services tenant-aware.
- Verify sales, purchases, payments, advances, ledgers, FIFO, voids, and reports.
- Add tenant settings for currency, timezone, numbering, and locale.

### Phase 4: Billing and entitlements

- Integrate a billing provider.
- Add plans, subscriptions, webhooks, grace periods, and entitlements.
- Add usage limits and owner billing screens.

### Phase 5: SaaS frontend

- Add workspace identity and switching.
- Add tenant-aware query keys and cache clearing.
- Add onboarding, invitations, billing, usage, and plan states.
- Add mobile and responsive verification for all workspace flows.

### Phase 6: Production hardening

- Add observability, backups, restore drills, security testing, load testing, and support workflows.
- Run a pilot with a small number of tenants.
- Compare all financial reports against the baseline and migration results.

---

## 17. Definition of Done

The SaaS migration is not complete until all of the following are true:

- Every tenant-owned document has a required tenant boundary.
- Every query, aggregation, transaction, job, export, and report is tenant-scoped.
- Cross-tenant access tests pass.
- Tenant-scoped unique indexes are deployed.
- User roles are membership-scoped.
- Tenant onboarding is idempotent.
- Billing webhooks are idempotent.
- Subscription entitlements are enforced server-side.
- Current company data has been migrated and reconciled.
- Customer and supplier advances reconcile correctly.
- FIFO inventory remains correct per tenant.
- Cash/bank receipts remain correct per tenant.
- Date reports respect tenant timezone.
- Tenant cache data cannot leak during workspace changes.
- Backups and restore procedures have been tested.
- Audit logs cover financial and access-sensitive actions.
- Support access is controlled and auditable.
- A pilot tenant has completed real operational workflows successfully.

---

## 18. Recommended First Engineering Tasks

Start implementation in this order:

1. Create Tenant, Membership, Invitation, Plan, and Subscription design documents.
2. Add a tenant context contract without changing business behavior yet.
3. Write cross-tenant authorization tests before migrating models.
4. Add `tenantId` migration scripts and compound indexes.
5. Refactor one vertical slice end to end: customers, customer payments, and customer advances.
6. Refactor purchases, batches, supplier payments, and supplier advances.
7. Refactor sales, FIFO allocations, and customer advance application.
8. Refactor reports and dashboard aggregates.
9. Add workspace-aware frontend session and query keys.
10. Add billing only after tenant isolation and financial reconciliation are proven.

Do not begin with pricing screens or marketing pages. The highest-risk work is tenant isolation around financial transactions, inventory, balances, advances, and reports.
