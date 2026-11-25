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
import app from "../server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function runPhase2And3Tests() {
  console.log("=== STARTING PHASE 2 & 3 AUTOMATED WORKFLOW TESTS ===");
  await connectDB();

  const testResults = [];
  const logTest = (name, passed, details = "") => {
    testResults.push({ name, passed, details });
    console.log(`${passed ? "✔ PASS" : "✖ FAIL"}: ${name} ${details ? `(${details})` : ""}`);
  };

  const TEST_PORT = 5006;
  const server = app.listen(TEST_PORT);
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  try {
    const timestamp = Date.now();
    const donorEmail = `donor_p2_${timestamp}@test.com`;
    const verifiedNgoEmail = `ngo_verified_${timestamp}@test.com`;
    const unverifiedNgoEmail = `ngo_unverified_${timestamp}@test.com`;
    const testPassword = "Password123!";

    // 1. Setup Test Users directly
    const donorUser = await User.create({
      name: "Grand Hotel Kitchen",
      email: donorEmail,
      password: testPassword,
      phone: "9876500001",
      role: "DONOR",
      donorDetails: {
        organizationName: "Grand Hotel",
        organizationType: "HOTEL",
        address: "700 Luxury Blvd"
      }
    });
    const donorToken = generateToken(donorUser._id, donorUser.role);

    const verifiedNgo = await User.create({
      name: "City Food Bank",
      email: verifiedNgoEmail,
      password: testPassword,
      phone: "9876500002",
      role: "NGO",
      ngoDetails: {
        ngoName: "City Food Bank",
        registrationNumber: "NGO-V-123",
        contactPerson: "Mark Stone",
        address: "12 Charity St"
      },
      ngoVerificationStatus: "VERIFIED"
    });
    const verifiedNgoToken = generateToken(verifiedNgo._id, verifiedNgo.role);

    const unverifiedNgo = await User.create({
      name: "New Shelter",
      email: unverifiedNgoEmail,
      password: testPassword,
      phone: "9876500003",
      role: "NGO",
      ngoDetails: {
        ngoName: "New Shelter",
        registrationNumber: "NGO-U-456",
        contactPerson: "Sarah Connor",
        address: "99 Hope Rd"
      },
      ngoVerificationStatus: "PENDING"
    });
    const unverifiedNgoToken = generateToken(unverifiedNgo._id, unverifiedNgo.role);

    // 2. Test Donor Creates Food Donation
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24 hours
    const createDonationRes = await fetch(`${BASE_URL}/api/donations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        title: "Buffet Dinner Trays",
        category: "COOKED_MEALS",
        description: "Fresh pasta, steamed veggies, and rice bowls prepared this evening.",
        totalQuantity: 50,
        quantityUnit: "meals",
        preparationDateTime: new Date().toISOString(),
        expiryDateTime: futureExpiry.toISOString(),
        pickupLocation: "Grand Hotel Back Entrance, Bay 2",
        pickupWindow: "10:00 PM - 11:30 PM",
        specialInstructions: "Bring insulated thermal containers."
      })
    });
    const donationData = await createDonationRes.json();
    const donationId = donationData.donation?._id;
    logTest(
      "Donation Creation (Donor)",
      createDonationRes.status === 201 && donationData.donation?.availableQuantity === 50,
      `Created: ${donationData.donation?.title} (${donationData.donation?.availableQuantity} meals)`
    );

    // 3. Test NGO Browse Listings
    const browseRes = await fetch(`${BASE_URL}/api/donations?category=COOKED_MEALS`, {
      headers: { Authorization: `Bearer ${verifiedNgoToken}` }
    });
    const browseData = await browseRes.json();
    logTest(
      "NGO Browse & Filter Donations",
      browseRes.status === 200 && browseData.donations?.some((d) => d._id === donationId),
      `Found ${browseData.count} listings matching category COOKED_MEALS`
    );

    // 4. Test Unverified NGO Blocked from Requesting
    const unverifiedReqRes = await fetch(`${BASE_URL}/api/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${unverifiedNgoToken}`
      },
      body: JSON.stringify({
        donationId,
        requestedQuantity: 10
      })
    });
    logTest(
      "Unverified NGO Request Block (403)",
      unverifiedReqRes.status === 403,
      "Pending NGO rejected with 403 Forbidden"
    );

    // 5. Test Verified NGO Partial Request & Atomic Reservation
    const partialReqRes = await fetch(`${BASE_URL}/api/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${verifiedNgoToken}`
      },
      body: JSON.stringify({
        donationId,
        requestedQuantity: 20
      })
    });
    const partialReqData = await partialReqRes.json();
    const requestId = partialReqData.request?._id;

    // Check updated donation in DB
    const donationAfterReq = await FoodDonation.findById(donationId);
    logTest(
      "Atomic Quantity Reservation (50 -> 30 available, 20 reserved)",
      partialReqRes.status === 201 &&
        donationAfterReq.availableQuantity === 30 &&
        donationAfterReq.reservedQuantity === 20 &&
        donationAfterReq.status === "PARTIALLY_RESERVED",
      `Available: ${donationAfterReq.availableQuantity}, Reserved: ${donationAfterReq.reservedQuantity}`
    );

    // 6. Test Insufficient Quantity Request Rejected
    const overReqRes = await fetch(`${BASE_URL}/api/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${verifiedNgoToken}`
      },
      body: JSON.stringify({
        donationId,
        requestedQuantity: 35 // exceeds remaining 30!
      })
    });
    const overReqData = await overReqRes.json();
    logTest(
      "Prevent Over-Reservation Beyond Available Quantity (409)",
      overReqRes.status === 409,
      `Status 409: ${overReqData.message}`
    );

    // 7. Test Expired Listing Rejection
    const expiredDonation = await FoodDonation.create({
      donor: donorUser._id,
      title: "Expired Bread",
      category: "BAKED_GOODS",
      description: "Past deadline",
      totalQuantity: 10,
      availableQuantity: 10,
      quantityUnit: "loaves",
      preparationDateTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
      expiryDateTime: new Date(Date.now() - 1000), // in the past!
      pickupLocation: "Bakery",
      pickupWindow: "Morning",
      status: "EXPIRED"
    });
    const expiredReqRes = await fetch(`${BASE_URL}/api/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${verifiedNgoToken}`
      },
      body: JSON.stringify({
        donationId: expiredDonation._id,
        requestedQuantity: 5
      })
    });
    logTest(
      "Expired Listing Rejection",
      expiredReqRes.status === 400,
      "Expired listing properly rejected"
    );

    // 8. Test Donor View Incoming Requests
    const incomingRes = await fetch(`${BASE_URL}/api/requests/incoming`, {
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    const incomingData = await incomingRes.json();
    logTest(
      "Donor View Incoming Requests",
      incomingRes.status === 200 && incomingData.requests?.some((r) => r._id === requestId),
      `Found ${incomingData.count} incoming requests`
    );

    // 9. Test Donor Approves Request & Coordinates Pickup
    const approveRes = await fetch(`${BASE_URL}/api/requests/${requestId}/approve`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        donorResponse: "Approved with pleasure. Come to loading dock.",
        pickupScheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        pickupNotes: "Ask for Chef Marco at Gate 3."
      })
    });
    const approveData = await approveRes.json();
    logTest(
      "Donor Approve Request & Set Pickup Coordination",
      approveRes.status === 200 && approveData.request?.status === "APPROVED",
      `Status: ${approveData.request?.status}`
    );

    // 10. Test Donor Marks Food Ready for Pickup
    const readyRes = await fetch(`${BASE_URL}/api/requests/${requestId}/ready-for-pickup`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    const readyData = await readyRes.json();
    logTest(
      "Donor Marks Food Ready for Pickup",
      readyRes.status === 200 && readyData.request?.status === "READY_FOR_PICKUP",
      `Status: ${readyData.request?.status}`
    );

    // 11. Test Handover & Collection Dual Confirmation Workflow
    // Step A: Donor confirms handover
    const handoverRes = await fetch(`${BASE_URL}/api/requests/${requestId}/confirm-handover`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    const handoverData = await handoverRes.json();
    logTest(
      "Donor Confirms Handover (Awaiting NGO confirmation)",
      handoverRes.status === 200 &&
        handoverData.request?.handoverConfirmedByDonor &&
        handoverData.request?.status === "READY_FOR_PICKUP",
      "Handover recorded, status remains pending collection"
    );

    // Step B: NGO confirms collection -> triggers COMPLETED!
    const collectRes = await fetch(`${BASE_URL}/api/requests/${requestId}/confirm-collection`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${verifiedNgoToken}` }
    });
    const collectData = await collectRes.json();

    const donationAfterCompletion = await FoodDonation.findById(donationId);
    logTest(
      "NGO Confirms Collection -> Triggers Request COMPLETED & Shifts Quantities",
      collectRes.status === 200 &&
        collectData.request?.status === "COMPLETED" &&
        donationAfterCompletion.fulfilledQuantity === 20 &&
        donationAfterCompletion.reservedQuantity === 0 &&
        donationAfterCompletion.availableQuantity === 30,
      `Request: ${collectData.request?.status}, Fulfilled: ${donationAfterCompletion.fulfilledQuantity}, Reserved: ${donationAfterCompletion.reservedQuantity}`
    );

    // Step C: Duplicate confirmation prevention
    const duplicateCollectRes = await fetch(`${BASE_URL}/api/requests/${requestId}/confirm-collection`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${verifiedNgoToken}` }
    });
    logTest(
      "Prevent Duplicate Confirmation on Completed Request (400)",
      duplicateCollectRes.status === 400,
      "Duplicate completion attempt blocked"
    );

    // 12. Test Request Rejection / Cancellation Restores Quantity
    // NGO requests 15 meals
    const secondReqRes = await fetch(`${BASE_URL}/api/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${verifiedNgoToken}`
      },
      body: JSON.stringify({
        donationId,
        requestedQuantity: 15
      })
    });
    const secondReqData = await secondReqRes.json();
    const secondRequestId = secondReqData.request?._id;

    // Donor rejects request -> quantity should be restored!
    const rejectRes = await fetch(`${BASE_URL}/api/requests/${secondRequestId}/reject`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        rejectionReason: "Distribution truck cannot handle that pickup volume."
      })
    });
    const donationAfterRejection = await FoodDonation.findById(donationId);
    logTest(
      "Request Rejection Restores Reserved Quantity to Available Surplus",
      rejectRes.status === 200 && donationAfterRejection.availableQuantity === 30,
      `Restored Available Quantity: ${donationAfterRejection.availableQuantity}`
    );

    // 13. Test Notifications Delivery
    const notifsRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    const notifsData = await notifsRes.json();
    logTest(
      "In-App Notifications Generated & Fetched",
      notifsRes.status === 200 && notifsData.notifications?.length > 0,
      `Received ${notifsData.notifications?.length} notifications (Unread: ${notifsData.unreadCount})`
    );

    // Mark notification as read
    const firstNotifId = notifsData.notifications[0]._id;
    const readRes = await fetch(`${BASE_URL}/api/notifications/${firstNotifId}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    const readData = await readRes.json();
    logTest(
      "Mark Notification As Read",
      readRes.status === 200 && readData.notification?.isRead === true,
      `Notification ${firstNotifId} marked as read`
    );

    // 14. Test Admin Metrics & System Oversight
    const adminEmail = process.env.ADMIN_EMAIL || "admin@shareplate.org";
    const adminPassword = process.env.ADMIN_PASSWORD || "AdminSharePlate2026!";
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token;

    const adminMetricsRes = await fetch(`${BASE_URL}/api/admin/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminMetricsData = await adminMetricsRes.json();
    logTest(
      "Admin Metrics & Platform Overview",
      adminMetricsRes.status === 200 &&
        adminMetricsData.metrics?.totalDonations >= 1 &&
        adminMetricsData.metrics?.totalMealsRescued >= 20,
      `Rescued meals metric: ${adminMetricsData.metrics?.totalMealsRescued}, Total users: ${adminMetricsData.metrics?.totalUsers}`
    );

    // 15. Test Admin Suspending & Reactivating Account
    const suspendRes = await fetch(`${BASE_URL}/api/admin/users/${donorUser._id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: "SUSPENDED" })
    });
    const suspendData = await suspendRes.json();
    logTest(
      "Admin Suspend User Account",
      suspendRes.status === 200 && suspendData.user?.accountStatus === "SUSPENDED",
      `Account status: ${suspendData.user?.accountStatus}`
    );

    // Suspended donor cannot create donation
    const suspendedActionRes = await fetch(`${BASE_URL}/api/donations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${donorToken}`
      },
      body: JSON.stringify({ title: "Test" })
    });
    logTest(
      "Suspended User Blocked From Protected APIs (403)",
      suspendedActionRes.status === 403,
      "Access denied for suspended account"
    );

    // Cleanup test data
    await FoodRequest.deleteMany({ _id: { $in: [requestId, secondRequestId] } });
    await FoodDonation.deleteMany({ _id: { $in: [donationId, expiredDonation._id] } });
    await Notification.deleteMany({ recipient: { $in: [donorUser._id, verifiedNgo._id, unverifiedNgo._id] } });
    await User.deleteMany({ _id: { $in: [donorUser._id, verifiedNgo._id, unverifiedNgo._id] } });
    console.log("Cleanup completed.");

    const allPassed = testResults.every((r) => r.passed);
    console.log(`\n=== SUITE SUMMARY: ${testResults.filter((r) => r.passed).length}/${testResults.length} PASSED ===`);

    server.close();
    await mongoose.disconnect();
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error("Test execution error:", error);
    server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runPhase2And3Tests();
