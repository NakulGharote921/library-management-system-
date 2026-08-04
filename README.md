# Lumina Library Management System

> A production-grade Enterprise Library Management System (ELMS) with JWT-based authentication, role-based access control, subscription plans, fine management, Razorpay payments, and real-time analytics.

## Overview

Lumina Library is a full-stack web application that digitizes and automates library operations. It replaces manual bookkeeping with a modern, role-aware platform where library staff and members interact seamlessly. Built for university libraries, public libraries, and private collections that need a robust, scalable solution with fine-grained access control and financial transaction support.

The system handles the complete book lifecycle — acquisition, cataloging, lending, returns, renewals, reservations, fine calculation, and subscription management — while providing rich analytics and audit trails for administrators.

## Key Features

- **Role-Based Access Control** — Role-based security model (Admin, Member) with JWT-based stateless authentication
- **Book Lifecycle Management** — CRUD operations, cataloging by category/author/publisher, ISBN tracking, shelf location mapping
- **Issue & Return System** — Member send-borrow-request → admin approval workflow with in-app + email notifications, due-date tracking, renewal limits, and automatic overdue detection
- **Fine Engine** — Auto-calculated overdue fines, manual/waved fines, Razorpay payment gateway integration
- **Reservation & Waitlist** — FIFO queue-based reservation with WAITING → READY_FOR_PICKUP → COMPLETED/EXPIRED lifecycle, 48-hour pickup hold, position tracking, in-app + email notifications
- **Subscription Plans** — Tiered service plans (Silver, Gold, Premium, Student) with configurable borrowing limits, loan durations, and fine exemptions
- **Wishlist** — Persistent per-user book wishlist with unique constraints
- **Analytics Dashboard** — Real-time stats on books, members, loans, revenue, subscription distribution, and most-borrowed titles
- **Audit Logging** — Comprehensive activity tracking for enterprise compliance
- **Dark Mode** — Theme toggle persisted to localStorage with full Tailwind CSS dark-mode support
- **Search & Pagination** — Advanced book/user search with paginated, filterable results
- **Responsive Design** — Mobile-first layout with collapsible sidebar and adaptive grid

## Screenshots

![Home](docs/images/home.png)

![Dashboard](docs/images/dashboard.png)

![Book Management](docs/images/books.png)

![Analytics](docs/images/analytics.png)

## Project Architecture

The application follows a **client-server architecture** with a decoupled frontend and backend communicating over RESTful JSON APIs.

```
┌─────────────────────┐       ┌─────────────────────────────────────────┐
│   React SPA (Vite)  │       │     Spring Boot 3.2 REST API           │
│                     │ HTTP  │                                         │
│  Tailwind CSS UI    │◄─────►│  Security Layer (JWT + BCrypt)         │
│  Redux Toolkit      │       │  Service Layer (Business Logic)         │
│  Axios HTTP Client  │       │  Data Layer (JPA / Hibernate)          │
│  React Router DOM   │       │  Payment Gateway (Razorpay SDK)         │
└─────────────────────┘       └──────────────────┬──────────────────────┘
                                                  │
                                        ┌─────────▼─────────┐
                                        │   MySQL 8.0        │
                                        │   (InnoDB / UTF-8) │
                                        └───────────────────┘
```

The backend enforces all business rules and security constraints. The frontend is role-aware, rendering different navigation and UI elements based on the authenticated user's role.

## Folder Structure

