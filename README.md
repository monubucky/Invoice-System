# 🧾 Invoice & Billing System

A full-stack multi-tenant SaaS application for managing clients, creating invoices, tracking payments, and generating financial reports.

---

## 🚀 Tech Stack

**Frontend**
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (state management)
- React Hook Form + Zod (validation)
- Recharts (analytics)
- Axios

**Backend**
- Node.js + Express + TypeScript
- Prisma ORM
- PostgreSQL
- Redis + BullMQ (job queues)
- JWT Authentication

**Integrations**
- Stripe (online payments)
- SendGrid (email)
- Puppeteer (PDF generation)

**DevOps**
- Docker + Docker Compose
- GitHub Actions (CI/CD)
- AWS EC2 / Railway (backend)
- Vercel (frontend)

---

## ✨ Features

- 🔐 JWT authentication with refresh tokens and role-based access (Admin, Accountant, Viewer)
- 🏢 Multi-tenant architecture — each business has fully isolated data
- 👥 Client management with full invoice history
- 🧾 Invoice lifecycle: Draft → Sent → Viewed → Partially Paid → Paid → Overdue
- 🔁 Recurring invoices (weekly, monthly, yearly) via automated cron jobs
- 💳 Online payments via Stripe Checkout with webhook-driven status updates
- 📄 Branded PDF invoice generation with Puppeteer
- 📧 Automated payment reminder emails via SendGrid (before due, on due, overdue)
- 📊 Analytics dashboard with revenue trends, tax summaries, and top clients
- 📥 CSV export for reports
- 🌐 Public client portal (clients can view and pay invoices via unique link)

---

## 📁 Project Structure

```
invoice-billing-system/
├── frontend/          # Next.js App
├── backend/           # Node.js + Express API
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js v18+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Git](https://git-scm.com)

---

### 1. Clone the Repository

```bash
git clone https://github.com/monubucky/Invoice-System.git
cd Invoice-System
```

---

### 2. Start the Database

Make sure Docker Desktop is running, then:

```bash
docker-compose up -d postgres redis
```

Verify containers are running:

```bash
docker-compose ps
```

---

### 3. Set Up the Backend

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create your `.env` file:

```bash
cp .env.example .env
```

Update the values in `.env`:

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://admin:secret@localhost:5432/invoicedb
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_refresh_secret_key
```

Run Prisma migration:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Start the backend:

```bash
npm run dev
```

Backend will be running at `http://localhost:5000`

Verify:
```bash
curl http://localhost:5000/health
```

---

### 4. Set Up the Frontend

```bash
cd ../frontend
```

Install dependencies:

```bash
npm install
```

Create your `.env.local` file:

```bash
cp .env.example .env.local
```

Update the values:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Frontend will be running at `http://localhost:3000`

---

### 5. Open Prisma Studio (Optional)

To visually inspect your database:

```bash
cd backend
npx prisma studio
```

Opens at `http://localhost:5555`

---

## 🧪 Running Tests

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

---

## 🐳 Run with Docker (Full Stack)

To run the entire application with Docker:

```bash
docker-compose up --build
```

| Service       | URL                      |
|---------------|--------------------------|
| Frontend      | http://localhost:3000    |
| Backend       | http://localhost:5000    |
| Postgres      | localhost:5432           |
| Redis         | localhost:6379           |
| Prisma Studio | http://localhost:5555    |

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint                  | Description                  |
|--------|---------------------------|------------------------------|
| POST   | `/api/auth/register`      | Register new business account|
| POST   | `/api/auth/login`         | Login and receive JWT        |
| POST   | `/api/auth/logout`        | Logout                       |
| GET    | `/api/auth/me`            | Get current user             |
| POST   | `/api/auth/refresh-token` | Refresh access token         |

### Clients
| Method | Endpoint            | Description           |
|--------|---------------------|-----------------------|
| GET    | `/api/clients`      | List all clients      |
| POST   | `/api/clients`      | Create client         |
| GET    | `/api/clients/:id`  | Get client details    |
| PUT    | `/api/clients/:id`  | Update client         |
| DELETE | `/api/clients/:id`  | Soft delete client    |

### Invoices
| Method | Endpoint                       | Description             |
|--------|--------------------------------|-------------------------|
| GET    | `/api/invoices`                | List all invoices       |
| POST   | `/api/invoices`                | Create invoice          |
| GET    | `/api/invoices/:id`            | Get invoice details     |
| PUT    | `/api/invoices/:id`            | Update invoice          |
| DELETE | `/api/invoices/:id`            | Delete invoice          |
| POST   | `/api/invoices/:id/send`       | Send invoice via email  |
| GET    | `/api/invoices/:id/pdf`        | Download PDF            |
| POST   | `/api/invoices/:id/duplicate`  | Duplicate invoice       |

### Payments
| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | `/api/payments`                   | List all payments        |
| POST   | `/api/payments`                   | Record manual payment    |
| POST   | `/api/payments/stripe/checkout`   | Create Stripe session    |
| POST   | `/api/payments/stripe/webhook`    | Stripe webhook           |

### Reports
| Method | Endpoint                  | Description          |
|--------|---------------------------|----------------------|
| GET    | `/api/reports/summary`    | Revenue summary      |
| GET    | `/api/reports/revenue`    | Monthly breakdown    |
| GET    | `/api/reports/clients`    | Top clients          |
| GET    | `/api/reports/tax`        | Tax summary          |
| GET    | `/api/reports/export`     | Export as CSV        |

---

## 🗄️ Database Schema

Key models:
- **Business** — top-level tenant (each user belongs to a business)
- **User** — authenticated users with roles (Admin, Accountant, Viewer)
- **Client** — customers of the business
- **Invoice** — invoice with status lifecycle and line items
- **InvoiceItem** — individual line items on an invoice
- **Payment** — payment records (manual or Stripe)
- **Reminder** — scheduled email reminders for invoices

---

## 🚢 Deployment

### Backend (AWS EC2 / Railway)
```bash
npm run build
node dist/app.js
```

### Frontend (Vercel)
```bash
npm run build
```
Push to `main` branch — Vercel auto-deploys.

### CI/CD
GitHub Actions pipeline runs on every push to `main`:
1. Runs backend tests
2. Builds frontend
3. SSHs into AWS and redeploys via Docker

---

## 🛣️ Roadmap

- [x] Phase 1 — Project Setup
- [x] Phase 2 — Auth & Business Setup
- [x] Phase 3 — Client Management
- [x] Phase 4 — Invoice Management
- [ ] Phase 5 — PDF & Email
- [ ] Phase 6 — Payments & Stripe
- [ ] Phase 7 — Automated Reminders
- [ ] Phase 8 — Dashboard & Reports
- [ ] Phase 9 — Recurring Invoices
- [ ] Phase 10 — Polish & Deployment

---

## 👨‍💻 Author

**Monil Baxi**
- GitHub: [@monubucky](https://github.com/monubucky)
- LinkedIn: [Monil Baxi](https://linkedin.com/in/baxi-monil-explore)

---

## 📄 License

This project is licensed under the MIT License.