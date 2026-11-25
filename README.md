# SharePlate – Surplus Food Rescue and Distribution System

SharePlate is an enterprise-grade full-stack MERN web application engineered to eliminate avoidable food wastage by establishing a reliable, transparent, and direct bridge between commercial surplus food donors (restaurants, hotels, college cafeterias, event caterers) and verified charitable organizations (NGOs, shelters, community kitchens).

---

## 1. Problem Statement & Motivation

Food wastage is a critical global and local concern:
- Commercial food establishments frequently produce high-quality, edible surplus food that goes unused and is ultimately discarded due to lack of immediate redistribution channels.
- Concurrently, charitable NGOs, orphanages, and community shelters struggle to source enough daily meals for vulnerable populations.
- Traditional donation methods suffer from lack of real-time visibility, coordination overhead, uncertain food safety expiry windows, and lack of accountability.

**SharePlate** provides an end-to-end digital ecosystem featuring:
- Real-time surplus food listings and direct claiming.
- Atomic inventory reservation to prevent race conditions and over-claiming.
- Role-based access control and strict credential vetting for recipient NGOs.
- Real-time pickup logistics scheduling and dual-confirmation handover workflows.
- In-app notification center with read/unread tracking.
- Interactive administrative dashboard featuring aggregated MongoDB Reports & Analytics with date range filtering, category breakdowns, monthly volume trends, and donor/NGO leaderboards.

---

## 2. Technology Stack

- **Frontend:** React 19, Vite 8, React Router v7, Modern Component-based Architecture, Custom Responsive CSS Design System
- **Backend:** Node.js (v20+), Express.js (v5), ES Modules (`"type": "module"`)
- **Database:** MongoDB Atlas (Cloud Replica Set)
- **Object Data Modeling (ODM):** Mongoose (v9)
- **Authentication & Security:** JSON Web Tokens (JWT), `bcryptjs` (salt rounds: 10), `express-rate-limit`, CORS origin isolation
- **API Architecture:** RESTful JSON APIs with atomic conditional updates and MongoDB aggregation pipelines

---

## 3. Project Architecture & Directory Structure