```
library-management-system/
├── .github/                          # GitHub workflows & tooling
│   └── modernize/java-upgrade/       # Java upgrade automation scripts
├── docs/
│   └── PRD.md                        # Product requirements document
├── library-management/               # Spring Boot backend (port 8081)
│   └── src/main/java/com/library/
│       ├── config/                   # SecurityConfig, CORS config
│       ├── controller/               # 12 REST controllers
│       ├── dto/                      # Request/response DTOs
│       ├── entity/                   # 9 JPA entities
│       ├── exception/                # Global exception handler
│       ├── repository/               # Spring Data JPA repositories
│       ├── security/                 # JWT provider, filter, UserDetails
│       ├── service/                  # Business logic services
│       └── scheduler/                # Cron jobs (subscription expiry)
├── library-frontend/                 # React frontend (port 3000)
│   ├── public/                       # Static assets
│   ├── scripts/                      # Build & deployment scripts
│   └── src/
│       ├── components/               # Reusable UI components
│       ├── constants/                # Branding & app constants
│       ├── layout/                   # AppLayout, Navbar, Sidebar
│       ├── pages/                    # 20 page components
│       ├── services/                 # API client & auth service
│       └── store/                    # Redux slices (auth, ui)
├── Row Data/                         # Data export directory
└── README.md
```

## Installation

### Prerequisites

- Java 17+
- Maven 3.9.6+
- Node.js 18+ & npm
- MySQL 8.0

### Step 1: Clone the repository

```bash
git clone https://github.com/your-username/library-management-system.git
cd library-management-system
```

### Step 2: Database setup

```bash
mysql -u root -p -e "CREATE DATABASE library_dbg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Step 3: Configure backend

Edit `library-management/src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/library_dbg?zeroDateTimeBehavior=CONVERT_TO_NULL&serverTimezone=UTC&allowPublicKeyRetrieval=true&useSSL=false
spring.datasource.username=root
spring.datasource.password=your_password
spring.sql.init.mode=always
jwt.secret=your-256-bit-jwt-secret-key-here-minimum-32-chars
razorpay.key-id=your_razorpay_key_id
razorpay.key-secret=your_razorpay_key_secret
```

### Step 4: Start the backend

```bash
cd library-management
mvn spring-boot:run
```

The API starts at `http://localhost:8081/api`.

### Step 5: Start the frontend

```bash
cd library-frontend
npm install
npm run dev
```

The app opens at `http://localhost:3000`.

## Environment Variables

### Backend (`application.properties`)

| Variable | Default | Description |
|---|---|---|
| `server.port` | `8081` | API server port |
| `spring.datasource.url` | `jdbc:mysql://localhost:3306/library_dbg` | MySQL connection string |
| `spring.datasource.username` | `root` | Database username |
| `spring.datasource.password` | — | Database password |
| `jwt.secret` | — | JWT signing key (min 32 chars) |
| `jwt.expiration-ms` | `86400000` | JWT validity (24 hours) |
| `fine.rate-per-day` | `5` | Overdue fine amount per day |
| `razorpay.key-id` | — | Razorpay API key ID |
| `razorpay.key-secret` | — | Razorpay API secret key |

### Frontend (`.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8081/api` | Backend API base URL |
| `BACKEND_URL` | — | Netlify proxy backend URL (production) |

## Usage

### For Library Members

1. **Register** an account at `/register`
2. **Browse** the book catalog and search by title or author
3. **Borrow** available books — the system checks your subscription limits
4. **Return** books before the due date to avoid fines
5. **Reserve** books that are currently checked out and join the waitlist
6. **Pay fines** online via Razorpay if any overdue charges apply
7. **Manage your wishlist** and track reading history
8. **Upgrade your subscription** to unlock higher borrowing limits and premium features

### For Administrators

Administrators handle the full staff workflow and platform governance:

1. **Manage books** — add, update, delete, and catalog items
2. **Approve borrow/return requests** and issue books to members with due-date tracking
3. **Process returns** — the system automatically calculates overdue fines
4. **Manage members** — view profiles, borrowing history, and fine status
5. **View reports** on circulation, overdue items, and popular titles
6. **Manage subscription plans** — create, update, retire plans with custom pricing and limits
7. **Waive fines** — discretionary fine waiving with audit trail
8. **Access analytics** — full system analytics with revenue tracking and subscription distribution
9. **View audit logs** — complete activity log for compliance
10. **System configuration** — manage settings and global parameters

## User Roles

