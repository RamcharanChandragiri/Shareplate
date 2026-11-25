import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import FoodDonation from "../models/FoodDonation.js";
import Notification from "../models/Notification.js";
import { generateToken } from "../utils/jwt.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import app from "../server.js";

async function runPhase2Tests() {
  console.log("==================================================================");
  console.log("    SHAREPLATE — PHASE 2: FOOD DONATION MANAGEMENT TEST SUITE     ");
  console.log("==================================================================");

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

    // Create Test Actors
    const donor1 = await User.create({
      name: "Sunrise Bistro",
      email: `donor1_p2_${timestamp}@test.com`,
      password: testPassword,
      phone: "9876501001",
      role: "DONOR",
      donorDetails: {
        organizationName: "Sunrise Bistro & Cafe",
        organizationType: "RESTAURANT",
        address: "101 Bistro Ave"
      }
    });
    const donor1Token = generateToken(donor1._id, donor1.role);

    const donor2 = await User.create({
      name: "Sunset Diner",
      email: `donor2_p2_${timestamp}@test.com`,
      password: testPassword,
      phone: "9876501002",
      role: "DONOR",
      donorDetails: {
        organizationName: "Sunset Diner",
        organizationType: "RESTAURANT",
        address: "202 Sunset Blvd"
      }
    });
    const donor2Token = generateToken(donor2._id, donor2.role);

    const verifiedNgo1 = await User.create({
      name: "Community Hope NGO",
      email: `ngo_v1_${timestamp}@test.com`,
      password: testPassword,
      phone: "9876501003",
      role: "NGO",
      ngoDetails: {
        ngoName: "Community Hope Foundation",
        registrationNumber: "NGO-REG-001",
        contactPerson: "Sarah Jenkins",
        address: "50 Hope Road"
      },
      ngoVerificationStatus: "VERIFIED"
    });
    const verifiedNgo1Token = generateToken(verifiedNgo1._id, verifiedNgo1.role);

    const verifiedNgo2 = await User.create({
      name: "Food Relief Alliance",
      email: `ngo_v2_${timestamp}@test.com`,
      password: testPassword,
      phone: "9876501004",
      role: "NGO",
      ngoDetails: {
        ngoName: "Food Relief Alliance",
        registrationNumber: "NGO-REG-002",
        contactPerson: "David Miller",
        address: "75 Relief St"
      },
      ngoVerificationStatus: "VERIFIED"
    });
    const verifiedNgo2Token = generateToken(verifiedNgo2._id, verifiedNgo2.role);

    const pendingNgo = await User.create({
      name: "Pending Care Shelter",
      email: `ngo_pen_${timestamp}@test.com`,
      password: testPassword,
      phone: "9876501005",
      role: "NGO",
      ngoDetails: {
        ngoName: "Pending Care",
        registrationNumber: "NGO-REG-003",
        contactPerson: "Tom Clark",
        address: "99 Wait Lane"
      },
      ngoVerificationStatus: "PENDING"
    });
    const pendingNgoToken = generateToken(pendingNgo._id, pendingNgo.role);

    const rejectedNgo = await User.create({
      name: "Rejected Shelter",
      email: `ngo_rej_${timestamp}@test.com`,
      password: testPassword,
      phone: "9876501006",
      role: "NGO",
      ngoDetails: {
        ngoName: "Rejected Shelter",
        registrationNumber: "NGO-REG-004",
        contactPerson: "Jake Ross",
        address: "00 Rejected Rd"
      },
      ngoVerificationStatus: "REJECTED"
    });
    const rejectedNgoToken = generateToken(rejectedNgo._id, rejectedNgo.role);

    const adminUser = await User.create({
      name: "P2 Admin",
      email: `admin_p2_${timestamp}@test.com`,
      password: testPassword,
      phone: "9876501007",
      role: "ADMIN"
    });
    const adminToken = generateToken(adminUser._id, adminUser.role);

    // =========================================================================
    // 1. TEST FOOD DONATION CREATION (DONOR)
    // =========================================================================
    console.log("\n--- 1. Testing Food Donation Creation ---");
    // Invalid: past expiry date
    const pastExpiryRes = await fetch(`${BASE_URL}/api/donations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${donor1Token}` },
      body: JSON.stringify({
        title: "Old Pasta",
        category: "COOKED_MEALS",
        description: "Pasta cooked yesterday",
        totalQuantity: 20,
        quantityUnit: "meals",
        preparationDateTime: new Date(),
        expiryDateTime: new Date(Date.now() - 3600000), // 1 hour ago
        pickupLocation: "101 Bistro Ave",
        pickupWindow: "2:00 PM - 5:00 PM"
      })
    });
    logTest(
      "Reject Past Expiry Date on Creation",
      pastExpiryRes.status === 400,
      `Status: ${pastExpiryRes.status}`
    );

    // Valid: create full donation with image
    const createRes = await fetch(`${BASE_URL}/api/donations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${donor1Token}` },
      body: JSON.stringify({
        title: "Fresh Biryani & Raita",
        category: "COOKED_MEALS",
        description: "Freshly cooked vegetable biryani with cucumber raita, packaged in 50 single-serve containers.",
        totalQuantity: 50,
        quantityUnit: "meals",
        preparationDateTime: new Date(),
        expiryDateTime: new Date(Date.now() + 18 * 3600000), // 18 hours in future
        pickupLocation: "101 Bistro Ave, Kitchen Loading Bay",
        pickupWindow: "3:00 PM - 6:00 PM",
        imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8",
        specialInstructions: "Use kitchen side gate; ask for Chef Leo."
      })
    });
    const createData = await createRes.json();
    const createdDonation = createData.donation;
    logTest(
      "Successful Food Donation Creation",
      createRes.status === 201 && createdDonation?.status === "AVAILABLE" && createdDonation?.totalQuantity === 50,
      `Created ID: ${createdDonation?._id}, Status: ${createdDonation?.status}`
    );

    // Create a second donation by donor 1 for cancellation test
    const donToCancelRes = await fetch(`${BASE_URL}/api/donations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${donor1Token}` },
      body: JSON.stringify({
        title: "Excess Bagels & Bread",
        category: "BAKED_GOODS",
        description: "Freshly baked artisan sourdough bagels and whole wheat baguettes.",
        totalQuantity: 30,
        quantityUnit: "pieces",
        preparationDateTime: new Date(),
        expiryDateTime: new Date(Date.now() + 24 * 3600000),
        pickupLocation: "101 Bistro Ave",
        pickupWindow: "Now - 8:00 PM"
      })
    });
    const cancelTargetData = await donToCancelRes.json();
    const donationToCancel = cancelTargetData.donation;

    // =========================================================================
    // 2. TEST DONATION EDITING & CANCELLATION (DONOR)
    // =========================================================================
    console.log("\n--- 2. Testing Donation Editing and Cancellation ---");
    // Cross-donor edit attempt (Donor 2 tries to edit Donor 1's listing)
    const crossEditRes = await fetch(`${BASE_URL}/api/donations/${createdDonation._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${donor2Token}` },
      body: JSON.stringify({ title: "Tampered by Donor 2" })
    });
    logTest(
      "Cross-Donor Donation Edit Blocked",
      crossEditRes.status === 403,
      `Status: ${crossEditRes.status}`
    );

    // Legitimate edit by Owner (Donor 1)
    const ownerEditRes = await fetch(`${BASE_URL}/api/donations/${createdDonation._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${donor1Token}` },
      body: JSON.stringify({
        title: "Fresh Vegetable Biryani & Raita (50 Meals)",
        pickupWindow: "2:30 PM - 6:30 PM"
      })
    });
    const ownerEditData = await ownerEditRes.json();
    logTest(
      "Owner Successfully Edits Donation",
      ownerEditRes.status === 200 && ownerEditData.donation?.title.includes("(50 Meals)"),
      `Updated Title: ${ownerEditData.donation?.title}`
    );

    // Cancel unclaimed donation by Owner
    const cancelRes = await fetch(`${BASE_URL}/api/donations/${donationToCancel._id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${donor1Token}` }
    });
    const cancelData = await cancelRes.json();
    logTest(
      "Donor Cancels Unclaimed Donation",
      cancelRes.status === 200 && cancelData.donation?.status === "CANCELLED",
      `Status: ${cancelData.donation?.status}`
    );

    // =========================================================================
    // 3. TEST NGO BROWSING, FILTERING & SORTING
    // =========================================================================
    console.log("\n--- 3. Testing NGO Browsing & Filters ---");
    // Browse available listings
    const browseRes = await fetch(`${BASE_URL}/api/donations`, {
      headers: { Authorization: `Bearer ${verifiedNgo1Token}` }
    });
    const browseData = await browseRes.json();
    logTest(
      "Verified NGO Browses Available Listings",
      browseRes.status === 200 && Array.isArray(browseData.donations),
      `Found: ${browseData.donations?.length} listings`
    );

    // Filter by category
    const catRes = await fetch(`${BASE_URL}/api/donations?category=COOKED_MEALS`, {
      headers: { Authorization: `Bearer ${verifiedNgo1Token}` }
    });
    const catData = await catRes.json();
    const allCooked = catData.donations?.every((d) => d.category === "COOKED_MEALS");
    logTest(
      "Category Filtering (COOKED_MEALS)",
      catRes.status === 200 && allCooked,
      `Filtered count: ${catData.donations?.length}`
    );

    // Sorting by nearest expiry
    const sortRes = await fetch(`${BASE_URL}/api/donations?sortBy=expiry`, {
      headers: { Authorization: `Bearer ${verifiedNgo1Token}` }
    });
    const sortData = await sortRes.json();
    logTest(
      "Sorting by Nearest Expiry",
      sortRes.status === 200 && sortData.donations?.length > 0,
      `First expiring: ${sortData.donations?.[0]?.title}`
    );

    // =========================================================================
    // 4. TEST SUCCESSFUL DONATION CLAIMING (NGO)
    // =========================================================================
    console.log("\n--- 4. Testing Successful Donation Claiming ---");
    const claimRes = await fetch(`${BASE_URL}/api/donations/${createdDonation._id}/claim`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${verifiedNgo1Token}` }
    });
    const claimData = await claimRes.json();
    logTest(
      "Verified NGO Successfully Claims Donation",
      claimRes.status === 200 &&
        claimData.donation?.status === "CLAIMED" &&
        claimData.donation?.claimedBy?._id?.toString() === verifiedNgo1._id.toString(),
      `Status: ${claimData.donation?.status}, Claimed By: ${claimData.donation?.claimedBy?.name}`
    );

    // Test Pickup and Completion transitions
    const pickupRes = await fetch(`${BASE_URL}/api/donations/${createdDonation._id}/pickup`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${donor1Token}` }
    });
    const pickupData = await pickupRes.json();
    logTest(
      "Status Transition: CLAIMED -> PICKED_UP",
      pickupRes.status === 200 && pickupData.donation?.status === "PICKED_UP",
      `Status: ${pickupData.donation?.status}`
    );

    const completeRes = await fetch(`${BASE_URL}/api/donations/${createdDonation._id}/complete`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${donor1Token}` }
    });
    const completeData = await completeRes.json();
    logTest(
      "Status Transition: PICKED_UP -> COMPLETED",
      completeRes.status === 200 && completeData.donation?.status === "COMPLETED",
      `Status: ${completeData.donation?.status}`
    );

    // Cannot cancel after claimed/completed
    const cancelClaimedRes = await fetch(`${BASE_URL}/api/donations/${createdDonation._id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${donor1Token}` }
    });
    logTest(
      "Cannot Cancel Claimed/Completed Donation",
      cancelClaimedRes.status === 400,
      `Status: ${cancelClaimedRes.status}`
    );

    // =========================================================================
    // 5. TEST DUPLICATE CLAIM PREVENTION (CONCURRENCY)
    // =========================================================================
    console.log("\n--- 5. Testing Concurrency: Duplicate Claim Prevention ---");
    // Create fresh available donation for race condition test
    const raceDonation = await FoodDonation.create({
      donor: donor1._id,
      title: "Race Condition Curry",
      category: "COOKED_MEALS",
      description: "Surplus curry for simultaneous claim testing",
      totalQuantity: 25,
      availableQuantity: 25,
      reservedQuantity: 0,
      fulfilledQuantity: 0,
      quantityUnit: "meals",
      preparationDateTime: new Date(),
      expiryDateTime: new Date(Date.now() + 24 * 3600000),
      pickupLocation: "101 Bistro Ave",
      pickupWindow: "Now",
      status: "AVAILABLE"
    });

    // Fire 5 simultaneous claims from verified NGO 1 and verified NGO 2
    const claimPromises = [1, 2, 3, 4, 5].map((i) =>
      fetch(`${BASE_URL}/api/donations/${raceDonation._id}/claim`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${i % 2 === 0 ? verifiedNgo1Token : verifiedNgo2Token}` }
      }).then(async (res) => ({ status: res.status, data: await res.json() }))
    );

    const claimRaceResults = await Promise.all(claimPromises);
    const claimWins = claimRaceResults.filter((r) => r.status === 200).length;
    const claimConflicts = claimRaceResults.filter((r) => r.status === 409).length;

    const freshRaceDonation = await FoodDonation.findById(raceDonation._id);
    logTest(
      "Duplicate Claim Race Condition Prevention",
      claimWins === 1 && claimConflicts === 4 && freshRaceDonation.status === "CLAIMED",
      `Successes: ${claimWins}, Conflicts (409): ${claimConflicts}, Final Status: ${freshRaceDonation.status}`
    );

    // =========================================================================
    // 6. TEST PENDING / REJECTED NGO RESTRICTIONS
    // =========================================================================
    console.log("\n--- 6. Testing Unverified NGO Restrictions ---");
    const freshTargetDonation = await FoodDonation.create({
      donor: donor1._id,
      title: "Target Fruit Baskets",
      category: "FRUITS_VEGETABLES",
      description: "Apples, bananas, and oranges",
      totalQuantity: 15,
      availableQuantity: 15,
      reservedQuantity: 0,
      fulfilledQuantity: 0,
      quantityUnit: "kg",
      preparationDateTime: new Date(),
      expiryDateTime: new Date(Date.now() + 24 * 3600000),
      pickupLocation: "101 Bistro Ave",
      pickupWindow: "Now",
      status: "AVAILABLE"
    });

    const pendingClaimRes = await fetch(`${BASE_URL}/api/donations/${freshTargetDonation._id}/claim`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${pendingNgoToken}` }
    });
    logTest(
      "Pending NGO Blocked from Claiming",
      pendingClaimRes.status === 403,
      `Status: ${pendingClaimRes.status}`
    );

    const rejectedClaimRes = await fetch(`${BASE_URL}/api/donations/${freshTargetDonation._id}/claim`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${rejectedNgoToken}` }
    });
    logTest(
      "Rejected NGO Blocked from Claiming",
      rejectedClaimRes.status === 403,
      `Status: ${rejectedClaimRes.status}`
    );

    // =========================================================================
    // 7. TEST EXPIRED DONATION RESTRICTIONS
    // =========================================================================
    console.log("\n--- 7. Testing Expired Donation Restrictions ---");
    const expiredDonation = await FoodDonation.create({
      donor: donor1._id,
      title: "Expired Dairy Yoghurt",
      category: "DAIRY",
      description: "Past consumption date",
      totalQuantity: 10,
      availableQuantity: 10,
      reservedQuantity: 0,
      fulfilledQuantity: 0,
      quantityUnit: "cups",
      preparationDateTime: new Date(Date.now() - 48 * 3600000),
      expiryDateTime: new Date(Date.now() - 3600000), // 1 hour ago
      pickupLocation: "101 Bistro Ave",
      pickupWindow: "Expired",
      status: "AVAILABLE"
    });

    const claimExpiredRes = await fetch(`${BASE_URL}/api/donations/${expiredDonation._id}/claim`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${verifiedNgo1Token}` }
    });
    logTest(
      "Claim on Expired Donation Rejected",
      claimExpiredRes.status === 400,
      `Status: ${claimExpiredRes.status}`
    );

    // =========================================================================
    // 8. TEST ROLE-BASED ACCESS RESTRICTIONS
    // =========================================================================
    console.log("\n--- 8. Testing Role-Based Authorization ---");
    // Donor attempting to claim food (Donor cannot claim, only NGOs)
    const donorClaimAttempt = await fetch(`${BASE_URL}/api/donations/${freshTargetDonation._id}/claim`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${donor2Token}` }
    });
    logTest(
      "Donor Forbidden from Claiming Donations",
      donorClaimAttempt.status === 403,
      `Status: ${donorClaimAttempt.status}`
    );

    // NGO attempting to publish donation (NGO cannot create donations, only Donors)
    const ngoCreateAttempt = await fetch(`${BASE_URL}/api/donations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${verifiedNgo1Token}` },
      body: JSON.stringify({
        title: "Illegal NGO Donation",
        category: "COOKED_MEALS",
        description: "Testing role block",
        totalQuantity: 10,
        quantityUnit: "meals",
        preparationDateTime: new Date(),
        expiryDateTime: new Date(Date.now() + 24 * 3600000),
        pickupLocation: "Somewhere",
        pickupWindow: "Anytime"
      })
    });
    logTest(
      "NGO Forbidden from Publishing Donations",
      ngoCreateAttempt.status === 403,
      `Status: ${ngoCreateAttempt.status}`
    );

    // Unauthenticated request
    const unauthRes = await fetch(`${BASE_URL}/api/donations/my`);
    logTest(
      "Unauthenticated Request Blocked (401)",
      unauthRes.status === 401,
      `Status: ${unauthRes.status}`
    );

    // Admin monitoring all donations
    const adminDonationsRes = await fetch(`${BASE_URL}/api/admin/donations`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminDonationsData = await adminDonationsRes.json();
    logTest(
      "Admin Successfully Views All Donations",
      adminDonationsRes.status === 200 && Array.isArray(adminDonationsData.donations),
      `Total Platform Donations Monitored: ${adminDonationsData.donations?.length}`
    );

    // =========================================================================
    // 9. TEST MONGODB PERSISTENCE & DATA CONSTRAINTS
    // =========================================================================
    console.log("\n--- 9. Testing MongoDB Persistence & Integrity ---");
    const dbDonation = await FoodDonation.findById(createdDonation._id)
      .populate("donor")
      .populate("claimedBy");
    const persistenceValid =
      dbDonation !== null &&
      dbDonation.donor._id.toString() === donor1._id.toString() &&
      dbDonation.status === "COMPLETED" &&
      dbDonation.fulfilledQuantity === 50 &&
      dbDonation.createdAt instanceof Date;

    logTest(
      "MongoDB Document Persistence & Population Validated",
      persistenceValid,
      `Verified MongoDB ID: ${dbDonation?._id}, timestamps: ${dbDonation?.createdAt}`
    );

    // Cleanup
    console.log("\n--- Cleaning up temporary Phase 2 test records ---");
    await User.deleteMany({
      email: {
        $in: [
          donor1.email,
          donor2.email,
          verifiedNgo1.email,
          verifiedNgo2.email,
          pendingNgo.email,
          rejectedNgo.email,
          adminUser.email
        ]
      }
    });
    await FoodDonation.deleteMany({
      _id: {
        $in: [
          createdDonation._id,
          donationToCancel._id,
          raceDonation._id,
          freshTargetDonation._id,
          expiredDonation._id
        ]
      }
    });

    const passedTotal = testResults.filter((t) => t.passed).length;
    console.log("\n==================================================================");
    console.log(`PHASE 2 TEST SUMMARY: ${passedTotal} / ${testResults.length} PASSED`);
    console.log("==================================================================");

    if (passedTotal !== testResults.length) {
      throw new Error(`Phase 2 test failures: ${testResults.length - passedTotal} tests failed.`);
    }
  } catch (err) {
    console.error("Test execution failed with error:", err);
    throw err;
  } finally {
    await mongoose.connection.close();
  }
}

runPhase2Tests()
  .then(() => {
    console.log("Phase 2 test suite completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Phase 2 test suite failed:", err);
    process.exit(1);
  });
