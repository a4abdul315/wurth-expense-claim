# Würth Professional Solutions — Expense Claim System

**Candidate:** Abdul Rehman  
**Assessment:** Technical Developer Assessment — June 2026

---

## Live Demo

**No setup required — open this in any browser:**

> **https://wurthassignment.netlify.app/login**

Works on desktop and mobile. To test the mobile layout, open the link on your phone or use browser DevTools → toggle device toolbar (F12 → Ctrl+Shift+M).

---

## Demo Accounts

Click any account on the login page to auto-fill credentials.

| Role | Email | What you see |
|---|---|---|
| Employee | `a.rehman@wurth.ae` | Dashboard, submit expense claims |
| Finance | `k.rashidi@wurth.ae` | Finance queue — approve / reject / mark paid |
| Finance Super | `zk@wuerth-professional.com` | Everything — read-only on all claims & threads |

---

## What to Check

### As Employee (`a.rehman@wurth.ae`)
1. **Submit a claim** → Claims → New Claim → fill in line items → attach a receipt → Submit
2. **View My Claims** → see status badges (Draft / Submitted / Approved / Paid)
3. **Notifications** → bell icon updates when Finance approves/rejects

### As Finance (`k.rashidi@wurth.ae`)
1. **Finance queue** → see all submitted claims
2. **Approve / Reject / Mark Paid** → click the action buttons
3. **Discuss** → slide-in panel with receipts + thread
4. **Export CSV** → downloads all claims as Excel-ready file
5. **PDF** → download Finance PDF for any claim

---

## Run Locally

You need Node.js and MySQL.

```bash
# 1. Clone the repo
git clone https://github.com/a4abdul315/wurth-expense-claim.git
cd wurth-expense-claim

# 2. Backend (port 4000)
cd backend
cp .env.example .env          # add your MySQL password
npm install
npm run db:setup              # creates all tables
npm run db:seed               # inserts demo users + claims
npm run dev

# 3. Frontend (port 3000) — new terminal
cd frontend
npm install
npm run dev

# 4. Open http://localhost:3000
```

---

## Stack

- **Frontend:** Next.js 14 — deployed on Netlify
- **Backend:** Express + Node.js — deployed on Render
- **Database:** MySQL (9 tables)

---

*Würth Professional Solutions LLC · Dubai, UAE*
