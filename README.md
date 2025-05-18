<!-- PROJECT TITLE / BADGES ------------------------------------------------->
<h1 align="center">
  🚀  URGENT2KAY
</h1>
<h2 align=center>URGENT-2KAY---Directed-Bill-Payment-System for accountability and ease of payment</h2>

<p align="center">
  End-to-end platform for creating bills &amp; bundles, collecting payments
  through Paystack, and paying multiple service providers in one shot with
  secure bulk transfers.<br />
  <i>TypeScript · Node · express · Prisma · postgreSQL · React · Solidity · Ethers.js</i>
  <p> This github repository contains only the backend and web3 implementation</p>
</p>

<p align="center">
  <a href="https://urgent-2kay-directed-bill-payment-system-rss6.onrender.com"><b>Live API</b></a> •
    <a href="https://web-dash-spark.vercel.app/"><b>Live link (Frontend)</b></a> •
  <b>License</b>: MIT
</p>

---

## 📑 Table of Contents
1. [Why this project?](#-why-this-project)
2. [Tech-stack](#-tech-stack)
3. [Quick-start](#-quick-start)
4. [API Reference](#-api-reference)
5. [Development guide](#-development-guide)
6. [Smart-contract layer](#-smart-contract-layer)
7. [Frontend](#-frontend)
8. [Contributing](#-contributing)
9. [Credits](#-credits)

---

## 🌟 Why this project?
> Traditional bill platforms stop once money leaves the customer.  
> **We go further** – bundling bills, holding payments in escrow, then blasting
> *AI-optimised bulk transfers* to every service provider in a single click.

Core workflow  
```

Auth ➡ Bill Creation ➡ Bundle (Request) ➡ Email Notif. ➡ Checkout
➡ Accept Payment (Paystack) ➡ Bulk Transfer (batched)

````

---

## 🛠️ Tech stack
| Layer            | Tooling / Libraries                                                      |
|------------------|---------------------------------------------------------------------------|
| **Backend**      | Node 20 · TypeScript · ts-node-dev · Express · Prisma ORM · PostgreSQL   |
| **Payments**     | Paystack REST APIs (single & bulk)                                       |
| **Smart-contracts** | Solidity (Hardhat) · Ethers.js (for on-chain proofs – optional)       |
| **Frontend**     | React 18 · Vite · Axios · TailwindCSS                                    |
| **Auth & Security** | bcrypt · JWT · Helmet · CORS                                          |
| **DX**           | ESLint · Prettier · Husky + lint-staged · GitHub Actions (CI)            |

---

## ⚡ Quick start

```bash
# 0. Clone & install
git clone https://github.com/<your-org>/directed-bill-payment.git
cd backend && npm i
# 1. Environment
cp .env.example .env     # fill DATABASE_URL, PAYSTACK_SECRET_KEY, JWT_SECRET ...
# 2. DB & Prisma
npx prisma db push       # or `prisma migrate dev` in dev
# 3. Seed (optional)
npm run seed
# 4. Run dev API
npm run dev              # ts-node-dev watches & reloads
# 5. Frontend
cd ../frontend && npm i && npm run dev
````

---

## 📡 API reference

Base URL → `https://urgent-2kay-directed-bill-payment-system-rss6.onrender.com`

Every protected route expects

```http
Content-Type: application/json
Authorization: Bearer <JWT>
```

<details>
<summary>Auth</summary>

| Action   | Route                 | Body (⇢JSON)                         | Response  |
| -------- | --------------------- | ------------------------------------ | --------- |
| Register | `POST /auth/register` | `{"name","email","password","role"}` | 201 + JWT |
| Login    | `POST /auth/login`    | `{"email","password"}`               | 200 + JWT |
| Logout   | `POST /auth/logout`   | –                                    | 200       |

</details>

<details>
<summary>Transactions</summary>

#### Single Transfer

`POST /transaction/transfer`

```jsonc
{
  "name": "Nzubechukwu Akpamgbo",
  "account_number": "1481517168",
  "bank_name": "Access Bank",
  "amount": 100,
  "reason": "Salary payment for April"
}
```

Returns Paystack's transfer object (status `success | pending`).

#### Accept-payment (Paystack checkout)

`POST /transaction/accept-payment`

```json
{ "email": "user@mail.com", "amount": 1000 }
```

Returns `authorization_url`, `access_code`, `reference`.

#### Airtime

`POST /transaction/airtime`

```json
{ "phone": "08012345678", "amount": 500, "network": "MTN" }
```

</details>

<details>
<summary>Bulk flow (MVP)</summary>

1. **Create recipients**
   `POST /api/recipients/bulk`

```json
[
  { "name": "DSTV", "account_number": "1481517168", "bank_code": "044", "currency": "NGN" },
  { "name": "NEPA", "account_number": "8039154732", "bank_code": "999991", "currency": "NGN" }
]
```

Each entry is created on Paystack (`transferrecipient`) then persisted in `Transfer` table with a **unique `reference`** and Paystack `recipientCode`.

2. **Bulk transfer**
   `POST /api/bulk-transfer`   *(no body)*

Server queries `Transfer` rows **with amount > 0 & status ≠ success**, groups ≤ 100, fires `/transfer/bulk`.
Response:

```json
{
  "message": "Bulk transfer executed successfully",
  "batchId": "cmarkmunl0000ytnciteegg62",
  "transfers": [
    { "reference": "...", "recipient":"RCP_...", "amount":1000, "transfer_code":"TRF_...", "status":"success" }
  ]
}
```

Everything is stored in `Batch` & `BulkTransfer` tables and each `Transfer` row is updated.

</details>

Full bill & request endpoints are documented in [`docs/API.md`](./docs/API.md).

---

## 🧑‍💻 Development guide

### Scripts (backend)

| Script                  | Description                  |
| ----------------------- | ---------------------------- |
| `npm run dev`           | ts-node-dev with auto-reload |
| `npm run build`         | tsc compile to `dist`        |
| `npm run start`         | node `dist/index.js`         |
| `npm run prisma:studio` | Visual DB explorer           |
| `npm run test`          | Vitest + Supertest (API)     |

### Important Folders

```
backend/
├─ src/
│  ├─ controllers/      # route handlers
│  ├─ services/         # business logic (Paystack, Prisma)
│  ├─ jobs/             # cron / queue like bulk-transfer scheduler
│  ├─ lib/              # axios Paystack instance, helpers
│  └─ routes/
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
```

---

## ⛓️ Smart-contract layer

> *Optional* – proves bundle payments on-chain.

1. `contracts/BundleEscrow.sol` – receives hash of each paid bundle.
2. Deployed to Polygon Amoy (testnet).
3. Backend signs & sends via Ethers.js after successful Paystack webhook.

```bash
cd contracts
npx hardhat test
npx hardhat run scripts/deploy.ts --network amoy
```

Frontend fetches proofs and shows "⚡ on-chain verified".

---

## 🖥️ Frontend

Located in `/frontend`.

```bash
npm run dev        # Vite dev server
npm run build      # production build
```

* React-Query for API calls
* TailwindUI components
* Zustand for lightweight state
* `@shadcn/ui` & `lucide-react` icons

---

## 🤝 Contributing

1. Fork → `git checkout -b feature/my-thing`
2. Commit with Conventional Commits
3. `npm run lint && npm test`
4. Push & open PR to **develop**
5. Fix merge conflicts (`git pull origin develop`) then squash-merge.

---

## 🙏 Credits

Built by **Learnable 24 group2 interns** and developed by the contributors on this repo and on the frontend repo.
Special thanks to Paystack DevRel and the open-source community.

---

<p align="center">
  <b>Happy coding &nbsp;🎉</b>
</p>

---

# Directed Bill Payment System

## Controller Consolidation Notice

**IMPORTANT**: We have consolidated the bill controllers in this system to simplify the architecture and remove duplication.

### Changes Made:

1. **Merged Controllers**: 
   - `bills.controller.ts` (plural) functionality has been moved into `bill.controller.ts` (singular)
   - Added blockchain bill creation capabilities to the unified controller

2. **Consolidated Routes**:
   - All bill operations now go through `/api/bills` routes
   - Removed the redundant `/bills` routes
   - Added a new route for blockchain-specific operations: `/api/bills/blockchain`

3. **Authentication**:
   - All bill operations now require authentication
   - Bills are tied to a user account using `req.user?.id` from the auth middleware

### API Endpoints

- **Regular Bills**:
  - `POST /api/bills` - Create a regular bill
  - `GET /api/bills` - Get all bills with optional filters
  - `GET /api/bills/:id` - Get a specific bill by ID
  - `PUT /api/bills/:id` - Update a bill
  - `DELETE /api/bills/:id` - Delete a bill

- **Bill Sponsorship**:
  - `POST /api/bills/:billId/sponsor` - Sponsor a bill

- **Blockchain Bills**:
  - `POST /api/bills/blockchain` - Create a blockchain-specific bill

- **Blockchain Operations**:
  - Blockchain-specific operations are still available through `/blockchain/*` routes

### Implementation Notes

- Blockchain bills use the `as any` typing workaround to avoid TypeScript errors with the Prisma schema
- The consolidated controller properly accounts for different bill types and categories
- Filtering by payment method and category is supported across all bill types

## Development

[Your existing instructions here]