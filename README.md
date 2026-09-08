# Restaurant Management System

A full-stack restaurant management web application designed for a single restaurant. Customers can scan a table QR code to browse the menu and place orders, while restaurant staff manage orders, kitchen workflows, billing, employees, promotions, reports, and store settings from an admin dashboard.

> **Project focus:** Full-stack development, business workflow design, role-based access control, database design, and production-oriented application architecture.

## Key Features

### QR Ordering
- Unique QR code for each table
- Mobile-friendly customer menu
- Menu search and category filtering
- Shopping cart and item notes
- Orders are automatically associated with the customer's table

### Order & Kitchen Management
- Order board with workflow statuses
- Kitchen queue for food preparation
- Order status tracking from pending to served
- New-order notifications across the admin dashboard

### Billing & Cashier
- Combine active orders by table
- Calculate discounts, VAT, and service charge
- Support cash, bank transfer, PromptPay, and card payment records
- Close table sessions after billing
- Receipt preview, bill history, filtering, and printing

### Menu, Promotions & Tables
- CRUD management for food categories and menu items
- Multiple images per menu item
- Cloudinary image storage for production
- Promotion rules with fixed or percentage discounts
- Minimum-order and promotion stacking conditions
- Table and QR code management

### Staff & Access Control
- Employee and position management
- Wage types: daily, hourly, and monthly
- Role-based access control (RBAC)
- Configurable permissions for dashboard modules
- Account activation/deactivation and credential management

### Reports & Audit Logs
- Sales reporting dashboard
- Date-based report filters
- Activity audit logs
- Pagination and log retention management

## Core Workflow

```text
Customer scans table QR
        ↓
Browse menu & place order
        ↓
Restaurant receives order
        ↓
Kitchen prepares items
        ↓
Cashier combines table orders
        ↓
Billing & payment record
        ↓
Receipt / bill history
```

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js App Router / API Routes |
| Database | PostgreSQL, Prisma ORM |
| Authentication | JWT Cookie Authentication, jose, bcryptjs |
| Image Storage | Cloudinary |
| Charts | Recharts |
| QR Code | qrcode |
| Infrastructure | Docker, Docker Compose |

## Engineering Highlights

- Designed the application around real restaurant workflows instead of isolated CRUD screens.
- Implemented role-based access for `OWNER`, `MANAGER`, `CASHIER`, `KITCHEN`, and `STAFF` users.
- Built transactional billing logic to prevent completed table sessions from mixing with new orders.
- Added order status history and audit logging for operational traceability.
- Integrated Cloudinary with local-storage fallback for development environments.
- Designed responsive customer ordering for mobile devices and dedicated interfaces for admin, kitchen, and cashier workflows.
- Handled Bangkok timezone behavior for billing, promotions, and historical records.

## Main Roles

| Role | Responsibility |
| --- | --- |
| `OWNER` | Full restaurant administration |
| `MANAGER` | Operational and staff management |
| `CASHIER` | Orders, billing, and bill history |
| `KITCHEN` | Kitchen queue and order preparation |
| `STAFF` | Assigned operational functions |

## Project Status

The core end-to-end workflow is implemented, including QR ordering, order management, kitchen operations, billing, menu management, staff access control, sales reports, and audit logs.

The project is being maintained as a portfolio and practical full-stack system demonstrating how business requirements can be translated into an operational web application.

---

**Developed by [NinePK](https://github.com/NinePK)**
