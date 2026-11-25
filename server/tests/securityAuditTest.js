import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import FoodDonation from "../models/FoodDonation.js";
import FoodRequest from "../models/FoodRequest.js";
import Notification from "../models/Notification.js";
import { generateToken } from "../utils/jwt.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

// Import app to start server and routes
import app from "../server.js";

async function runSecurityAuditTests() {
  console.log("==================================================================");
  console.log("       SHAREPLATE — FINAL SECURITY & CONCURRENCY AUDIT SUITE      ");
  console.log("==================================================================");

  // Give server brief moment to settle on its port
  await new Promise((r) => setTimeout(r, 1500));

  const PORT = process.env.PORT || 5000;
  const BASE_URL = `http://localhost:${PORT}`;

  const testResults = [];
  const logTest = (name, passed, details = "") => {
    testResults.push({ name, passed, details });
    console.log(`${passed ? "✔ PASS" : "✖ FAIL"}: ${name} ${details ? `(${details})` : ""}`);
  };

  try {
    const timestamp = Date.now();
    const testPassword = "Password123!";

    // Setup Test Actors
    const donorA = await User.create({
      name: "Donor Alpha",
      email: `donor_a_${timestamp}@test.com`,
      password: testPassword,
      phone: "9876540001",
      role: "DONOR",
      donorDetails: { organizationName: "Alpha Bakery", organizationType: "RESTAURANT", address: "100 Alpha Way" }
    });
    const donorAToken = generateToken(donorA._id, donorA.role);

    const donorB = await User.create({
      name: "Donor Beta",
      email: `donor_b_${timestamp}@test.com`,
      password: testPassword,
      phone: "9876540002",
      role: "DONOR",
      donorDetails: { organizationName: "Beta Diner", organizationType: "RESTAURANT", address: "200 Beta St" }
    });
    const donorBToken = generateToken(donorB._id, donorB.role);

    const ngoA = await User.create({
      name: "NGO Alpha",
      email: `ngo_a_${timestamp}@test.com`,
      password: testPassword,
      phone: "9876540003",
      role: "NGO",
      ngoDetails: { ngoName: "Alpha Hope", registrationNumber: "NGO-A-01", contactPerson: "Alice", address: "1 Hope Ave" },
      ngoVerificationStatus: "VERIFIED"
    });
    const ngoAToken = generateToken(ngoA._id, ngoA.role);

    const ngoB = await User.create({
      name: "NGO Beta",
      email: `ngo_b_${timestamp}@test.com`,
      password: testPassword,
      phone: "9876540004",
      role: "NGO",
      ngoDetails: { ngoName: "Beta Care", registrationNumber: "NGO-B-02", contactPerson: "Bob", address: "2 Care Ave" },
      ngoVerificationStatus: "VERIFIED"
    });
    const ngoBToken = generateToken(ngoB._id, ngoB.role);

    const unverifiedNgo = await User.create({
      name: "NGO Unverified",
      email: `ngo_unv_${timestamp}@test.com`,
      password: testPassword,
      phone: "9876540005",
      role: "NGO",
      ngoDetails: { ngoName: "Pending Care", registrationNumber: "NGO-P-03", contactPerson: "Paul", address: "3 Wait St" },
      ngoVerificationStatus: "PENDING"
    });
    const unverifiedNgoToken = generateToken(unverifiedNgo._id, unverifiedNgo.role);

    const suspendedUser = await User.create({
      name: "Suspended Donor",
      email: `suspended_${timestamp}@test.com`,
      password: testPassword,
      phone: "9876540006",
      role: "DONOR",
      accountStatus: "SUSPENDED",
      donorDetails: { organizationName: "Suspended Cafe", organizationType: "OTHER", address: "0 Ban St" }
    });
    const suspendedToken = generateToken(suspendedUser._id, suspendedUser.role);

    const adminUser = await User.create({
      name: "System Admin",
      email: `admin_sec_${timestamp}@test.com`,
      password: testPassword,
      phone: "9876540007",
      role: "ADMIN"
    });
    const adminToken = generateToken(adminUser._id, adminUser.role);

    // =========================================================================
    // FOCUS AREA 1: CONCURRENT NGO REQUESTS FOR THE SAME FOOD DONATION
    // =========================================================================
    console.log("\n--- Testing Concurrency: Simultaneous Over-Subscription ---");
    // Listing has 25 units available. 5 concurrent requests of 10 units each fire simultaneously.
    // Exactly 2 must succeed (20 reserved, 5 remaining). 3 must fail with 409 Conflict.
    const concDonation = await FoodDonation.create({
      donor: donorA._id,
      title: "Concurrent Rice & Curry",
      description: "Steaming hot surplus rice and vegetable curry",
      category: "COOKED_MEALS",
      totalQuantity: 25,
      availableQuantity: 25,
      reservedQuantity: 0,
      fulfilledQuantity: 0,
      quantityUnit: "MEALS",
      preparationDateTime: new Date(),
      expiryDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      pickupLocation: "Alpha Way",
      pickupWindow: "2:00 PM - 5:00 PM",
      status: "AVAILABLE"
    });

    const concurrentAttempts = [1, 2, 3, 4, 5].map((i) =>
      fetch(`${BASE_URL}/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${i % 2 === 0 ? ngoBToken : ngoAToken}`
        },
        body: JSON.stringify({
          donationId: concDonation._id.toString(),
          requestedQuantity: 10
        })
      }).then(async (res) => ({ status: res.status, data: await res.json() }))
    );

    const concResults = await Promise.all(concurrentAttempts);
    const successCount = concResults.filter((r) => r.status === 201).length;
    const conflictCount = concResults.filter((r) => r.status === 409).length;

    const freshConcDonation = await FoodDonation.findById(concDonation._id);
    const validInventory =
      freshConcDonation.availableQuantity === 5 &&
      freshConcDonation.reservedQuantity === 20 &&
      freshConcDonation.status === "PARTIALLY_RESERVED";

    logTest(
      "Concurrent Reservation Race Safety",
      successCount === 2 && conflictCount === 3 && validInventory,
      `Expected exactly 2 successes (got ${successCount}) and 3 conflicts (got ${conflictCount}). Remaining: ${freshConcDonation.availableQuantity}, Reserved: ${freshConcDonation.reservedQuantity}`
    );

    // =========================================================================
    // FOCUS AREA 2: ATOMIC QUANTITY RESTORATION (CONCURRENT REJECTIONS & CANCELLATIONS)
    // =========================================================================
    console.log("\n--- Testing Concurrency: Duplicate Rejection & Cancellation ---");
    const createdReq = await FoodRequest.findOne({ donation: concDonation._id, status: "PENDING" });
    const beforeRejectDonation = await FoodDonation.findById(concDonation._id);

    // Fire 5 simultaneous rejections on the same request
    const rejectAttempts = [1, 2, 3, 4, 5].map(() =>
      fetch(`${BASE_URL}/api/requests/${createdReq._id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${donorAToken}`
        },
        body: JSON.stringify({ rejectionReason: "Concurrent test rejection" })
      }).then(async (res) => ({ status: res.status, data: await res.json() }))
    );

    const rejectResults = await Promise.all(rejectAttempts);
    const rejectSuccessCount = rejectResults.filter((r) => r.status === 200).length;
    const rejectFailureCount = rejectResults.filter((r) => r.status === 400).length;

    const afterRejectDonation = await FoodDonation.findById(concDonation._id);
    // Quantity must be restored exactly once (+10 available, -10 reserved)
    const exactSingleRestoration =
      afterRejectDonation.availableQuantity === beforeRejectDonation.availableQuantity + 10 &&
      afterRejectDonation.reservedQuantity === beforeRejectDonation.reservedQuantity - 10;

    logTest(
      "Simultaneous Duplicate Rejection Atomicity",
      rejectSuccessCount === 1 && rejectFailureCount === 4 && exactSingleRestoration,
      `Rejection winners: ${rejectSuccessCount}, rejects blocked: ${rejectFailureCount}. Available restored once: ${afterRejectDonation.availableQuantity}`
    );

    // =========================================================================
    // FOCUS AREA 3: DUPLICATE COMPLETION / CONFIRMATION LOCK SAFETY
    // =========================================================================
    console.log("\n--- Testing Concurrency: Dual Confirmation Completion Race ---");
    const completionDonation = await FoodDonation.create({
      donor: donorA._id,
      title: "Completion Race Food",
      description: "Baked fresh bread rolls ready for distribution",
      category: "BAKED_GOODS",
      totalQuantity: 15,
      availableQuantity: 5,
      reservedQuantity: 10,
      fulfilledQuantity: 0,
      quantityUnit: "PACKETS",
      preparationDateTime: new Date(),
      expiryDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      pickupLocation: "100 Alpha Way",
      pickupWindow: "Now",
      status: "PARTIALLY_RESERVED"
    });

    const completionReq = await FoodRequest.create({
      ngo: ngoA._id,
      donor: donorA._id,
      donation: completionDonation._id,
      requestedQuantity: 10,
      status: "READY_FOR_PICKUP"
    });

    // Fire 5 simultaneous confirmHandover calls AND 5 simultaneous confirmCollection calls
    const mixedConfirmations = [
      ...Array(5).fill(0).map(() =>
        fetch(`${BASE_URL}/api/requests/${completionReq._id}/confirm-handover`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${donorAToken}` }
        }).then(async (r) => ({ type: "handover", status: r.status, data: await r.json() }))
      ),
      ...Array(5).fill(0).map(() =>
        fetch(`${BASE_URL}/api/requests/${completionReq._id}/confirm-collection`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${ngoAToken}` }
        }).then(async (r) => ({ type: "collection", status: r.status, data: await r.json() }))
      )
    ];

    const confirmResults = await Promise.all(mixedConfirmations);
    const handoverSuccesses = confirmResults.filter((r) => r.type === "handover" && r.status === 200).length;
    const collectionSuccesses = confirmResults.filter((r) => r.type === "collection" && r.status === 200).length;

    const finalizedReq = await FoodRequest.findById(completionReq._id);
    const finalizedDonation = await FoodDonation.findById(completionDonation._id);

    // Request must be COMPLETED, fulfilledQuantity must be exactly 10, reservedQuantity must be 0
    const exactSingleCompletion =
      finalizedReq.status === "COMPLETED" &&
      finalizedDonation.fulfilledQuantity === 10 &&
      finalizedDonation.reservedQuantity === 0;

    logTest(
      "Simultaneous Confirmation Completion Atomicity",
      handoverSuccesses === 1 && collectionSuccesses === 1 && exactSingleCompletion,
      `Handover wins: ${handoverSuccesses}/5, Collection wins: ${collectionSuccesses}/5. Fulfilled: ${finalizedDonation.fulfilledQuantity}, Reserved: ${finalizedDonation.reservedQuantity}`
    );

    // =========================================================================
    // FOCUS AREA 4: DONOR OWNERSHIP CHECKS
    // =========================================================================
    console.log("\n--- Testing Ownership: Cross-Donor Access Prevention ---");
    const foreignEditRes = await fetch(`${BASE_URL}/api/donations/${concDonation._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${donorBToken}`
      },
      body: JSON.stringify({ title: "Hacked by Donor B" })
    });
    logTest(
      "Cross-Donor Donation Modification Blocked",
      foreignEditRes.status === 403,
      `Status: ${foreignEditRes.status}`
    );

    const foreignCancelRes = await fetch(`${BASE_URL}/api/donations/${concDonation._id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${donorBToken}` }
    });
    logTest(
      "Cross-Donor Donation Cancellation Blocked",
      foreignCancelRes.status === 403,
      `Status: ${foreignCancelRes.status}`
    );

    // =========================================================================
    // FOCUS AREA 5: NGO OWNERSHIP CHECKS
    // =========================================================================
    console.log("\n--- Testing Ownership: Cross-NGO Access Prevention ---");
    const ngoBReq = await FoodRequest.create({
      ngo: ngoB._id,
      donor: donorA._id,
      donation: concDonation._id,
      requestedQuantity: 5,
      status: "PENDING"
    });

    const foreignNgoCancelRes = await fetch(`${BASE_URL}/api/requests/${ngoBReq._id}/cancel`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${ngoAToken}` }
    });
    logTest(
      "Cross-NGO Request Cancellation Blocked",
      foreignNgoCancelRes.status === 400 || foreignNgoCancelRes.status === 403,
      `Status: ${foreignNgoCancelRes.status}`
    );

    // =========================================================================
    // FOCUS AREA 6: ADMIN-ONLY ACCESS TO ADMINISTRATIVE APIS
    // =========================================================================
    console.log("\n--- Testing Authorization: Admin Route Protection ---");
    const nonAdminRoutes = [
      { method: "GET", url: "/api/admin/metrics" },
      { method: "GET", url: "/api/admin/donations" },
      { method: "GET", url: "/api/admin/requests" },
      { method: "GET", url: "/api/users" }
    ];

    let allNonAdminBlocked = true;
    for (const r of nonAdminRoutes) {
      const res = await fetch(`${BASE_URL}${r.url}`, {
        method: r.method,
        headers: { Authorization: `Bearer ${donorAToken}` }
      });
      if (res.status !== 403) {
        allNonAdminBlocked = false;
        console.log(`Failed on ${r.url}: got status ${res.status}`);
      }
    }
    logTest(
      "Non-Admin Forbidden From All Admin Endpoints",
      allNonAdminBlocked,
      "All 4 endpoints returned 403 Forbidden"
    );

    // =========================================================================
    // FOCUS AREA 7: NOTIFICATION RECIPIENT AUTHORIZATION
    // =========================================================================
    console.log("\n--- Testing Privacy: Notification Isolation ---");
    const notifA = await Notification.create({
      recipient: donorA._id,
      sender: ngoA._id,
      title: "Confidential Notice for Donor A",
      message: "Secret donor message",
      type: "SYSTEM"
    });

    // Donor B attempts to mark Donor A's notification as read
    const foreignNotifReadRes = await fetch(`${BASE_URL}/api/notifications/${notifA._id}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${donorBToken}` }
    });
    const unreadCheck = await Notification.findById(notifA._id);

    logTest(
      "Cross-User Notification Access Blocked",
      foreignNotifReadRes.status === 404 && unreadCheck.isRead === false,
      `Status: ${foreignNotifReadRes.status}, isRead remains: ${unreadCheck.isRead}`
    );

    // =========================================================================
    // FOCUS AREA 8: SUSPENDED USER RESTRICTIONS
    // =========================================================================
    console.log("\n--- Testing Access Control: Suspended User Block ---");
    const suspendedReqRes = await fetch(`${BASE_URL}/api/donations/my`, {
      method: "GET",
      headers: { Authorization: `Bearer ${suspendedToken}` }
    });
    logTest(
      "Suspended User Blocked at Authentication Middleware",
      suspendedReqRes.status === 403,
      `Status: ${suspendedReqRes.status}`
    );

    // =========================================================================
    // FOCUS AREA 9: EXPIRED DONATION RESTRICTIONS
    // =========================================================================
    console.log("\n--- Testing Business Logic: Expired Donations ---");
    const expiredDonation = await FoodDonation.create({
      donor: donorA._id,
      title: "Expired Pastries",
      description: "Cream buns and fruit pies past consumption deadline",
      category: "BAKED_GOODS",
      totalQuantity: 20,
      availableQuantity: 20,
      reservedQuantity: 0,
      fulfilledQuantity: 0,
      quantityUnit: "PACKETS",
      preparationDateTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
      expiryDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      pickupLocation: "100 Alpha Way",
      pickupWindow: "Expired",
      status: "AVAILABLE"
    });

    const expiredReqRes = await fetch(`${BASE_URL}/api/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ngoAToken}`
      },
      body: JSON.stringify({
        donationId: expiredDonation._id.toString(),
        requestedQuantity: 5
      })
    });
    logTest(
      "Request on Expired Donation Rejected",
      expiredReqRes.status === 400,
      `Status: ${expiredReqRes.status}`
    );

    // =========================================================================
    // FOCUS AREA 10: UNVERIFIED NGO RESTRICTIONS
    // =========================================================================
    console.log("\n--- Testing Business Logic: Unverified NGO Restrictions ---");
    const unverifiedReqRes = await fetch(`${BASE_URL}/api/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${unverifiedNgoToken}`
      },
      body: JSON.stringify({
        donationId: concDonation._id.toString(),
        requestedQuantity: 5
      })
    });
    logTest(
      "Unverified NGO Forbidden from Requesting Surplus",
      unverifiedReqRes.status === 403,
      `Status: ${unverifiedReqRes.status}`
    );

    // =========================================================================
    // FOCUS AREA 11: INVALID REQUEST STATUS TRANSITIONS
    // =========================================================================
    console.log("\n--- Testing State Machine: Invalid Transitions ---");
    const pendingReq = await FoodRequest.create({
      ngo: ngoA._id,
      donor: donorA._id,
      donation: concDonation._id,
      requestedQuantity: 2,
      status: "PENDING"
    });

    // Cannot mark ready for pickup directly from PENDING (must be APPROVED first)
    const invalidReadyRes = await fetch(`${BASE_URL}/api/requests/${pendingReq._id}/ready-for-pickup`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${donorAToken}` }
    });
    logTest(
      "Transition PENDING -> READY_FOR_PICKUP Blocked",
      invalidReadyRes.status === 400,
      `Status: ${invalidReadyRes.status}`
    );

    // =========================================================================
    // FOCUS AREA 12: PASSWORD & JWT SECURITY
    // =========================================================================
    console.log("\n--- Testing Security: Password & Token Tampering ---");
    // Invalid password login attempt
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: donorA.email, password: "WrongPassword999!" })
    });
    logTest(
      "Incorrect Password Rejected",
      badLoginRes.status === 401,
      `Status: ${badLoginRes.status}`
    );

    // Tampered JWT signature
    const tamperedToken = donorAToken.slice(0, -6) + "xxxxxx";
    const tamperedRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tamperedToken}` }
    });
    logTest(
      "Tampered JWT Token Rejected",
      tamperedRes.status === 401,
      `Status: ${tamperedRes.status}`
    );

    // Verify password hash is never exposed in API responses
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${donorAToken}` }
    });
    const meData = await meRes.json();
    logTest(
      "Password Hash Excluded from User Objects",
      meData.success === true && meData.user && meData.user.password === undefined,
      `Password field present: ${meData.user?.password !== undefined}`
    );

    // Cleanup Test Data
    console.log("\n--- Cleaning up temporary test documents ---");
    await User.deleteMany({
      email: {
        $in: [
          donorA.email,
          donorB.email,
          ngoA.email,
          ngoB.email,
          unverifiedNgo.email,
          suspendedUser.email,
          adminUser.email
        ]
      }
    });
    await FoodDonation.deleteMany({ _id: { $in: [concDonation._id, completionDonation._id, expiredDonation._id] } });
    await FoodRequest.deleteMany({
      donation: { $in: [concDonation._id, completionDonation._id, expiredDonation._id] }
    });
    await Notification.deleteMany({ _id: notifA._id });

    // Summary
    const passedTotal = testResults.filter((t) => t.passed).length;
    console.log("\n==================================================================");
    console.log(`SECURITY AUDIT TEST SUMMARY: ${passedTotal} / ${testResults.length} PASSED`);
    console.log("==================================================================");

    if (passedTotal !== testResults.length) {
      throw new Error(`Audit failures detected: ${testResults.length - passedTotal} tests failed.`);
    }
  } catch (err) {
    console.error("Test execution failed with error:", err);
    throw err;
  } finally {
    await mongoose.connection.close();
  }
}

runSecurityAuditTests()
  .then(() => {
    console.log("All security audit tests completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
