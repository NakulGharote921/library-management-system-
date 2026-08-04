# Enterprise Library Management System

## Product Requirements Document (PRD)

| Document | Details |
|----------|---------|
| **Version** | 1.0 |
| **Status** | Draft |
| **Last Updated** | 2026-07-26 |

---

## 1. Objectives

Build a production-grade Enterprise Library Management System (ELMS) that transforms the current basic CRUD application into a centralized, state-aware ecosystem handling authentication, hierarchical categories, pagination and advanced search, fines and wallet management, subscriptions, reservations, and real-time inventory tracking. The system must support role-based access for Members and Administrators, provide automated notifications and audit logging, and scale to support academic, public, and enterprise library environments.

---

## 2. Problem Statement

Traditional library management systems struggle to support modern academic, public, and enterprise libraries because their core operational modules—catalog management, book circulation, reservations, fines, subscriptions, and user management—often function independently rather than as a unified ecosystem. This fragmentation creates inconsistent data, inefficient workflows, and a poor user experience.

One of the most common issues is **phantom availability**, where books appear available in the catalog despite being reserved, overdue, under maintenance, or awaiting return processing. Without a real-time circulation state and automated reservation queue, users cannot reliably determine resource availability, resulting in frustration and reduced trust in the system.

Library administrators also spend significant time performing repetitive manual tasks such as calculating overdue fines, processing damage penalties, verifying membership eligibility, and tracking issued books. These manual processes increase operational costs, introduce human error, and reduce staff productivity.

Traditional categorization methods are equally limiting. Flat category structures fail to represent complex library collections, making it difficult for users to browse books through hierarchical classifications such as **Fiction → Mystery → Detective Fiction** or **Science → Computer Science → Artificial Intelligence**. This reduces discoverability and negatively impacts the overall search experience.

In addition, many existing systems allow unrestricted reviews and ratings, making it difficult to ensure the authenticity and quality of reader feedback. Without verifying whether a user has actually borrowed or read a book, reviews become unreliable and reduce the credibility of the library catalog.

Most legacy solutions also lack enterprise capabilities such as role-based access control, automated notifications, advanced search, audit logging, analytics, scalable architecture, and comprehensive reporting. As library collections and memberships grow, these limitations make the system increasingly difficult to manage, maintain, and scale.

This project addresses these challenges by developing a production-grade Enterprise Library Management System that unifies all library operations into a centralized, state-aware platform with secure authentication, automated workflows, hierarchical categorization, intelligent search, real-time inventory tracking, and a scalable architecture designed for high-volume institutional environments.

---

## 3. Scope

### In Scope

- Role-based authentication and authorization (JWT-based)
- Hierarchical book category management
- Advanced search with pagination and filtering
- Book circulation (issue, renew, return)
- Reservation and waitlist management
- Fine calculation and wallet management
- Subscription plan management
- User management with role-based access
- Verified member reviews and ratings
- Audit logging and activity tracking
- Analytics dashboard and reporting
- RESTful API design
- Responsive web interface

### Out of Scope

- Physical inventory management (RFID/barcode integration)
- Mobile native applications (iOS/Android)
- Integration with third-party library networks
- E-book DRM management
- Self-checkout kiosk integration

---

## 4. Target Users

The Enterprise Library Management System is designed to support multiple user groups with distinct responsibilities, permissions, and workflows. Each role is granted access based on the principle of least privilege, ensuring security, operational efficiency, and a personalized user experience. The platform is scalable enough to support libraries of varying sizes, including educational institutions, corporate libraries, and public library networks.

---

## 4.1 Guest (Unauthenticated User)

Guests are visitors who have not yet registered or logged into the system. Their access is intentionally limited to encourage account creation while allowing them to explore the library's offerings.

### Objectives

* Discover books and library resources.
* Explore available collections before registering.
* Learn about library services and membership plans.

### Responsibilities & Capabilities

* Browse the public book catalog.
* Search books by title, author, ISBN, or category.
* View book descriptions, authors, ratings, and availability.
* Explore hierarchical categories and featured collections.
* View library announcements and operating information.
* Register for a new account.

### Restrictions

* Cannot borrow or reserve books.
* Cannot access personal dashboards.
* Cannot submit ratings or reviews.
* Cannot view member-only resources or subscription features.

---

# 4.2 Member (Student / Reader)

Members are registered users who borrow library resources for educational, research, or personal learning purposes. They represent the primary users of the system.

