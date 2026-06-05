# Würth Professional Solutions
## Expense Claim Management System — Project Report

**Candidate:** Abdul Rehman  
**Assessment Date:** June 2026  
**Project Type:** Technical Assessment — Full-Stack Web Application  
**Status:** Prototype (semi-functional, interview-ready)

---

## 1. Executive Summary

This report documents the design, development, and technical decisions behind the online Expense Claim Management System built for Würth Professional Solutions LLC, Dubai. The system replaces the existing Excel-based expense claim form with a responsive web application that supports multi-currency conversion, receipt capture, Finance team collaboration, and real-time claim tracking.

The prototype is fully functional for demonstration purposes. Every component that would require external infrastructure (Azure AD, AWS S3, email delivery) is mocked with a clear `// PRODUCTION:` comment showing exactly what the real integration would look like.

---

## 2. Problem Statement

The existing Excel-based process had three core problems:

| Problem | Impact | Solution Built |
|---|---|---|
| Manual currency conversion | Errors, Finance re-verification time | Live rates from open.er-api.com, auto-computed AED per line |
| Loose receipt handling | Receipts lost or submitted separately | Camera capture on mobile, drag-and-drop on desktop, attached at submission |
| No workflow or audit trail | No status visibility, no history | Reference numbers, status tracking, Finance review queue, immutable claims |

---

## 3. System Architecture

The system is built as two independently deployable applications:

```
┌─────────────────────────────────────────────────────────┐
│  Browser / Mobile (iOS Safari + Android Chrome)          │
│  Next.js 14 Frontend — port 3000                        │
│  Pure client-side React with Würth branding             │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (NEXT_PUBLIC_API_URL)
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Express Backend — port 4000                            │
│  REST API + Currency Service + PDF Generator            │
│  MySQL (mysql2, no ORM) — wps_expenses database        │
└─────────────────────────────────────────────────────────┘
```

### Frontend — Next.js 14 (App Router)
- Pure client-side rendering — all pages use `"use client"`
- `localStorage` persistence for claims and sessions (mock; replaces database in prototype)
- Live FX rates fetched from Express backend (`/api/currency/rates`)
- Falls back to static rates if backend is offline

### Backend — Express + TypeScript
- Pure `mysql2` — no ORM, plain SQL queries, easy to read
- In-memory fallback store when MySQL is unavailable
- Currency service with live rates from `open.er-api.com` (1-hour cache)
- PDF generation using `pdf-lib` (no headless browser dependency)

### Database — MySQL
- 8 tables: `users`, `expense_claims`, `expense_line_items`, `claim_threads`, `thread_messages`, `thread_participants`, `notifications`, `audit_logs`
- Run `npm run db:setup && npm run db:seed` to initialise
- Connection string: `mysql://root:PASSWORD@localhost:3306/wps_expenses`

---

## 4. Features Built

### Authentication
- Domain-restricted login (`@wurth.ae` and `@wuerth-professional.com`)
- Role-based routing: Finance users land on `/finance`, employees on `/dashboard`
- Two demo accounts on login page for quick testing
- **PRODUCTION:** Azure AD (MSAL) — employees use their existing Microsoft account

### Expense Claim Form (`/claims/new`)
- Mirrors the Excel form structure exactly — 6 categories: Travel, Office Supplies, Meals & Entertainment, Telecommunication, Marketing, Logistics
- Per-line currency selection: AED, USD, EUR, TRY, CNY
- AED conversion is instant (live rates) and displayed per line and as subtotals per category
- Employee details pre-filled from session — name, email, department, IBAN, SWIFT, bank (never typed manually)
- Bank details are **Finance-managed only** — employees cannot edit their own banking information
- Finance reviewer selector — employee chooses one Finance team member; the Finance Super User (Zeeshan Khan) is excluded from this list and has automatic visibility over all claims
- Receipt upload: camera capture (mobile), drag-and-drop (desktop), HEIC→JPEG conversion, image compression
- Reference number generated on submit: `WPS-YYYY-NNNN`