```
sesd_project/
├── client/                     # Frontend React (Vite) Application
│   ├── public/                 # Static assets & icons
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, NotificationBell, ProtectedRoute)
│   │   ├── context/            # AuthContext, AuthContextInstance, useAuth hook
│   │   ├── pages/              # Role-specific & shared views
│   │   │   ├── LandingPage.jsx         # Public landing page with role overview
│   │   │   ├── LoginPage.jsx           # Sign in with password toggle & role routing
│   │   │   ├── RegisterPage.jsx        # Dual-role registration (Donor / NGO)
│   │   │   ├── DonorDashboard.jsx      # Donor overview: 6-metric breakdown, stats, quick navigation
│   │   │   ├── CreateDonationPage.jsx  # Food surplus listing publication form
│   │   │   ├── EditDonationPage.jsx    # Listing modification interface
│   │   │   ├── MyDonationsPage.jsx     # Donor inventory management & status filters
│   │   │   ├── IncomingRequestsPage.jsx# Claim approvals, rejections, & handover confirmations
│   │   │   ├── NgoDashboard.jsx        # NGO overview: available food, claims, pickups, received volume
│   │   │   ├── BrowseDonationsPage.jsx # Real-time surplus browse, search, & category filters
│   │   │   ├── DonationDetailsPage.jsx # Detailed food listing view, claim modal & pickup coordination
│   │   │   ├── MyRequestsPage.jsx      # NGO claims tracking & pickup confirmations
│   │   │   ├── NotificationsPage.jsx   # Dedicated notification center with unread filters & navigation
│   │   │   ├── ProfilePage.jsx         # User profile manager (contact details, address, read-only badges)
│   │   │   └── AdminDashboard.jsx      # 6-tab admin portal (Overview, NGO Vetting, Users, Listings, Requests, Reports & Analytics)
│   │   ├── services/
│   │   │   └── api.js          # Centralized API client with automatic JWT header injection
│   │   ├── App.jsx             # Route definitions & protected route guards
│   │   ├── index.css           # Responsive design system & component styles
│   │   └── main.jsx            # Application entry point
│   ├── package.json
│   └── vite.config.js          # Vite config with backend proxy (/api -> http://localhost:5000)
│
├── server/                     # Backend Node.js & Express API
│   ├── config/
│   │   └── db.js               # MongoDB Atlas connection manager with Mongoose
│   ├── controllers/
│   │   ├── authController.js   # Registration, login, session
│   │   ├── donationController.js# Food listing lifecycle, donor stats, pickup scheduling
│   │   ├── requestController.js # Atomic claims, approval, pickup, dual-handover, NGO stats
│   │   ├── notificationController.js# In-app notification feeds & read tracking
│   │   ├── adminController.js  # Platform metrics, user suspension, aggregation reports & analytics
│   │   ├── userController.js   # User profiles & NGO verification actions
│   │   └── healthController.js # Health-check & DB state monitoring
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT verification, RBAC, requireVerifiedNgo
│   │   ├── rateLimiter.js      # Brute force protection on auth endpoints
│   │   └── errorHandler.js     # Centralized 404 & global exception handler
│   ├── models/
│   │   ├── User.js             # User model with role-based embedded schemas
│   │   ├── FoodDonation.js     # Surplus listing model with inventory math & pickup logistics
│   │   ├── FoodRequest.js      # Food claim request lifecycle model
│   │   └── Notification.js     # In-app event notifications model
│   ├── routes/
│   │   ├── authRoutes.js       # /api/auth
│   │   ├── donationRoutes.js   # /api/donations
│   │   ├── requestRoutes.js    # /api/requests
│   │   ├── notificationRoutes.js# /api/notifications
│   │   ├── adminRoutes.js      # /api/admin
│   │   ├── userRoutes.js       # /api/users
│   │   └── healthRoutes.js     # /api/health
│   ├── scripts/
│   │   └── seedAdmin.js        # Secure administrator account provisioning script
│   ├── services/
│   │   └── notificationService.js # In-app notification dispatcher
│   ├── tests/
│   │   ├── authTest.js         # Model & DB authentication test suite (11 tests)
│   │   ├── apiIntegrationTest.js# HTTP API endpoint integration test suite (13 tests)
│   │   ├── phase2DonationManagementTest.js # Phase 2 food donation management suite (21 tests)
│   │   ├── securityAuditTest.js# Concurrency, state machine & RBAC audit suite (15 tests)
│   │   ├── phase2And3Test.js   # Workflow lifecycle & dual handover suite (18 tests)
│   │   └── phase3IntegrationTest.js # Phase 3 analytics, profiles, logistics suite (49 tests)
│   ├── utils/
│   │   └── jwt.js              # Token signing & verification utilities
│   ├── .env.example            # Environment variables template
│   ├── package.json
│   └── server.js               # Server entry point & Express configuration
│
└── docs/
    └── SRS.md                  # Software Requirements Specification
```

---

## 4. Critical Business Rules & Concurrency Guarantees

1. **Atomic Inventory Accounting & Race Condition Prevention:**
   - When an NGO submits a food claim request, the backend performs a single atomic conditional update:
     ```javascript
     FoodDonation.findOneAndUpdate(
       {
         _id: donationId,
         status: { $in: ["AVAILABLE", "PARTIALLY_RESERVED"] },
         expiryDateTime: { $gt: new Date() },
         availableQuantity: { $gte: requestedQuantity }
       },
       {
         $inc: {
           availableQuantity: -requestedQuantity,
           reservedQuantity: requestedQuantity
         }
       },
       { returnDocument: "after" }
     );
     ```
   - This guarantees that concurrent requests from multiple NGOs can never over-reserve beyond the available surplus.
   - At all times: $\text{Total Quantity} = \text{Available} + \text{Reserved} + \text{Fulfilled}$.

2. **Surplus Restoration on Rejection / Cancellation:**
   - If a donor rejects a request, or if an NGO cancels an uncollected request, the reserved quantity is immediately restored to `availableQuantity` atomically, shifting the listing back to `AVAILABLE` or `PARTIALLY_RESERVED`.

3. **Expiry Protection:**
   - Food listings whose `expiryDateTime` has passed are automatically marked `EXPIRED` and cannot accept new requests.

4. **NGO Verification Gate:**
   - NGO registrations default to `PENDING` verification status.
   - Unverified NGOs can browse listings, but the backend `requireVerifiedNgo` middleware strictly prohibits claiming food until an Administrator verifies their registration details.

5. **Pickup Coordination & Dual-Confirmation Handover Protocol:**
   - Direct listings support pickup scheduling (`pickupScheduledTime` and `pickupNotes`) shared between the Donor and the claiming NGO.
   - For granular meal requests, the donor marks food `READY_FOR_PICKUP` and confirms handover (`confirmHandover`).
   - The NGO confirms physical collection (`confirmCollection`).
   - A request is only marked `COMPLETED` once **both** parties have confirmed the transaction, shifting `reservedQuantity` to `fulfilledQuantity`.

