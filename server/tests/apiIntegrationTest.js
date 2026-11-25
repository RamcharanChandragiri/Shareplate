import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "../server.js";
import User from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function runApiIntegrationTests() {
  console.log("=== STARTING API HTTP INTEGRATION TESTS ===");
  const testResults = [];
  const logTest = (name, passed, details = "") => {
    testResults.push({ name, passed, details });
    console.log(`${passed ? "✔ PASS" : "✖ FAIL"}: ${name} ${details ? `(${details})` : ""}`);
  };

  // Start HTTP listener on a test port
  const TEST_PORT = 5005;
  const server = app.listen(TEST_PORT);
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  try {
    const timestamp = Date.now();
    const donorEmail = `api_donor_${timestamp}@test.com`;
    const ngoEmail = `api_ngo_${timestamp}@test.com`;
    const testPassword = "StrongPassword123!";

    // 1. POST /api/auth/register (ADMIN forbidden check)
    const adminRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Admin Attempter",
        email: `hacker_${timestamp}@test.com`,
        password: testPassword,
        phone: "1234567890",
        role: "ADMIN"
      })
    });
    const adminRegData = await adminRegRes.json();
    logTest(
      "API: Prevent Public Admin Registration",
      adminRegRes.status === 403 && !adminRegData.success,
      `Status ${adminRegRes.status}: ${adminRegData.message}`
    );

    // 2. POST /api/auth/register (DONOR successful)
    const donorRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Sunrise Bakery",
        email: donorEmail,
        password: testPassword,
        confirmPassword: testPassword,
        phone: "9876501234",
        role: "DONOR",
        donorDetails: {
          organizationName: "Sunrise Bakery & Cafe",
          organizationType: "RESTAURANT",
          address: "101 Ocean Ave"
        }
      })
    });
    const donorRegData = await donorRegRes.json();
    logTest(
      "API: Donor Registration",
      donorRegRes.status === 201 && donorRegData.success && !!donorRegData.token,
      `Token generated, User ID: ${donorRegData.user?.id}`
    );

    // 3. POST /api/auth/register (Duplicate Email Prevention)
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate Person",
        email: donorEmail,
        password: testPassword,
        confirmPassword: testPassword,
        phone: "9876501234",
        role: "DONOR",
        donorDetails: {
          organizationName: "Another Bakery",
          address: "202 River Rd"
        }
      })
    });
    const dupData = await dupRes.json();
    logTest(
      "API: Duplicate Email Rejection (409)",
      dupRes.status === 409 && !dupData.success,
      `Status ${dupRes.status}: ${dupData.message}`
    );

    // 4. POST /api/auth/register (NGO with PENDING status)
    const ngoRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Care For All NGO",
        email: ngoEmail,
        password: testPassword,
        confirmPassword: testPassword,
        phone: "9123499999",
        role: "NGO",
        ngoDetails: {
          ngoName: "Care For All NGO",
          registrationNumber: "NGO-2026-X99",
          contactPerson: "Alice Brown",
          address: "77 Peace Blvd",
          organizationDetails: "Food relief community"
        }
      })
    });
    const ngoRegData = await ngoRegRes.json();
    logTest(
      "API: NGO Registration with PENDING status",
      ngoRegRes.status === 201 && ngoRegData.user?.ngoVerificationStatus === "PENDING",
      `NGO status: ${ngoRegData.user?.ngoVerificationStatus}`
    );

    // 5. POST /api/auth/login (Invalid credentials)
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: donorEmail,
        password: "IncorrectPassword!"
      })
    });
    const badLoginData = await badLoginRes.json();
    logTest(
      "API: Invalid Credentials Rejection (401)",
      badLoginRes.status === 401 && !badLoginData.success,
      `Status ${badLoginRes.status}: ${badLoginData.message}`
    );

    // 6. POST /api/auth/login (Successful login)
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: donorEmail,
        password: testPassword
      })
    });
    const loginData = await loginRes.json();
    const donorToken = loginData.token;
    logTest(
      "API: Successful Login",
      loginRes.status === 200 && loginData.success && !!donorToken,
      `Welcome ${loginData.user?.name} (${loginData.user?.role})`
    );

    // 7. GET /api/auth/me (Protected route without token)
    const unauthMeRes = await fetch(`${BASE_URL}/api/auth/me`);
    logTest(
      "API: Protected Route Without Token Rejection (401)",
      unauthMeRes.status === 401,
      "Unauthorized properly returned"
    );

    // 8. GET /api/auth/me (Protected route with token)
    const authMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    const authMeData = await authMeRes.json();
    logTest(
      "API: Protected Route /api/auth/me with Valid Token",
      authMeRes.status === 200 && authMeData.user?.email === donorEmail,
      `User confirmed: ${authMeData.user?.email}`
    );

    // 9. PUT /api/users/profile (Update profile)
    const updateRes = await fetch(`${BASE_URL}/api/users/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        name: "Sunrise Bakery & Patisserie",
        phone: "9876599999"
      })
    });
    const updateData = await updateRes.json();
    logTest(
      "API: PUT /api/users/profile",
      updateRes.status === 200 && updateData.user?.name === "Sunrise Bakery & Patisserie",
      `Updated name: ${updateData.user?.name}`
    );

    // 10. Role-based Authorization: Donor accessing Admin endpoint /api/users (expect 403)
    const adminCheckRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    logTest(
      "API: Role-Based Authorization (Donor blocked from Admin endpoint)",
      adminCheckRes.status === 403,
      `Status ${adminCheckRes.status} Forbidden`
    );

    // 11. Admin login & access Admin endpoint
    const adminEmail = process.env.ADMIN_EMAIL || "admin@shareplate.org";
    const adminPassword = process.env.ADMIN_PASSWORD || "AdminSharePlate2026!";
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword
      })
    });
    const adminLoginData = await adminLoginRes.json();
    if (adminLoginRes.status === 200) {
      const adminToken = adminLoginData.token;
      const adminUsersRes = await fetch(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const adminUsersData = await adminUsersRes.json();
      logTest(
        "API: Admin Access /api/users (200 OK)",
        adminUsersRes.status === 200 && adminUsersData.count >= 2,
        `Retrieved ${adminUsersData.count} users successfully`
      );

      // 12. Admin verifying NGO
      if (ngoRegData.user?.id) {
        const verifyNgoRes = await fetch(`${BASE_URL}/api/users/${ngoRegData.user.id}/verify-ngo`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify({ status: "VERIFIED" })
        });
        const verifyData = await verifyNgoRes.json();
        logTest(
          "API: Admin Verifying NGO Status to VERIFIED",
          verifyNgoRes.status === 200 && verifyData.user?.ngoVerificationStatus === "VERIFIED",
          `NGO ${verifyData.user?.name} status: ${verifyData.user?.ngoVerificationStatus}`
        );
      }
    }

    // 13. POST /api/auth/logout
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    const logoutData = await logoutRes.json();
    logTest(
      "API: POST /api/auth/logout",
      logoutRes.status === 200 && logoutData.success,
      `Response: ${logoutData.message}`
    );

    // Cleanup test users
    await User.deleteMany({ email: { $in: [donorEmail, ngoEmail] } });
    console.log("Integration test cleanup complete.");

    const allPassed = testResults.every(r => r.passed);
    console.log(`\n=== API SUITE SUMMARY: ${testResults.filter(r => r.passed).length}/${testResults.length} PASSED ===`);

    server.close();
    await mongoose.disconnect();
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error("API test error:", error);
    server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runApiIntegrationTests();