### Objectives

* Easily discover and borrow library resources.
* Track loans and reservations.
* Manage memberships and payments.
* Maintain a personalized reading experience.

### Responsibilities & Capabilities

* Secure login and profile management.
* Browse and search the complete catalog.
* Borrow books within membership limits.
* Renew eligible loans.
* Reserve unavailable books through the automated waitlist.
* Track active loans, due dates, and borrowing history.
* View reservation queue position in real time.
* Manage personal wishlists and favorite books.
* Receive notifications for due dates, reservations, and overdue books.
* Pay overdue fines and subscription fees online.
* View payment history and invoices.
* Submit ratings and reviews only after successfully borrowing and returning a book (Verified Reader).
* View personalized recommendations.

### Restrictions

* Cannot modify catalog data.
* Cannot manage other users.
* Cannot access administrative reports.
* Cannot configure system settings.

---

# 4.3 Administrator

Administrators have complete control over the platform and are responsible for governance, security, configuration, reporting, and system maintenance. They also carry out the daily operational (staff) workflows such as issuing and returning books, approving borrow and return requests, and fulfilling reservations.

### Objectives

* Ensure smooth and secure system operations.
* Monitor organizational performance.
* Manage users, resources, and configurations.

### Responsibilities & Capabilities

### User & Access Management

* Manage administrators and members.
* Assign and revoke user roles.
* Activate, suspend, or deactivate accounts.
* Reset passwords and manage authentication policies.

### Library Management

* Manage books, authors, publishers, and categories.
* Configure hierarchical categories.
* Import and export large datasets.
* Manage inventory across all collections.

### Circulation Management

* Issue, renew, and return books.
* Approve member borrow and return requests.
* Monitor issued books.
* Track overdue items.
* Manage reservations and waitlists.
* Configure borrowing policies.

### Subscription & Finance

* Create and manage subscription plans.
* Configure borrowing limits.
* Monitor subscription revenue.
* Manage fines and payment records.
* Generate financial reports.

### Analytics & Reporting

* View borrowing trends.
* Monitor popular books.
* Analyze user activity.
* Generate downloadable reports.
* Monitor library performance KPIs.

### Security & Administration

* Configure system settings.
* Manage application permissions.
* Monitor audit logs.
* Review login history.
* Manage notification settings.
* Perform backup and recovery operations.

---

# Role-Based Access Matrix

| Feature                      | Guest |  Member | Admin |
| ---------------------------- | :---: | :-----: | :---: |
| Browse Catalog               |   ✅   |    ✅    |   ✅   |
| Search Books                 |   ✅   |    ✅    |   ✅   |
| View Book Details            |   ✅   |    ✅    |   ✅   |
| Register Account             |   ✅   |    ❌    |   ❌   |
| Login                        |   ✅   |    ✅    |   ✅   |
| Borrow Books                 |   ❌   |    ✅    |   ✅   |
| Renew Books                  |   ❌   |    ✅    |   ✅   |
| Return Books                 |   ❌   |    ✅    |   ✅   |
| Reserve Books                |   ❌   |    ✅    |   ✅   |
| Wishlist                     |   ❌   |    ✅    |   ❌   |
| View My Loans                |   ❌   |    ✅    |   ❌   |
| Pay Fines                    |   ❌   |    ✅    |   ✅   |
| Verified Reviews             |   ❌   |    ✅    |   ❌   |
| Approve Borrow/Return Requests |  ❌   |    ❌    |   ✅   |
| Manage Members               |   ❌   |    ❌    |   ✅   |
| Manage Books                 |   ❌   |    ❌    |   ✅   |
| Manage Categories            |   ❌   |    ❌    |   ✅   |
| Manage Authors               |   ❌   |    ❌    |   ✅   |
| Manage Reservations          |   ❌   |    ❌    |   ✅   |
| Configure Subscription Plans |   ❌   |    ❌    |   ✅   |
| View Reports                 |   ❌   | Limited |  Full |
| Manage Roles & Permissions   |   ❌   |    ❌    |   ✅   |
| System Configuration         |   ❌   |    ❌    |   ✅   |
| Audit Logs                   |   ❌   |    ❌    |   ✅   |

---

# User Journey Overview