| Role | Capabilities |
|---|---|
| **MEMBER** | Browse books, borrow/return, reserve, wishlist, pay fines, view own history, manage own subscriptions |
| **ADMIN** | All MEMBER capabilities + manage books, manage members, approve borrow/return requests, issue books, process returns, manage subscription plans, waive fines, full analytics, audit logs, system configuration, role assignment |

## Core Modules

### Authentication Module
JWT-based login/register with BCrypt password hashing. Issues signed tokens with embedded role claims for stateless authorization across all API requests.

### Book Management Module
Full CRUD with catalog metadata (ISBN, publisher, year, language, shelf location, cover image). Supports average rating tracking and per-copy availability management.

### Circulation Module
Handles book issuing (with subscription-limit enforcement), returns with automatic fine calculation, renewal tracking, and overdue detection.

### Subscription Module
Tiered plan system with configurable parameters (max books, loan days, renewals, priority reservation, fine exemption). Includes plan lifecycle management and auto-expiry via daily scheduler.

### Fine & Payment Module
Auto-generates overdue fines on late returns. Supports manual and waived fines. Integrates with Razorpay for online payment processing with order creation, verification, and webhook handling.

### Reservation Module
Queue-based waitlist system with position tracking. Supports pending, fulfilled, and cancelled states. Prevents duplicate active reservations.

### Analytics Module
Provides role-aware dashboard statistics and full enterprise analytics including book counts, member metrics, loan activity, overdue rates, subscription breakdown, revenue data, and most-borrowed book rankings.

### Wishlist Module
Per-member persistent wishlist with unique (user, book) constraints.

## Workflow

### Book Borrowing Flow
```
Member clicks "Borrow" on an available book → borrow request dialog
    → Member selects Borrow Start Date → system calculates Due Date (start + plan.maxLoanDays)
    → Click "Send Borrow Request" → status PENDING → notification + email to member AND admin
    → Admin reviews request (Member, Book, Start Date, Due Date, Plan, Request Date)
    → Approve: system re-validates, creates loan (Issue Date = requested start date, Due Date per plan),
      decrements inventory (-1 available), notifies + emails member with due date,
      book appears in Member → Issued Books, dashboard/analytics update automatically
    → Reject: status REJECTED with reason, notifies + emails member
```

### Book Return & Fine Flow
```
Member requests return → Admin approves return
    → System checks due date
    → If overdue: Auto-generates Fine(OVERDUE, rate × days)
    → Updates IssuedBook status to RETURNED, increments available copies
    → Member can pay fine via Razorpay
    → Checks reservation queue → nearest WAITING reservation becomes READY_FOR_PICKUP
```

### Reservation Flow
```
Member requests unavailable book → System validates (active membership, no unpaid fines,
    borrow limit, no duplicate, reservation limit)
    → Creates reservation with status WAITING and FIFO queue position
    → Confirmation notification + email
    → When book returned: First WAITING reservation → READY_FOR_PICKUP (48-hour hold)
    → Member borrows (loan created, status COMPLETED) or reservation expires (status EXPIRED)
    → Next queue member selected; analytics updated
```

### Subscription Purchase Flow
```
Member selects plan → Razorpay order created → Member pays on Razorpay checkout
    → System verifies payment signature → Subscription activated
    → Daily scheduler checks expiry → Marks EXPIRED when endDate passes
```

## API Overview