---

## 5. Database Models & Schema Specifications

### `User` Schema
- `name`: String (Required, trimmed)
- `email`: String (Required, unique, lowercase, regex-validated, indexed)
- `password`: String (Required, min 8 chars, hashed with bcrypt, `select: false`)
- `phone`: String (Required)
- `role`: Enum `['DONOR', 'NGO', 'ADMIN']`
- `donorDetails`: Embedded `{ organizationName, organizationType, address }`
- `ngoDetails`: Embedded `{ ngoName, registrationNumber, contactPerson, address, organizationDetails }`
- `ngoVerificationStatus`: Enum `['PENDING', 'VERIFIED', 'REJECTED']` (Default: `'PENDING'`)
- `accountStatus`: Enum `['ACTIVE', 'SUSPENDED']` (Default: `'ACTIVE'`)
- Timestamps: `createdAt`, `updatedAt`

### `FoodDonation` Schema
- `donor`: ObjectId (Ref: `User`, Required, indexed)
- `title`: String (Required, max 150 chars)
- `category`: Enum `['COOKED_MEALS', 'BAKED_GOODS', 'RAW_INGREDIENTS', 'PACKAGED_FOOD', 'FRUITS_VEGETABLES', 'DAIRY', 'BEVERAGES', 'OTHER']`
- `description`: String (Required, max 1000 chars)
- `totalQuantity`: Number (Min: 1)
- `availableQuantity`: Number (Min: 0)
- `reservedQuantity`: Number (Min: 0, Default: 0)
- `fulfilledQuantity`: Number (Min: 0, Default: 0)
- `quantityUnit`: String (e.g. `kg`, `meals`, `packets`, `boxes`)
- `preparationDateTime`: Date (Required)
- `expiryDateTime`: Date (Required, indexed)
- `pickupLocation`: String (Required)
- `pickupWindow`: String (Required, e.g. `'2:00 PM - 5:00 PM'`)
- `imageUrl`: String (Base64 data URI or HTTPS URL)
- `specialInstructions`: String
- `claimedBy`: ObjectId (Ref: `User`, for direct full-claim workflow)
- `claimedAt`: Date
- `pickedUpAt`: Date
- `completedAt`: Date
- `pickupScheduledTime`: Date
- `pickupNotes`: String
- `status`: Enum `['AVAILABLE', 'PARTIALLY_RESERVED', 'FULLY_RESERVED', 'CLAIMED', 'PICKED_UP', 'COMPLETED', 'CANCELLED', 'EXPIRED']`
- Timestamps: `createdAt`, `updatedAt`

### `FoodRequest` Schema
- `ngo`: ObjectId (Ref: `User`, Required, indexed)
- `donor`: ObjectId (Ref: `User`, Required, indexed)
- `donation`: ObjectId (Ref: `FoodDonation`, Required, indexed)
- `requestedQuantity`: Number (Min: 1)
- `status`: Enum `['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'READY_FOR_PICKUP', 'COMPLETED']`
- `donorResponse`: String
- `rejectionReason`: String
- `pickupScheduledTime`: Date
- `pickupNotes`: String
- `handoverConfirmedByDonor`: Boolean (Default: false)
- `handoverConfirmedByDonorAt`: Date
- `collectionConfirmedByNgo`: Boolean (Default: false)
- `collectionConfirmedByNgoAt`: Date
- `completedAt`: Date
- Timestamps: `createdAt`, `updatedAt`

### `Notification` Schema
- `recipient`: ObjectId (Ref: `User`, Required, indexed)
- `sender`: ObjectId (Ref: `User`)
- `title`: String (Required)
- `message`: String (Required)
- `type`: Enum `['REQUEST_RECEIVED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'REQUEST_CANCELLED', 'READY_FOR_PICKUP', 'HANDOVER_CONFIRMED', 'COLLECTION_CONFIRMED', 'REQUEST_COMPLETED', 'NGO_VERIFIED', 'NGO_REJECTED', 'SYSTEM']`
- `link`: String
- `isRead`: Boolean (Default: false, indexed)
- Timestamps: `createdAt`, `updatedAt`

---

## 6. REST API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public (Rate-limited) | Register Donor or NGO (Admin blocked) |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Authenticate user & return JWT |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user session |
| `POST` | `/api/auth/logout` | Authenticated | Terminate session |

