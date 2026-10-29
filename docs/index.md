# Ocean Enterprises — Documentation Index

Welcome to the official documentation for the **Ocean Enterprises Business Management System** — a full-stack operations, dispatch, inventory, and financial ledger platform built for packaged drinking water supply and wholesale beverage distribution.

- **Live Production Website**: [https://ocean-enterprises.vercel.app/](https://ocean-enterprises.vercel.app/)
- **In-App Help & Documentation Center**: [https://ocean-enterprises.vercel.app/docs](https://ocean-enterprises.vercel.app/docs)
- **GitHub Repository**: [https://github.com/alicharolia7869/ocean-enterprises](https://github.com/alicharolia7869/ocean-enterprises)

---

## Documentation Map

### 1. Product, Business & Operator Guides
| Document | Audience | Description |
| :--- | :--- | :--- |
| **[Business Overview](business-overview.md)** | Owners, Operators, Analysts | Explains Ocean Enterprises' real-world water & beverage distribution workflows and how each operational stage is modeled in the software. |
| **[Feature Inventory](features.md)** | Product, QA, Engineers | Complete catalog of implemented features, UI locations, data mutations, validation rules, limitations, and verification status. |
| **[User Guide](user-guide.md)** | Plant Operators, Dispatchers, Admins | Step-by-step instructions for signing in, logging 10-second water entries, parsing WhatsApp orders, managing routes, collecting payments, and exporting reports. |

### 2. Architecture, Database & API Specifications
| Document | Audience | Description |
| :--- | :--- | :--- |
| **[System Architecture](system-architecture.md)** | Engineers, Architects | End-to-end architecture, frontend-to-backend request lifecycle, dual-entry Express setup (`server/index.js` & `api/index.js`), and Mermaid diagrams. |
| **[Database Design](database-design.md)** | Database & Backend Engineers | Complete PostgreSQL schema (9 tables), dual-mode JSON store adapter (`server/db/database.js`), SQL dialect normalization, and FIFO payment allocation logic. |
| **[API Reference](api-reference.md)** | Frontend & Integration Engineers | Exhaustive documentation of all 33 REST endpoints across 10 route modules, including request payloads, query parameters, status codes, and response shapes. |
| **[Authentication & Security](authentication-and-security.md)** | Security & Backend Engineers | JWT token lifecycle, `JWT_SECRET` production enforcement, flexible identifier login matching, password hashing (`bcryptjs`), and public vs. protected settings. |

### 3. Development, Deployment & Operations
| Document | Audience | Description |
| :--- | :--- | :--- |
| **[Local Development](local-development.md)** | Developers | Local prerequisites, installation, npm scripts, running with the JSON fallback vs. PostgreSQL, and frontend proxy configuration. |
| **[Environment Configuration](environment-configuration.md)** | Developers, DevOps | Detailed reference for `DATABASE_URL`, `POSTGRES_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV`, and SSL/pool tuning variables. |
| **[Deployment Guide](deployment-guide.md)** | DevOps, Maintainers | Vercel production deployment workflow, rewrite rules (`vercel.json`), database migration execution, and post-deploy smoke tests. |
| **[Testing & Validation](testing-and-validation.md)** | QA, Developers | Structure of the 60-test automated suite (`test/suite.test.js`), frontend lint checks (`oxlint`), and how to run verification safely. |
| **[Troubleshooting](troubleshooting.md)** | Operators, Developers | Root causes and fixes for login `401`/`503` errors, database connection issues, filter visibility, and Vercel routing problems. |
| **[Maintenance & Recovery](maintenance-and-recovery.md)** | Administrators, DBAs | Routine database maintenance, idempotent schema migrations, sequence counter alignment, inventory reconciliation, and backup/restore steps. |
| **[Changelog](changelog.md)** | All Stakeholders | Verified history of application releases, bug fixes, security hardening, and documentation updates. |

---

## Relationship Between GitHub Docs and the Website Help Center (`/docs`)

Ocean Enterprises provides two complementary documentation experiences that describe the exact same system:

1. **GitHub Documentation (`README.md` + `docs/*.md`)**:
   - Contains both **operator guides** and deep **engineering references** (SQL schemas, internal file paths, environment variables, API contracts, security architecture, and deployment runbooks).
2. **Website Help & Documentation Center (`/docs`)**:
   - Built directly into the React application ([`client/src/pages/DocumentationCenter.jsx`](../client/src/pages/DocumentationCenter.jsx) and [`client/src/data/docsContent.js`](../client/src/data/docsContent.js)).
   - Accessible at `/docs`, `/docs/getting-started`, `/docs/user-guide`, `/docs/features`, `/docs/troubleshooting`, and `/docs/faq` — both from the **Sign-In page** (for users needing sign-in help) and from the **Sidebar / Header navigation** inside the authenticated workspace.
   - Focuses on user-facing workflows, feature guides, FAQs, and operator troubleshooting without exposing internal infrastructure secrets or database credentials.