| Category | Base Path | Key Endpoints |
|---|---|---|
| **Auth** | `/api/auth` | `POST /login`, `POST /register`, `GET /me` |
| **Books** | `/api/books` | `GET /`, `GET /{id}`, `POST /`, `PUT /{id}`, `DELETE /{id}`, `GET /search`, `POST /{id}/borrow` |
| **Users** | `/api/users` | `GET /`, `GET /{id}`, `POST /`, `PUT /{id}`, `DELETE /{id}`, `GET /search` |
| **Issued Books** | `/api/issued-books` | `GET /`, `GET /active`, `GET /overdue`, `GET /my`, `POST /issue`, `PUT /return/{id}` |
| **Fines** | `/api/fines` | `GET /`, `GET /my`, `GET /user/{id}`, `POST /{id}/waive` |
| **Payments** | `/api/payments` | `POST /create-order`, `POST /verify`, `GET /my`, `POST /webhook` |
| **Reservations** | `/api/reservations` | `GET /my`, `GET /book/{id}`, `POST /{id}/reserve`, `DELETE /{id}` |
| **Subscriptions** | `/api/subscriptions` | `POST /purchase/{planId}`, `GET /my`, `GET /active`, `POST /{id}/cancel` |
| **Subscription Plans** | `/api/subscription-plans` | `GET /`, `GET /{id}`, `POST /`, `PUT /{id}`, `DELETE /{id}` |
| **Wishlist** | `/api/wishlist` | `GET /`, `POST /{bookId}`, `DELETE /{bookId}` |
| **Analytics** | `/api/analytics` | `GET /` |
| **Dashboard** | `/api/dashboard` | `GET /stats` |

## Database Design

### Entity Relationships

```
User ──1:N──► IssuedBook     (borrower)
User ──1:N──► Fine            (responsible)
User ──1:N──► Reservation     (requester)
User ──1:N──► PaymentTransaction (payer)
User ──1:N──► UserSubscription (subscriber)
User ──1:N──► WishlistItem    (owner)

Book ──1:N──► IssuedBook     (borrowed)
Book ──1:N──► Reservation     (requested)
Book ──1:N──► WishlistItem    (desired)

IssuedBook ──1:N──► Fine      (penalty source)
Fine ──1:N──► PaymentTransaction (settlement)

SubscriptionPlan ──1:N──► UserSubscription (plan assignment)
```

### Key Design Decisions

- **Indexed columns**: `email` (unique), `isbn` (unique), `razorpay_order_id` (unique), `book_id` + `user_id` in join tables
- **Soft references**: Role stored as enum string, status fields as strings for readability
- **Cascading**: `User` → `UserSubscription` uses `CascadeType.ALL` for lifecycle management
- **Audit fields**: `createdAt`, `updatedAt`, `lastLogin` for temporal tracking
- **Unique constraints**: Wishlist prevents duplicate entries at database level

## Security Features

- **Stateless JWT Authentication** — Tokens signed with HMAC-SHA key, 24-hour expiration, role embedded in claims
- **BCrypt Password Hashing** — Spring Security's BCryptPasswordEncoder with configurable strength
- **Role-Based Access Control** — Three-tier authorization enforced at both API gateway (Spring Security filter chain) and service layer (method-level checks)
- **CORS Configuration** — Whitelisted origins (`localhost:*`, `127.0.0.1:*`) with credential support
- **Input Validation** — Jakarta Bean Validation annotations on all DTOs and entities
- **SQL Injection Protection** — JPA parameterized queries throughout
- **XSS Prevention** — Spring Security default headers, JSON response encoding
- **CSRF Protection** — Disabled (stateless JWT architecture)
- **Secure Payment Flow** — Razorpay signature verification on server side, webhook with IPN validation

## Performance Optimizations

- **Lazy Loading** — JPA `FetchType.LAZY` on all collection associations to minimize database queries
- **Pagination** — Server-side pagination on user listing and search endpoints to reduce payload size
- **Indexed Search Columns** — Unique indexes on `email`, `isbn`, `razorpay_order_id` for O(1) lookups
- **Stateless Architecture** — No server-side session overhead; JWT tokens are self-contained
- **Vite Build Optimizations** — Tree-shaking, code splitting, and minified production bundles
- **Tailwind CSS Purge** — Production builds strip unused CSS classes automatically

## Error Handling

- **Global Exception Handler** — Centralized `@ControllerAdvice` catches all exceptions and returns consistent JSON error responses with HTTP status codes
- **DTO Validation Errors** — Field-level validation messages returned in structured format
- **Business Rule Exceptions** — Custom exceptions for subscription limits, overdue status, duplicate reservations, etc.
- **Frontend Error Parsing** — Utility function `getApiErrorMessage()` extracts human-readable messages from backend error responses
- **HTTP Status Mapping** — 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server error)