### User Profile Management (`/api/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users/profile` | Authenticated | Fetch current user profile details |
| `PUT` | `/api/users/profile` | Authenticated | Update phone, contact person, and address |
| `GET` | `/api/users` | Admin | List all registered users with role filters |
| `PUT` | `/api/users/:id/verify-ngo` | Admin | Verify (`VERIFIED`) or reject (`REJECTED`) an NGO |

### Food Donations (`/api/donations`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/donations` | Donor | Publish a new surplus food listing |
| `GET` | `/api/donations` | Authenticated | Browse surplus food with search & category filters |
| `GET` | `/api/donations/my` | Donor | List all donations created by the authenticated donor |
| `GET` | `/api/donations/:id` | Authenticated | Retrieve comprehensive details of a listing |
| `PUT` | `/api/donations/:id` | Donor (Owner) | Edit food donation listing details |
| `PATCH` | `/api/donations/:id/cancel` | Donor (Owner) | Cancel an active surplus listing |
| `PUT` | `/api/donations/:id/claim` | Verified NGO | Claim an available surplus listing |
| `PUT` | `/api/donations/:id/pickup` | Claimed NGO / Donor | Mark listing as picked up |
| `PUT` | `/api/donations/:id/complete` | Donor / Claimed NGO | Mark listing as completed |
| `PUT` | `/api/donations/:id/schedule-pickup` | Donor / Claimed NGO | Coordinate pickup scheduled time and notes |
| `GET` | `/api/donations/donor/stats` | Donor | 6-metric summary (total, active, claimed, completed, cancelled/expired, rescued) |

### Food Requests & Handover (`/api/requests`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/requests` | Verified NGO | Claim food (Atomic reservation against surplus) |
| `GET` | `/api/requests/my` | NGO | List requests submitted by the authenticated NGO |
| `GET` | `/api/requests/incoming` | Donor | List requests received for the donor's listings |
| `GET` | `/api/requests/:id` | Participant / Admin | Retrieve request details |
| `PUT` | `/api/requests/:id/approve` | Donor | Approve claim request & set pickup details |
| `PUT` | `/api/requests/:id/reject` | Donor | Reject claim & release reserved quantity |
| `PUT` | `/api/requests/:id/cancel` | NGO | Cancel claim & release reserved quantity |
| `PUT` | `/api/requests/:id/schedule-pickup` | Donor / NGO | Update scheduled pickup time & notes |
| `PUT` | `/api/requests/:id/ready-for-pickup` | Donor | Mark food packed and ready for collection |
| `PUT` | `/api/requests/:id/confirm-handover` | Donor | Confirm food was handed over |
| `PUT` | `/api/requests/:id/confirm-collection` | NGO | Confirm food was collected (Dual confirmation completes order) |
| `GET` | `/api/requests/ngo/stats` | NGO | 5-metric summary (available, claimed, pending pickups, completed pickups, total collected) |

### In-App Notifications (`/api/notifications`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Authenticated | Retrieve user notifications & unread count |
| `GET` | `/api/notifications/unread-count` | Authenticated | Retrieve unread notification counter |
| `PUT` | `/api/notifications/:id/read` | Authenticated | Mark single notification as read |
| `PUT` | `/api/notifications/read-all` | Authenticated | Mark all notifications as read |

### Platform Administration & Reports (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/metrics` | Admin | Comprehensive platform overview & statistics |
| `GET` | `/api/admin/reports` | Admin | Aggregated analytics with date filtering, status/category breakdowns, monthly volume, and leaderboards |
| `GET` | `/api/admin/donations` | Admin | Audit all food donations across all donors |
| `GET` | `/api/admin/requests` | Admin | Audit all food requests across all NGOs |
| `PUT` | `/api/admin/users/:id/status` | Admin | Suspend or reactivate user accounts |

---

## 7. Setup & Installation Instructions

### Prerequisites
- Node.js (v18 or v20+ recommended)
- MongoDB Atlas account or local MongoDB instance

### Step 1: Clone Repository
```bash
git clone https://github.com/RamcharanChandragiri/Shareplate.git
cd Shareplate
```

### Step 2: Configure Environment Variables
Inside `server/`, create a `.env` file (refer to `server/.env.example`):
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Replace with your MongoDB Atlas connection string:
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.gyjyyqt.mongodb.net/shareplate?retryWrites=true&w=majority