* **Guest** → Explores the catalog → Registers → Becomes a Member.
* **Member** → Searches books → Borrows resources → Tracks loans → Returns books → Pays fines (if applicable) → Submits verified reviews.
* **Administrator** → Oversees circulation and reservations, inventory, member assistance, system configuration, security, analytics, subscriptions, financial operations, and overall platform governance.

---

### Success Criteria

The system shall provide a secure, role-based experience where each user can efficiently perform only the tasks relevant to their responsibilities. This approach improves usability, strengthens security, reduces operational errors, and ensures the platform remains scalable for enterprise-level library environments.

## 5. Automatic Fine Management and Payment Infrastructure

### 5.1 Overview

The Enterprise Library Management System includes a fully automated Fine Management Engine responsible for calculating, tracking, collecting, and auditing financial penalties generated during library operations. The objective is to eliminate manual intervention while maintaining complete financial transparency and auditability.

Fine records are immutable financial documents. Once generated, they are never deleted from the database. Any modification occurs only through controlled state transitions that preserve historical information for compliance, reporting, and auditing purposes.

The system automatically generates fines for predefined policy violations, including overdue returns, damaged books, lost books, and administrative penalties. Every fine is linked to the originating loan transaction, ensuring full traceability throughout the resource lifecycle.

---

### 5.2 Fine Generation Triggers

The Fine Engine automatically creates fines when any of the following conditions occur:

* Book returned after due date
* Lost book declaration
* Damaged book assessment
* Manual administrative penalty
* Membership policy violations
* Replacement cost assessment
* Processing fees

Each trigger records:

* Loan ID
* Book ID
* Member ID
* Fine Category
* Calculation Method
* Amount
* Timestamp
* Generated By (System/Admin)

---

### 5.3 Fine State Machine

Every fine follows a controlled lifecycle.

```
Generated
      │
      ▼
 Unpaid
   │  │
   │  ├────────► Waived
   │
   ▼
Payment Initiated
   │
   ▼
Payment Pending
   │
   ▼
Payment Verified
   │
   ▼
Paid
```

Allowed transitions are validated by the business layer. Invalid state changes are rejected.

---

### 5.4 Waiver Management

Library administrators may waive fines under authorized circumstances such as system errors, institutional policies, or special approvals.

A waiver never removes the original financial record.

Instead, the system:

* Updates Fine Status to **WAIVED**
* Stores Waived By
* Stores Waiver Reason
* Records Approval Timestamp
* Creates an Audit Log
* Restores borrowing eligibility if no other active restrictions exist

This approach preserves financial history while maintaining regulatory compliance.

---

### 5.5 Razorpay Payment Integration

Fine payments are processed through Razorpay using a secure event-driven workflow.

#### Payment Workflow

```
Member
      │
      ▼
Select Fine
      │
      ▼
Backend Creates Razorpay Order
      │
      ▼
Checkout Payment
      │
      ▼
Razorpay Processes Transaction
      │
      ▼
Webhook Received
      │
      ▼
Signature Verification
      │
      ▼
Update Payment
      │
      ▼
Update Fine Status
      │
      ▼
Restore Borrowing Privileges
```

The backend creates a unique order for every payment. Payment completion is confirmed only after successful webhook verification and signature validation. Webhook handlers should also be idempotent so duplicate webhook deliveries do not create duplicate payment records. ([Razorpay][1])

---

### 5.6 Payment States

```
CREATED

INITIATED

PENDING

SUCCESS

FAILED

REFUNDED

CANCELLED
```

Each transition is permanently logged.

---

### 5.7 Business Rules

* A fine cannot be deleted.
* A paid fine cannot be modified.
* Duplicate payment confirmations are ignored.
* Borrowing privileges remain blocked while unpaid fines exceed the configured threshold.
* Payment verification occurs only on the server.
* Every payment has a unique transaction reference.
* All financial operations generate audit records.

---

## 6. Subscription Management and Tiered Access Infrastructure

### 6.1 Overview

The Subscription Management Module controls member borrowing privileges through configurable membership plans. Rather than applying a single borrowing policy to all members, the platform supports multiple subscription tiers with independent borrowing limits, loan durations, renewal rules, reservation quotas, and premium features.

Every borrowing request passes through the subscription validation engine before the loan is approved.

---

### 6.2 Subscription Plans

Example plans include:

| Plan          | Books        | Loan Days    | Reservations | Renewals     |
| ------------- | ------------ | ------------ | ------------ | ------------ |
| Basic         | 3            | 14           | 2            | 1            |
| Standard      | 5            | 21           | 5            | 2            |
| Premium       | 10           | 30           | Unlimited    | 5            |
| Institutional | Configurable | Configurable | Configurable | Configurable |

