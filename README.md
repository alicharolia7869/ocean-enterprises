# 🌊 Ocean Enterprises — Business Management System
### Water Supply & Beverage Distribution Operations Platform

[![Vercel Deployment](https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel)](https://ocean-enterprises.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> 🚀 **Live Production Application**: **[https://ocean-enterprises.vercel.app](https://ocean-enterprises.vercel.app)**

An enterprise-grade, high-velocity operational command center and CRM designed specifically for water supply plants, 20L packaged drinking water vendors, and beverage wholesale distributors.

---

## 🌟 Key Highlights & Capabilities

### 1. 📊 Operations & Distribution Command Center
* **Real-Time KPIs**: Live counters for Today's Total Orders, 20L Jars Delivered, Beverage Cases Sold, Active Deliveries, Today's Collected Revenue, and Outstanding Receivables.
* **Plant Status Monitor**: Instant synchronization with operations and delivery vans.
* **High-Speed Action Grid**: 1-click tactile navigation cards to log deliveries, process orders, and manage inventory.

### 2. 💧 10-Second Rapid Water Supply Entry
* Tailored specifically for fast-paced loading docks and delivery drivers.
* **3D Tactile Quick-Tap Stepper Buttons**: Instant volume additions (`+1`, `+2`, `+5`, `+10`, `Reset`).
* **Auto-Rate Calculation**: Automatically calculates totals based on customer-specific or standard jar rates (₹35/jar default).
* **Instant WhatsApp Slip**: 1-click action to generate and dispatch formatted delivery receipts to customers directly via WhatsApp.

### 3. 📱 WhatsApp Order Processing Engine (NLP Parser)
* Accepts unstructured plain text orders received over WhatsApp (e.g. *"2 water bottles, 3 Thums Up, 2 Appy Fizz"*).
* **Smart Natural Language Parser**: Automatically detects product names, matches catalog items, extracts quantities, calculates totals, and drafts the order ready for 1-click confirmation.
* Supports **Accept Order**, **Mark Paid**, and **Generate WhatsApp Invoice** actions.

### 4. 🗺️ Delivery Route Board & Interactive GPS Map
* Interactive OpenStreetMap powered by Leaflet.
* **Numbered Stop Sequence**: Visual delivery drop pins (`Stop #1`, `Stop #2`, `Stop #3`...).
* **Turn-by-Turn Navigation**: 1-tap redirect to Google Maps with pre-filled destination coordinates for drivers.
* Real-time delivery status updates: *New Order* ➔ *Confirmed* ➔ *Preparing* ➔ *Out for Delivery* ➔ *Delivered*.

### 5. 👥 Customer Management & Monthly Ledgers
* Directory categorized by *Restaurant*, *Office*, *Shop*, and *Residential*.
* **Live Geolocation Capture**: "Use Current Location" button for delivery teams to pin exact customer shop coordinates via mobile GPS.
* **Financial Accounts & Monthly Ledger**: View historical delivery records, daily breakdown of jars received, payments made, and current balance.
* **1-Click WhatsApp Payment Reminder**: Automatically formats and sends an overdue reminder with UPI details.

### 6. 📦 Inventory & Stock Alerts
* Low-stock warnings when inventory drops below safety thresholds.
* Real-time tracking of units sold, available stock, and cost vs. profit margins.

### 7. 📈 Financial Reports & Multi-Format Exports
* Breakdown of cash, online UPI, and pending credit transactions.
* **Export Options**: 1-click downloadable reports in **CSV**, **Excel**, and **Printable PDF Slips**.

---

## 🏗️ Architecture & Tech Stack

```
Ocean/
├── client/                     # Frontend (React 19 + Vite)
│   ├── src/
│   │   ├── components/         # Navigation, Modals, Global Search, UI Cards
│   │   ├── context/            # Auth & State Management
│   │   ├── pages/              # 12 Operational Views (Dashboard, WaterEntry, etc.)
│   │   ├── services/           # REST API client
│   │   └── utils/              # WhatsApp formatters & export helpers
│   ├── index.html              # Outfit + Plus Jakarta Sans Typography
│   └── vite.config.js          # Vite config with /api proxy to Express
├── server/                     # Backend (Node.js + Express 5)
│   ├── data/                   # JSON document data store
│   ├── db/                     # Seed scripts and SQLite migration schemas
│   ├── middleware/             # JWT Authentication & role protection
│   ├── routes/                 # 10 Dedicated REST Route Handlers
│   └── index.js                # Server entry point & static dist server
└── package.json
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js**: v18+ or v20+ recommended
* **npm**: v9+

### 1. Installation
Clone the repository and install root and client dependencies:

```bash
# Clone the repository
git clone https://github.com/alicharolia7869/ocean-enterprises.git
cd ocean-enterprises

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Seed Initial Database & Demo Data
Initialize the catalog, mock customers, and sample transaction history:

```bash
npm run seed
```

### 3. Build the Frontend
```bash
npm run build
```

### 4. Start the Application
```bash
npm start
```

Open your browser and navigate to:
👉 **`http://localhost:5000`**

---

## 🔑 Default Login Credentials

| Role | Email / Phone | Password |
|---|---|---|
| **Admin** | `admin@ocean.com` | `admin123` |

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate and issue JWT token |
| `GET` | `/api/auth/me` | Fetch active user profile |
| `GET` | `/api/dashboard/stats` | Aggregate daily/monthly business KPIs |
| `GET` | `/api/water` | List water supply entries with date filters |
| `POST` | `/api/water` | Rapid water jar entry with instant total |
| `GET` | `/api/customers` | Customer directory with balances & GPS coords |
| `POST` | `/api/customers` | Register customer with live GPS coordinates |
| `GET` | `/api/products` | Inventory catalog and stock alert indicators |
| `GET` | `/api/orders` | Orders list with delivery and payment status |
| `POST` | `/api/orders` | Create standard or parsed WhatsApp order |
| `GET` | `/api/deliveries/route` | Active delivery route ordered by geographic stop |
| `GET` | `/api/payments` | Payment ledger and receivables breakdown |
| `GET` | `/api/reports/summary` | Financial summary, sales by category, top clients |
| `GET` | `/api/health` | System health check and heartbeat |

---

## 📜 License

This project is licensed under the MIT License.