### Finance Dashboard (`/finance`)
- Real-time claim queue — updates every 2 seconds, NEW badge for recent submissions
- Full claim viewer — slide-in detail panel per claim
- **Approve** → status changes to Approved (green notification)
- **Reject** → modal prompts for rejection reason, reason stored permanently
- **Mark as Paid** → final status
- Discussion thread per claim — Finance can invite other Finance members; employees cannot invite
- **Finance Super User** (Zeeshan Khan) has visibility over all claims and all threads automatically
- Export CSV — downloads finance-ready spreadsheet
- PDF export — generates branded Finance report with all line items, FX rates used, bank details

### Notifications
- In-app notification bell — red badge for unread count
- Browser push notifications (Web Notifications API)
- Notification types: new claim assigned, thread message, thread invite, claim approved/rejected/paid

### My Claims (`/claims`)
- Full history with status filter (All / Submitted / Approved / Rejected / Paid)
- Expandable detail per claim — shows status message (e.g. "Awaiting Finance review")
- Live updates — Finance status changes appear without page refresh

---

## 5. Technology Stack & Justification

| Technology | Version | Why chosen |
|---|---|---|
| **Next.js** | 14 | Full-stack React framework. App Router gives clean page structure. Works on Netlify. |
| **TypeScript** | 5 | Financial data must be type-safe. Catches decimal errors at compile time. |
| **Tailwind CSS** | 3 | Würth brand tokens defined once (`#CC0000`). Mobile-first by default. |
| **Express** | 4 | Lightweight backend. Clean routing, easy to read in code review. |
| **mysql2** | 3 | Direct SQL — no ORM magic. Every query is readable and explainable. |
| **pdf-lib** | 1.17 | Pure JavaScript PDF. No Chromium binary. Works in serverless. |
| **heic2any** | 0.0.4 | iPhone HEIC photos converted to JPEG in the browser before upload. |

---

## 6. Security Design

| Concern | Approach |
|---|---|
| Authentication | Corporate domain gate (`@wurth.ae`). PRODUCTION: Azure AD MSAL, never a password. |
| Bank details | Finance-only editable. Employees cannot view or modify their own IBAN/SWIFT. |
| Claim immutability | Once submitted, claims cannot be edited. Protects the audit trail. |
| FX rate audit | The exchange rate used on each line is stored at submission time — reproducible forever. |
| Role enforcement | Finance actions (approve/reject/invite) checked server-side by role. |
| Thread access | Only Finance members can invite to threads. Employees cannot add participants. |
| Finance Super User | Zeeshan Khan (`FINANCE_SUPER`) has read access to all claims and threads but cannot be directly assigned by employees. |

---

## 7. Currency Conversion

Rates are fetched from **open.er-api.com** (free, no API key, updated daily from central bank sources).

```
API gives: 1 AED = 0.2722 USD
We invert: 1 USD = 1 ÷ 0.2722 = 3.67 AED
```

Static fallback rates (used when internet is unavailable):

| Currency | Rate → AED |
|---|---|
| USD | 3.67 |
| EUR | 4.10 |
| TRY | 0.109 |
| CNY | 0.51 |

**Audit compliance:** The exact rate used on each line item is stored in the database at the moment of submission. Finance can always reproduce the original AED total.

**PRODUCTION:** Switch to XE.com API or UAE Central Bank feed by changing one constant in `backend/src/services/currency.service.ts`.

---

## 8. What Is Mocked vs Production-Ready

| Feature | Prototype | Production replacement |
|---|---|---|
| Authentication | localStorage session + domain check | Azure AD MSAL — employees use their Microsoft account |
| User profile | Hardcoded in `lib/mockUser.ts` | Azure AD token + HR system API |
| Data persistence | localStorage (resets on clear) | MySQL via direct SQL (`backend/src/db/`) |
| Receipt files | Browser Blob URLs | AWS S3 private bucket + presigned URLs |
| Email notifications | Logged to console | SendGrid — Finance distribution list + employee confirmation |
| Real-time updates | 2-second polling | Server-Sent Events from backend |
| PDF delivery | HTTP download | Attached to Finance email on submit |
| Claim reference | `Math.random()` client-side | MySQL sequence, server-assigned |