---

### 6.3 Subscription Metadata

Each plan defines:

* Maximum Active Books
* Maximum Loan Duration
* Maximum Renewals
* Reservation Limit
* Fine Discount
* Membership Price
* Validity Period
* Digital Resource Access
* Priority Reservation Access

---

### 6.4 Subscription Lifecycle

```
Created
      │
      ▼
Pending Payment
      │
      ▼
Payment Verified
      │
      ▼
Active
      │
      ▼
Expiring Soon
      │
      ▼
Expired
      │
      ▼
Renewed
```

Membership status is recalculated automatically during every authenticated request.

---

### 6.5 Borrowing Validation

Before issuing a book, the system verifies:

* Subscription is active.
* Membership has not expired.
* Borrowing limit is not exceeded.
* Outstanding fines are within policy.
* Book is available.
* Member is not suspended.
* Reservation rules are satisfied.

Only after all validations succeed is the loan created.

---

### 6.6 Subscription Payment Workflow

Subscription purchases follow a secure payment flow similar to fine payments.

```
Choose Plan

Create Razorpay Order

Complete Payment

Webhook Verification

Activate Subscription

Update Member Permissions

Enable Premium Features
```

For recurring memberships, Razorpay provides dedicated subscription APIs that support plan-based billing, automated renewals, and webhook notifications. If you intend to charge members automatically every month or year, using Razorpay Subscriptions is more appropriate than implementing recurring billing manually. ([Razorpay][2])

---

### 6.7 Business Rules

* Only one active subscription per member.
* Renewals extend the current expiration date.
* Expired memberships cannot borrow books.
* Active loans remain valid after expiry, but new loans are blocked.
* Subscription upgrades immediately apply new borrowing limits.
* Downgrades take effect after the current billing cycle.
* Every subscription change is recorded in the audit log.

---

## 7. Technical Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Java 26, Spring Boot 3.2.5, Spring Security, Spring Data JPA |
| **Frontend** | React 19, Vite 8, Redux Toolkit, Tailwind CSS |
| **Database** | MySQL 8.0 |
| **Authentication** | JWT (jjwt 0.12.5), BCrypt |
| **Build Tools** | Maven 3.9.6, npm |
| **API Style** | RESTful JSON |

---

## 8. Security Architecture: JWT, OAuth2 & Role-Based Access Control (RBAC)

### 8.1 Overview

Security is a foundational component of the Enterprise Library Management System. The platform adopts a **stateless, token-based security architecture** designed to provide secure authentication, fine-grained authorization, and horizontal scalability while eliminating the overhead of traditional server-side session management.

Authentication is performed using **JSON Web Tokens (JWT)** for local accounts and **OAuth2** for third-party identity providers such as Google. Every request is authenticated before accessing protected resources, ensuring that only authorized users can perform system operations.

---

### 8.2 Authentication Architecture

The system supports multiple authentication mechanisms to provide flexibility and improve user experience.

#### Local Authentication

Members and administrators can authenticate using:

* Email and password
* JWT access token
* Secure password hashing
* Token-based authentication

#### OAuth2 Authentication

The platform also supports third-party authentication through Google OAuth2, allowing users to sign in using existing Google accounts without creating separate credentials.

Both authentication methods ultimately generate a unified security context used throughout the application.

---

### 8.3 JWT Authentication Flow

```text
User Login
      │
      ▼
Credential Validation
      │
      ▼
Generate JWT Access Token
      │
      ▼
Client Stores Token
      │
      ▼
Authorization Header
Bearer <JWT>
      │
      ▼
JWT Validation
      │
      ▼
Security Context Created
      │
      ▼
Protected Resource Access
```

The JWT contains authenticated user information, assigned roles, and token expiration details. Every protected request is validated before reaching the business layer.

---

### 8.4 Authorization Model (RBAC)

The system implements **Role-Based Access Control (RBAC)** to ensure that every user can access only the resources and operations permitted by their assigned role.

#### Member

Members can:

* View and update their profile
* Browse and search the catalog
* Borrow and renew books
* Reserve books
* View loan history
* Pay fines
* Manage subscriptions
* Authenticate using Google OAuth2 or local login

Members cannot:

