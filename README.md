# Lagos Life Currency Purchasing Platform
> Independent, high-performance, mobile-first virtual currency storefront for the *Lagos Life* simulation game (`lagoslife.app`).

---

## 1. Business Model & Core Principles

- **BUY ONLY:** Strictly virtual currency purchases. No selling, cash-outs, or currency trading.
- **NO THIRD-PARTY PAYMENT GATEWAYS:** Customers pay via direct manual bank transfers in Nigerian Naira (NGN).
- **COPY & PAY CHECKOUT:** Dynamic bank account display with high-reliability 1-click clipboard copy.
- **MANUAL PAYMENT VERIFICATION:** Administrators verify actual bank credit in the business banking app/statement before approving orders. Uploaded payment receipts are supporting evidence only.
- **OWNER-SOURCED GAME INVENTORY:** All virtual cash delivered to customers originates exclusively from the owner's personal *Lagos Life* character account.
- **IN-GAME PHONE SETTINGS REQUIREMENT:** Customers are guided to set their in-game phone setting (*Phone $\rightarrow$ Settings $\rightarrow$ "Who can send me money"*) to **"Anyone"**.

---

## 2. Monorepo Project Structure

```
lagos-life-platform/
├── apps/
│   ├── web/                    # React 19 + Vite + Tailwind CSS Storefront (Cloudflare Pages)
│   │   ├── src/
│   │   │   ├── components/     # UI Components (CheckoutModal, PackageGrid, OrderTracker, Guide)
│   │   │   ├── data/           # Default currency packages and pricing models
│   │   │   ├── utils/          # Clipboard helpers with fallback and haptic feedback
│   │   │   ├── App.tsx         # Main interactive storefront
│   │   │   └── main.tsx        # React entry point
│   │   ├── index.html
│   │   ├── tailwind.config.js
│   │   └── vite.config.ts
│   │
│   └── api/                    # NestJS 11 + Prisma ORM REST API (Render Web Service)
│       ├── prisma/
│       │   └── schema.prisma   # 18+ normalized PostgreSQL tables & audit ledgers
│       └── src/
│           ├── orders/         # Order creation, quotation, and status tracking
│           ├── packages/       # Dynamic package catalog & quote calculator
│           ├── admin/          # Admin dashboard, bank verification, and fulfillment queue
│           ├── prisma/         # Prisma database service
│           └── main.ts         # Bootstrap with Swagger API documentation
│
└── packages/
    └── shared/                 # Shared TypeScript interfaces, OrderStatus enums, and DTOs
```

---

## 3. Local Development Quickstart

### Prerequisites
- Node.js (v20+ LTS or v22+)
- npm or pnpm
- (Optional) PostgreSQL database instance

### Installation
From the root directory (`lagos-life-platform`):
```bash
npm install
```

### Running the Frontend Storefront
```bash
npm run dev:web
```
Access the storefront at: `http://localhost:5173`

### Running the Backend REST API
```bash
npm run dev:api
```
Access the Swagger API documentation at: `http://localhost:3000/api/docs`

---

## 4. Manual Verification & Fulfillment Workflow

1. **Customer Places Order:** Customer selects a currency pack (e.g. 50 Billion for ₦1,000), confirms their in-game privacy setting, and enters their character username.
2. **Copy & Pay:** Customer copies the business bank account number using the COPY button and makes a transfer in their mobile bank app.
3. **Customer Submits Proof:** Customer clicks **"I Have Paid"** and enters their sender account name and bank.
4. **Admin Bank Verification:** Admin checks the business bank mobile app / statement. If funds are cleared, admin clicks **"Verify Payment"** in the admin panel.
5. **In-Game Fulfillment:** Admin logs into the owner's *Lagos Life* character account, opens the in-game banking app, transfers the purchased amount to the customer's username, and marks **"Delivery Completed"**.

---

## 5. Deployment Guide

- **Frontend:** Connected to GitHub $\rightarrow$ Deployed on **Cloudflare Pages** (Build command: `npm run build:web`, Output directory: `apps/web/dist`).
- **Backend:** Connected to GitHub $\rightarrow$ Deployed on **Render Web Service** (Node.js 22 environment, Build command: `npm run build:api`, Start command: `node apps/api/dist/main`).
- **Database:** Render Managed **PostgreSQL 16**.
- **Queue/Cache:** Render Managed **Redis 7**.

---
*Created as part of the Lagos Life Virtual Currency Purchasing Platform Specification.*