## Responsive Design

The frontend is built with Tailwind CSS and is fully responsive across:

| Device | Layout Behavior |
|---|---|
| **Desktop (1024px+)** | Full sidebar + navbar with multi-column grids |
| **Tablet (768-1023px)** | Collapsible sidebar, adjusted grid columns |
| **Mobile (<768px)** | Bottom navigation or hamburger menu, single-column layouts |

## Accessibility

- Semantic HTML structure with proper heading hierarchy
- ARIA labels on interactive elements
- Keyboard-navigable forms and menus
- Sufficient color contrast ratios (both light and dark themes)
- Focus indicators on all interactive elements
- Screen-reader-friendly status messages for async operations

## Technologies Used

### Backend

| Technology | Purpose |
|---|---|
| Java 17 | Core language |
| Spring Boot 3.2.5 | Application framework |
| Spring Data JPA / Hibernate | ORM & database access |
| Spring Security | Authentication & authorization |
| jjwt 0.12.5 | JWT token generation & validation |
| MySQL 8.0 | Primary database |
| H2 | Runtime/test database |
| Lombok 1.18.46 | Boilerplate reduction |
| Jakarta Validation | Input validation |
| Razorpay Java SDK 1.4.6 | Payment gateway integration |
| Maven 3.9.6 | Build & dependency management |

### Frontend

| Technology | Purpose |
|---|---|
| React 19.2 | UI framework |
| Vite 8.0 | Build tool & dev server |
| Redux Toolkit 2.12 | State management |
| React Router DOM 7.15 | Client-side routing |
| Axios 1.16 | HTTP client |
| Tailwind CSS 3.4 | Utility-first CSS framework |
| Lucide React 1.14 | Icon library |
| React Hot Toast 2.6 | Toast notifications |

## Project Highlights

- **Enterprise-grade RBAC** with three distinct roles, role-aware frontend navigation, and method-level backend authorization
- **Tiered subscription system** with configurable plans, auto-expiry scheduler, and Razorpay payment integration
- **Real-time fine calculation engine** that auto-generates overdue fines on return with customizable daily rates
- **Queue-based reservation system** with position tracking and fulfillment lifecycle
- **Comprehensive analytics** covering books, members, loans, subscriptions, revenue, and trend data
- **Dark mode** with system-preference detection and persistent user preference
- **Netlify-ready deployment** with automated SPA redirect configuration

## Challenges Solved

| Challenge | Solution |
|---|---|
| **Subscription limit enforcement** during book issuance | Service layer checks `maxBooks` and `maxLoanDays` against current usage before allowing borrow; returns descriptive error on violation |
| **Fine calculation timing** (overdue fines generated only on return, not continuously) | Fine entity generated at return time with precise day calculation; avoids accumulating duplicate fines |
| **Reservation queue ordering** without race conditions | Atomic queue position assignment using count query within transactional context |
| **Razorpay payment verification** on server side | Signature verification using HMAC-SHA256 with Razorpay's key secret; webhook handler for async status updates |
| **Role-aware frontend navigation** without duplicating route components | `ProtectedRoute` + `RoleGuard` wrapper components; sidebar renders conditionally based on `user.role` from Redux store |
| **Auto-expiry of subscriptions** without a full-time job scheduler | Spring `@Scheduled` cron job runs daily at 2 AM; batch-updates expired subscriptions using `endDate < CURRENT_DATE` query |

## Future Improvements