# JWT Secret (generate a secure random 64-character string):
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
JWT_EXPIRES_IN=7d

# Default administrator credentials for seeding:
ADMIN_EMAIL=admin@shareplate.org
ADMIN_PASSWORD=AdminSharePlate2026!
ADMIN_NAME=System Administrator
ADMIN_PHONE=9999999999
```

### Step 3: Install Dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Step 4: Seed Initial Administrator Account
```bash
cd server
npm run seed:admin
```
*(Creates the master administrator: `admin@shareplate.org` / `AdminSharePlate2026!`)*.

### Step 5: Start Development Servers

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
# Server running on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Client running on http://localhost:5173
```

---

## 8. Automated Testing & Verification

The application features 6 specialized test suites covering 127 automated test cases:

```bash
# Execute all test suites against MongoDB Atlas:
node server/tests/authTest.js
node server/tests/apiIntegrationTest.js
node server/tests/phase2DonationManagementTest.js
node server/tests/securityAuditTest.js
node server/tests/phase2And3Test.js
node server/tests/phase3IntegrationTest.js
```

### Summary of Passing Automated Test Suites
| Suite | File | Tests | Status |
|---|---|---|---|
| Phase 1: Auth & User Model | `server/tests/authTest.js` | 11 / 11 | ✔ PASSED |
| Phase 1: API HTTP Integration | `server/tests/apiIntegrationTest.js` | 13 / 13 | ✔ PASSED |
| Phase 2: Food Donation Management | `server/tests/phase2DonationManagementTest.js` | 21 / 21 | ✔ PASSED |
| Security & Concurrency Audit | `server/tests/securityAuditTest.js` | 15 / 15 | ✔ PASSED |
| Phase 2 & 3: Workflow & Dual Handover | `server/tests/phase2And3Test.js` | 18 / 18 | ✔ PASSED |
| Phase 3: Integration, Reports & Profile | `server/tests/phase3IntegrationTest.js` | 49 / 49 | ✔ PASSED |
| **Total Automated Tests** | | **127 / 127** | **100% PASSED** |

---

## 9. Frontend Quality & Production Build Verification

The React client passes all ESLint checks with zero errors and builds cleanly for production:
```bash
cd client
npm run lint    # 0 errors, 0 warnings
npm run build   # Production bundle built in ~250ms (dist/index.html)
```

---

## 10. Manual Verification Guide

To test the application end-to-end in the browser:

1. **Admin Provisioning & Login:**
   - Seed the admin via `npm run seed:admin`.
   - Log in at `http://localhost:5173/login` using `admin@shareplate.org` / `AdminSharePlate2026!`.
   - Access the Admin Dashboard to review platform metrics, verify NGOs, manage users, and inspect the Reports & Analytics tab.

2. **NGO Registration & Vetting:**
   - Navigate to `/register`, select **NGO**, and register with your organization name and registration number.
   - Upon logging in, notice the badge is **PENDING VERIFICATION**; claiming food listings is restricted.
   - In the Admin session, go to the **NGO Verifications** tab and click **Verify NGO**.
   - Back in the NGO session, the badge turns to **VERIFIED** and claiming becomes enabled.

3. **Donor Surplus Creation:**
   - Register or log in as a **Donor** at `/register`.
   - Click **Create Donation**, fill in the food name, category, quantity, unit, preparation time, future expiry deadline, and pickup location.
   - Publish the donation; view it in **My Donations** and monitor the 6 dashboard counters in **Donor Dashboard**.

4. **Pickup Logistics & Dual Confirmation:**
   - From the NGO portal, browse surplus listings at `/browse`.
   - Claim the listing or place a meal request.
   - On the donation details page, coordinate pickup logistics (schedule time and add pickup instructions).
   - Once collected, complete the pickup and completion lifecycle; observe that dashboard statistics and platform rescued food volume update in real time.

5. **Notification Center & Profile Management:**
   - Click the bell icon or visit `/notifications` to view real-time in-app alerts with unread filters and quick navigation links.
   - Click **Profile** or navigate to `/profile` to update facility/organization contact details and address with role tampering protections.

---

## 11. Contributors & License

- **Project:** SharePlate – Surplus Food Rescue and Distribution System
- **Context:** Academic Software Engineering Project (SESD)
- **Author:** Ramcharan Chandragiri
- **Repository:** [https://github.com/RamcharanChandragiri/Shareplate.git](https://github.com/RamcharanChandragiri/Shareplate.git)
- **License:** ISC