* Modify inventory
* Manage users
* View administrative reports
* Configure system settings

---

#### Administrator

Administrators have full system privileges, including:

* User management
* Role assignment
* Inventory management
* Fine waiver approval
* Subscription plan management
* Payment oversight
* Report generation
* Audit log access
* System configuration
* Soft and hard deletion (where permitted)

Administrative actions are permanently recorded for auditing purposes.

---

### 8.5 Request Authorization Pipeline

Every protected request follows a standardized security validation process.

```text
HTTP Request
      │
      ▼
Authentication Filter
      │
      ▼
JWT Validation
      │
      ▼
Token Integrity Check
      │
      ▼
Load User Authorities
      │
      ▼
Security Context Population
      │
      ▼
Role & Permission Validation
      │
      ▼
Business Service
```

Requests that fail authentication or authorization are rejected before reaching the application logic.

---

### 8.6 Method-Level Security

Sensitive business operations are protected using role-based authorization.

Examples include:

* Book management
* User administration
* Subscription configuration
* Fine waivers
* Payment administration
* Audit log access
* System configuration

Only users with the required permissions can execute these operations.

---

### 8.7 Token Management

JWT tokens include:

* User identifier
* Assigned roles
* Issue timestamp
* Expiration timestamp
* Digital signature

Expired, invalid, or tampered tokens are rejected automatically.

---

### 8.8 Security Controls

The platform incorporates multiple security controls, including:

* Stateless authentication
* Secure password hashing
* JWT signature verification
* OAuth2 authentication
* Role-based authorization
* HTTPS communication
* Input validation
* SQL injection protection
* Cross-Site Scripting (XSS) prevention
* Cross-Origin Resource Sharing (CORS) configuration
* CSRF protection (where applicable)
* Rate limiting (recommended)
* Account lockout after repeated failed login attempts (recommended)

---

### 8.9 Audit & Compliance

All security-sensitive operations are recorded for monitoring and compliance purposes.

Examples include:

* Login and logout events
* Failed authentication attempts
* Password changes
* Role assignments
* Fine waivers
* Subscription modifications
* Payment approvals
* Administrative actions

Audit records are immutable and support security investigations, compliance reporting, and operational monitoring.

---

### 8.10 Enterprise Benefits

The security architecture provides:

* Stateless authentication for scalable deployments
* Secure JWT-based authorization
* Seamless Google OAuth2 integration
* Fine-grained role-based access control
* Centralized authentication and authorization
* Comprehensive audit logging
* Protection against common web security threats
* Enterprise-ready security suitable for academic institutions and large library networks

---

## 9. Functional Requirements (High-Level)

| ID | Feature | Priority |
|----|---------|----------|
| F1 | User registration and JWT-based authentication | P0 |
| F2 | Role-based access control (Guest, Member, Admin) | P0 |
| F3 | Book catalog CRUD with hierarchical categories | P0 |
| F4 | Book issue, renew, return workflow | P0 |
| F5 | Pagination and advanced search (title, author, category, ISBN) | P0 |
| F6 | Fine calculation and wallet management | P1 |
| F7 | Book reservation and waitlist queue | P1 |
| F8 | Subscription plan management | P1 |
| F9 | Verified member reviews and ratings | P2 |
| F10 | Audit logging and activity history | P2 |
| F11 | Analytics dashboard and operational reports | P2 |
| F12 | Email/notification system for due dates and reservations | P2 |

---

## 10. Development Phases

### Phase 1: Foundation (Current)
- User authentication and role management (complete)
- Book CRUD and basic circulation (complete)
- Hierarchical categories
- Pagination and advanced search

### Phase 2: Operations
- Reservation and waitlist system
- Fine calculation and wallet
- Subscription plans

### Phase 3: Enterprise
- Verified reviews and ratings
- Audit logging
- Analytics and dashboards
- Notification system

---

## 11. Success Metrics

- Zero unhandled exceptions in production API endpoints
- Login success rate > 99%
- Book search response time < 500ms for paginated queries
- Category tree load time < 200ms
- All API endpoints return consistent error response format
- Data integrity: no phantom availability states after reservation/circulation state transitions

[1]: https://razorpay.com/docs/webhooks/best-practices/?preferred-country=IN "Webhooks | Best Practices | Razorpay Docs"
[2]: https://razorpay.com/docs/payments/subscriptions/?preferred-country=IN "Payments | Subscriptions | Razorpay Docs"