---

## 9. Deployment

### Frontend — Netlify
The `netlify.toml` in the project root configures automatic deployment:
```
Base: frontend/
Build command: npm install && npm run build
Plugin: @netlify/plugin-nextjs
Environment: NEXT_PUBLIC_API_URL = <backend URL>
```

### Backend — Railway / Render
```bash
# Deploy backend to Railway
railway login
railway init
railway up
```
Set `DATABASE_URL` (MySQL), `ALLOWED_DOMAIN`, `FRONTEND_URL` in Railway environment.

### MySQL Database
```bash
npm run db:setup   # creates 8 tables
npm run db:seed    # inserts demo users and claims
```

---

## 10. Future Enhancements

| Priority | Feature | Effort |
|---|---|---|
| 🔴 1 | Azure AD SSO | Replace mock login with `@azure/msal-react` |
| 🔴 2 | PostgreSQL / MySQL production | Replace `store.ts` with real SQL queries — file already written |
| 🔴 3 | Manager approval workflow | Add `MANAGER_APPROVED` status; DB schema designed |
| 🟠 4 | AWS S3 receipt storage | Presigned upload URLs, private bucket |
| 🟠 5 | Email on submit | PDF already built; wire to SendGrid |
| 🟡 6 | OCR receipt reading | Azure Document Intelligence extracts merchant/date/amount |
| 🟡 7 | Spending policy engine | Per-category limits, auto-flag over-limit claims |
| 🟢 8 | Analytics dashboard | Totals by department, category, period |
| 🟢 9 | PWA / offline mode | Service worker + IndexedDB draft storage |

---

## 11. How to Run

```bash
# 1. MySQL (already running)
mysql -u root -p1122334455 -e "USE wps_expenses;"

# 2. Backend (port 4000)
cd backend
npm run dev

# 3. Frontend (port 3000)
cd frontend
npm run dev

# Open → http://localhost:3000
# Employee demo → click "Employee demo" on login page
# Finance demo  → click "Finance demo" on login page
```

---

## 12. Project Structure

```
Würth Assignment/
├── netlify.toml              ← Netlify deployment config
├── README.md                 ← Full technical documentation
├── REPORT.md                 ← This file
├── prisma/schema.prisma      ← MySQL schema reference (Prisma format)
├── frontend/                 ← Next.js 14 (Tailwind, TypeScript)
│   ├── app/                  ← Pages (login, dashboard, claims/new, finance)
│   ├── components/           ← Reusable UI components
│   │   ├── Sidebar.tsx       ← Left sidebar + mobile bottom nav
│   │   ├── ClaimLineItemsForm.tsx  ← Expense table with live AED conversion
│   │   ├── ReceiptUpload.tsx ← Camera / drag-drop / HEIC conversion
│   │   ├── ThreadPanel.tsx   ← Finance discussion thread
│   │   └── NotificationBell.tsx   ← Real-time notifications
│   ├── lib/
│   │   ├── mockUser.ts       ← User store + role-based routing
│   │   └── claimStore.ts     ← localStorage claim persistence
│   └── public/
│       ├── wurth-logo.svg    ← Official Würth brand SVG
│       └── fonts/            ← Licensed Würth typeface files
└── backend/                  ← Express + mysql2 (TypeScript)
    ├── src/
    │   ├── db/
    │   │   ├── connection.ts ← MySQL pool + query helpers
    │   │   ├── setup.ts      ← CREATE TABLE scripts
    │   │   └── seed.ts       ← Demo data
    │   ├── services/
    │   │   ├── currency.service.ts  ← Live FX rates
    │   │   └── pdf.service.ts       ← Finance PDF (pdf-lib)
    │   ├── controllers/      ← auth, claims, finance, currency, thread, notification
    │   └── routes/           ← Express routers
    └── .env                  ← DATABASE_URL, PORT, ALLOWED_DOMAIN
```

---

*Würth Professional Solutions LLC · Trade Center First, Latifa Tower, Marina Pearl Business Center · Dubai, UAE*
