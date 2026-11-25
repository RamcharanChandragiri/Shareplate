# Software Requirements Specification (SRS)

## Project Name: SharePlate
**Project Title:** Surplus Food Rescue and Distribution System  
**Version:** 1.0

---

## 1. Introduction

### 1.1 Purpose
SharePlate is a web-based application designed to reduce food wastage by connecting food donors with charitable organizations (NGOs). It provides a platform where donors can list surplus food and verified NGOs can request and collect available food.

### 1.2 Scope
The system will allow:
- Donors to register and publish surplus food details.
- NGOs to register and request food donations.
- Donors to approve or reject donation requests.
- NGOs to track their requests and pickup status.
- Administrators to verify NGOs and manage the platform.
- Users to view their donation and request history.

### 1.3 Problem Statement
Restaurants, hotels, college cafeterias, and event organizers often have surplus food that goes unused and is eventually wasted. At the same time, many people depend on charitable organizations for food assistance.

There is a need for a centralized platform that connects food donors with NGOs to make surplus food distribution more organized, efficient, and transparent.

### 1.4 Objectives
1. Reduce avoidable food wastage.
2. Connect food donors with verified NGOs.
3. Simplify the process of listing and requesting surplus food.
4. Track donation requests and collection status.
5. Provide administrators with tools to manage users and donations.

---

## 2. Stakeholders and User Roles

### 2.1 Donor
- Register and log in.
- Create and manage food listings.
- View donation requests.
- Approve or reject requests.
- Confirm successful food handover.

### 2.2 NGO / Receiver
- Register and submit verification details.
- Browse available food donations.
- Request full or partial quantities.
- Track request status.
- Confirm food collection.

### 2.3 Administrator
- Log in to the admin dashboard.
- Verify or reject NGO registrations.
- Manage user accounts.
- Monitor food listings and requests.
- View platform activity and reports.

---

## 3. Functional Requirements

| ID | Requirement |
|---|---|
| FR01 | The system shall allow users to register and log in. |
| FR02 | The system shall provide role-based access for Donors, NGOs, and Admins. |
| FR03 | Donors shall be able to create, update, and cancel food listings. |
| FR04 | Each food listing shall contain food name, category, quantity, preparation time, storage details, pickup location, and expiry deadline. |
| FR05 | Verified NGOs shall be able to browse available food listings. |
| FR06 | NGOs shall be able to request full or partial quantities of food. |
| FR07 | Donors shall be able to approve or reject requests. |
| FR08 | The system shall prevent reservations from exceeding the available quantity. |
| FR09 | NGOs shall be able to track request and pickup status. |
| FR10 | Donors and NGOs shall be able to confirm successful food handover. |
| FR11 | Administrators shall be able to verify NGO accounts. |
| FR12 | Users shall be able to view their donation or request history. |
| FR13 | The system shall prevent new requests after a listing's deadline expires. |

---

## 4. Non-Functional Requirements

1. **Performance:** Pages and common operations should respond within a reasonable time.
2. **Security:** Passwords must be securely hashed, and protected APIs must require authentication.
3. **Usability:** The interface should be simple and understandable for all user roles.
4. **Reliability:** The system must maintain accurate food quantities and request statuses.
5. **Scalability:** The application should support additional donors and NGOs in the future.
6. **Maintainability:** The code should be organized into reusable components and modules.
7. **Compatibility:** The application should work on commonly used modern web browsers.

---

## 5. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js |
| Backend | Node.js |
| Backend Framework | Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Programming Language | JavaScript |
| Version Control | Git and GitHub |
| API Testing | Postman |

---

## 6. Assumptions and Constraints

### Assumptions
- Donors provide accurate food information.
- NGOs provide valid registration and contact details.
- NGOs must be verified before requesting food.
- Users have access to the internet.

### Constraints
- The application requires an internet connection.
- The system does not independently certify food safety.
- Food collection must be coordinated between donors and NGOs.
- Only authenticated users can access role-specific features.

---

## 7. Future Enhancements

- Location-based NGO matching.
- Map integration for pickup locations.
- Email and real-time notifications.
- QR-code-based handover verification.
- Donation impact analytics.
- AI-based food demand prediction.

---

**End of SRS Version 1.0**