- Email notifications for reservation confirmation, pickup-ready, pickup reminders, expiry, and return-request approvals (SMTP; logs when disabled)
- Barcode/RFID scanning — Mobile app integration for quick check-in/checkout
- **Book cover image upload** — Direct file upload with cloud storage (S3/CDN)
- **Multi-language support** — i18n integration for internationalization
- **Advanced reporting** — Exportable CSV/PDF reports with custom date ranges
- **Two-factor authentication** — TOTP-based 2FA for admin accounts
- **Public catalog API** — Read-only API for external integrations
- **AI-powered recommendations** — Collaborative filtering for book suggestions based on borrowing history
- **Bulk import/export** — CSV-based batch operations for books and members

## Contributing

Contributions are welcome and appreciated. Here's how to contribute:

1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style and naming conventions
- Write unit tests for new service logic
- Ensure all existing tests pass before submitting
- Update API documentation for new endpoints
- Use conventional commit messages

## Testing

### Backend

```bash
cd library-management
mvn test
```

### Frontend

```bash
cd library-frontend
npm test
```

> Note: Test coverage is currently being expanded. Contributions adding test coverage are especially welcome.

## Deployment

### Backend (Spring Boot JAR)

```bash
cd library-management
mvn clean package
java -jar target/library-management-1.0.0.jar --spring.profiles.active=cloud
```

### Frontend (Static build)

```bash
cd library-frontend
npm run build
```

The output in `dist/` can be deployed to any static hosting provider. For **Netlify**, the build script automatically generates a `_redirects` file for SPA routing and API proxying.

### Docker (Coming soon)

Docker Compose configuration for one-command deployment will be added in a future release.

## FAQ

**Q: How do I create an admin account?**
A: Register as a MEMBER first, then update the role to ADMIN directly in the database (`UPDATE users SET role='ADMIN' WHERE email='your@email.com'`). A self-service admin promotion endpoint is planned.

**Q: Can I use a different database?**
A: Yes. Update the `spring.datasource` properties and add the appropriate JDBC driver dependency. PostgreSQL and H2 are directly supported; others require minor configuration changes.

**Q: How do I reset my password?**
A: Password reset is not yet implemented. An admin can update your password hash in the database. Password reset via email will be added in a future release.

**Q: What happens when a subscription expires?**
A: The daily scheduler automatically marks expired subscriptions. The member retains existing borrowed books until their due date but cannot borrow new books beyond the plan's limits until renewing.

**Q: Are late fees calculated automatically?**
A: Yes. Overdue fines are calculated at return time based on the number of overdue days multiplied by the configurable daily rate (`fine.rate-per-day`).

**Q: Can I use Razorpay in test mode?**
A: Yes. Use Razorpay test keys (`rzp_test_*`) in your configuration. The system handles both test and live modes seamlessly.

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

## Author

**Lumina Library** is developed and maintained by the library engineering team.

- GitHub: [@your-username](https://github.com/your-username)
- Website: [lumina-library.dev](https://lumina-library.dev)
- Email: dev@lumina-library.dev

## Support

- **Documentation**: See the `docs/` directory for the product requirements document
- **Issues**: Report bugs or request features via [GitHub Issues](https://github.com/your-username/library-management-system/issues)
- **Discussions**: Join the conversation in [GitHub Discussions](https://github.com/your-username/library-management-system/discussions)
- **Security disclosures**: Email dev@lumina-library.dev for sensitive security reports

## Acknowledgements

- Spring Boot team for the excellent framework ecosystem
- React and Vite teams for the frontend tooling
- Razorpay for the payment gateway SDK
- Tailwind CSS for the utility-first CSS framework
- All open-source contributors whose libraries made this project possible

## GitHub Stats Badges

![License](https://img.shields.io/github/license/your-username/library-management-system)
![Stars](https://img.shields.io/github/stars/your-username/library-management-system)
![Forks](https://img.shields.io/github/forks/your-username/library-management-system)
![Issues](https://img.shields.io/github/issues/your-username/library-management-system)
![Pull Requests](https://img.shields.io/github/issues-pr/your-username/library-management-system)
![Last Commit](https://img.shields.io/github/last-commit/your-username/library-management-system)
![Repository Size](https://img.shields.io/github/repo-size/your-username/library-management-system)
"# E-Library-Management-System" 
