import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import FoodDonation from '../models/FoodDonation.js';
import Notification from '../models/Notification.js';
import { generateToken } from '../utils/jwt.js';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';

async function runPhase3Tests() {
  console.log('--- STARTING PHASE 3 INTEGRATION TEST SUITE ---');

  await connectDB();
  console.log('Connected to MongoDB Atlas for Phase 3 testing.');

  const timestamp = Date.now();
  const testDonorEmail = `p3_donor_${timestamp}@test.com`;
  const testNgoEmail = `p3_ngo_${timestamp}@test.com`;
  const testAdminEmail = `p3_admin_${timestamp}@test.com`;
  const testOtherDonorEmail = `p3_otherdonor_${timestamp}@test.com`;

  let donorUser, ngoUser, adminUser, otherDonorUser;
  let donorToken, ngoToken, adminToken, otherDonorToken;
  let testDonation;

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    } else {
      console.log(`✅ PASS: ${message}`);
      passedTests++;
    }
  }

  try {
    // 0. Setup test users
    donorUser = await User.create({
      name: 'Phase 3 Donor',
      email: testDonorEmail,
      password: 'Password123!',
      role: 'DONOR',
      phone: '1234567890',
      donorDetails: {
        organizationName: 'P3 Bakery',
        organizationType: 'RESTAURANT',
        address: '123 Donor St, Donorville'
      }
    });

    ngoUser = await User.create({
      name: 'Phase 3 NGO',
      email: testNgoEmail,
      password: 'Password123!',
      role: 'NGO',
      phone: '9876543210',
      ngoDetails: {
        ngoName: 'P3 Shelter',
        registrationNumber: `REG-P3-${timestamp}`,
        contactPerson: 'Sarah Jenkins',
        address: '456 NGO Ave, NGO City'
      },
      ngoVerificationStatus: 'VERIFIED',
    });

    adminUser = await User.create({
      name: 'Phase 3 Admin',
      email: testAdminEmail,
      password: 'Password123!',
      role: 'ADMIN',
      phone: '5555555555'
    });

    otherDonorUser = await User.create({
      name: 'Phase 3 Other Donor',
      email: testOtherDonorEmail,
      password: 'Password123!',
      role: 'DONOR',
      phone: '1112223333',
      donorDetails: {
        organizationName: 'P3 Other Deli',
        organizationType: 'RESTAURANT',
        address: '321 Other St, Otherville'
      }
    });

    donorToken = generateToken(donorUser);
    ngoToken = generateToken(ngoUser);
    adminToken = generateToken(adminUser);
    otherDonorToken = generateToken(otherDonorUser);

    console.log('Test users & tokens provisioned successfully.');

    // 1. Profile Management Tests
    console.log('\n--- 1. Testing Profile Management API ---');
    const getProfileRes = await fetch(`${BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    const profileData = await getProfileRes.json();
    assert(getProfileRes.status === 200, 'GET /api/users/profile returns 200');
    assert(profileData.user.email === testDonorEmail, 'GET /api/users/profile returns authenticated user profile');

    // Update profile
    const updateProfileRes = await fetch(`${BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        name: 'Phase 3 Donor Updated',
        phone: '9998887777',
        donorDetails: {
          organizationName: 'P3 Bakery Grand',
          address: '999 Updated St, Donorville'
        },
        role: 'ADMIN', // Tampering attempt
        ngoVerificationStatus: 'VERIFIED' // Tampering attempt
      })
    });
    const updateResult = await updateProfileRes.json();
    assert(updateProfileRes.status === 200, 'PUT /api/users/profile returns 200 on valid update');
    assert(updateResult.user.name === 'Phase 3 Donor Updated', 'Name is updated successfully');
    assert(updateResult.user.phone === '9998887777', 'Phone is updated successfully');
    assert(updateResult.user.role === 'DONOR', 'Role tampering is blocked and remains DONOR');

    // 2. Donation Creation & Dashboard Metrics
    console.log('\n--- 2. Testing Donation Creation & Stats ---');
    const futureDate = new Date(Date.now() + 86400000 * 2);
    const createDonationRes = await fetch(`${BASE_URL}/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        title: 'Artisan Sourdough Loaves',
        category: 'BAKED_GOODS',
        description: 'Freshly baked sourdough surplus loaves',
        totalQuantity: 50,
        quantityUnit: 'kg',
        preparationDateTime: new Date().toISOString(),
        expiryDateTime: futureDate.toISOString(),
        pickupLocation: '123 Donor St, Donorville',
        pickupWindow: '2 hours'
      })
    });
    const createDonationData = await createDonationRes.json();
    assert(createDonationRes.status === 201, 'POST /api/donations creates donation');
    testDonation = createDonationData.donation;

    // Check Donor Dashboard stats
    const donorStatsRes = await fetch(`${BASE_URL}/donations/donor/stats`, {
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    const donorStats = await donorStatsRes.json();
    assert(donorStatsRes.status === 200, 'GET /api/donations/donor/stats returns 200');
    assert(donorStats.stats.totalDonations >= 1, 'Donor stats has totalDonations >= 1');
    assert(donorStats.stats.activeListings >= 1, 'Donor stats has activeListings >= 1');
    assert(typeof donorStats.stats.claimedDonations === 'number', 'Donor stats returns claimedDonations count');
    assert(typeof donorStats.stats.cancelledOrExpiredDonations === 'number', 'Donor stats returns cancelledOrExpiredDonations count');

    // Check NGO Dashboard stats before claim
    const ngoStatsPreRes = await fetch(`${BASE_URL}/requests/ngo/stats`, {
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    const ngoStatsPre = await ngoStatsPreRes.json();
    assert(ngoStatsPreRes.status === 200, 'GET /api/requests/ngo/stats returns 200');
    assert(ngoStatsPre.stats.availableFoodDonations >= 1, 'NGO stats returns availableFoodDonations >= 1');
    assert(typeof ngoStatsPre.stats.totalDonationsClaimed === 'number', 'NGO stats returns totalDonationsClaimed');
    assert(typeof ngoStatsPre.stats.pendingPickups === 'number', 'NGO stats returns pendingPickups');
    assert(typeof ngoStatsPre.stats.completedPickups === 'number', 'NGO stats returns completedPickups');

    // 3. Claim Donation & Coordination / Logistics Scheduling
    console.log('\n--- 3. Testing Claiming and Pickup Logistics Coordination ---');
    const claimRes = await fetch(`${BASE_URL}/donations/${testDonation._id}/claim`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    assert(claimRes.status === 200, 'NGO successfully claims donation');

    // Schedule Pickup by claiming NGO
    const pickupScheduleTime = new Date(Date.now() + 3600000 * 4).toISOString();
    const scheduleByNgoRes = await fetch(`${BASE_URL}/donations/${testDonation._id}/schedule-pickup`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ngoToken}`
      },
      body: JSON.stringify({
        pickupScheduledTime: pickupScheduleTime,
        pickupNotes: 'Volunteer van arriving at rear loading dock.'
      })
    });
    const scheduleByNgoData = await scheduleByNgoRes.json();
    assert(scheduleByNgoRes.status === 200, 'NGO can schedule pickup logistics and add notes');
    assert(scheduleByNgoData.donation.pickupNotes === 'Volunteer van arriving at rear loading dock.', 'Pickup notes persisted');
    assert(Boolean(scheduleByNgoData.donation.pickupScheduledTime), 'Pickup scheduled time persisted');

    // Unauthorized schedule attempt by unrelated donor
    const unauthorizedScheduleRes = await fetch(`${BASE_URL}/donations/${testDonation._id}/schedule-pickup`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherDonorToken}`
      },
      body: JSON.stringify({
        pickupNotes: 'Intruder trying to alter pickup'
      })
    });
    assert(unauthorizedScheduleRes.status === 403, 'Unauthorized third-party user cannot modify pickup schedule (returns 403)');

    // Donor adds their pickup coordination instructions
    const scheduleByDonorRes = await fetch(`${BASE_URL}/donations/${testDonation._id}/schedule-pickup`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        pickupNotes: 'Dock open until 6 PM. Ask for warehouse manager Mike.'
      })
    });
    const scheduleByDonorData = await scheduleByDonorRes.json();
    assert(scheduleByDonorRes.status === 200, 'Donation donor can update pickup logistics and notes');
    assert(scheduleByDonorData.donation.pickupNotes.includes('Ask for warehouse manager Mike'), 'Donor notes updated');

    // 4. Notifications System Testing
    console.log('\n--- 4. Testing Notification System API ---');
    // The NGO should have received notifications
    const ngoNotificationsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    const ngoNotificationsData = await ngoNotificationsRes.json();
    assert(ngoNotificationsRes.status === 200, 'GET /api/notifications returns 200');
    assert(Array.isArray(ngoNotificationsData.notifications), 'Notifications response contains array of notifications');
    assert(ngoNotificationsData.notifications.length >= 1, 'NGO received notifications for pickup/claim');

    // Donor should have unread notifications as well
    const donorNotificationsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    const donorNotificationsData = await donorNotificationsRes.json();
    assert(donorNotificationsRes.status === 200, 'GET /api/notifications for donor returns 200');
    assert(donorNotificationsData.unreadCount >= 1, 'Donor unreadCount > 0 after claim & pickup updates');

    // Mark single notification read
    const notifToRead = ngoNotificationsData.notifications[0];
    const markSingleReadRes = await fetch(`${BASE_URL}/notifications/${notifToRead._id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    const markSingleReadData = await markSingleReadRes.json();
    assert(markSingleReadRes.status === 200, 'PUT /api/notifications/:id/read marks notification as read');
    assert(markSingleReadData.notification.isRead === true, 'Notification isRead is true');

    // Mark all notifications read
    const markAllReadRes = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    assert(markAllReadRes.status === 200, 'PUT /api/notifications/read-all returns 200');

    const ngoUnreadPostRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    const ngoUnreadPostData = await ngoUnreadPostRes.json();
    assert(ngoUnreadPostData.unreadCount === 0, 'NGO unreadCount is 0 after mark-all-read');

    // 5. Pickup & Complete Lifecycle
    console.log('\n--- 5. Testing Pickup & Complete Lifecycle ---');
    const pickupRes = await fetch(`${BASE_URL}/donations/${testDonation._id}/pickup`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    assert(pickupRes.status === 200, 'NGO marks donation as PICKED_UP');

    const completeRes = await fetch(`${BASE_URL}/donations/${testDonation._id}/complete`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    assert(completeRes.status === 200, 'Donor marks donation as COMPLETED');

    // Verify NGO stats updated
    const ngoStatsPostRes = await fetch(`${BASE_URL}/requests/ngo/stats`, {
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    const ngoStatsPost = await ngoStatsPostRes.json();
    assert(ngoStatsPost.stats.completedPickups >= 1, 'NGO stats reflect completedPickups >= 1');
    assert(ngoStatsPost.stats.totalQuantityCollected >= 50, 'NGO stats reflect totalQuantityCollected >= 50 kg');

    // 6. Admin Reports & Analytics API Testing
    console.log('\n--- 6. Testing Admin Reports & Analytics API ---');
    // Test unauthorized access by Donor
    const unauthorizedReportsRes = await fetch(`${BASE_URL}/admin/reports`, {
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    assert(unauthorizedReportsRes.status === 403, 'Donor access to GET /api/admin/reports returns 403 Forbidden');

    // Test authorized access by Admin
    const adminReportsRes = await fetch(`${BASE_URL}/admin/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminReportsData = await adminReportsRes.json();
    assert(adminReportsRes.status === 200, 'Admin access to GET /api/admin/reports returns 200 OK');
    assert(adminReportsData.success === true, 'Admin reports returns success: true');
    assert(typeof adminReportsData.report.totalFoodRedistributed === 'number', 'Report has totalFoodRedistributed');
    assert(adminReportsData.report.completedDonations >= 1, 'Report has completedDonations >= 1');
    assert(Array.isArray(adminReportsData.report.statusDistribution), 'Status distribution is an array');
    assert(Array.isArray(adminReportsData.report.categoryDistribution), 'Category distribution is an array');
    assert(Array.isArray(adminReportsData.report.monthlyVolume), 'Monthly volume timeline is an array');
    assert(Array.isArray(adminReportsData.report.topDonors), 'Top donors leaderboard is an array');
    assert(Array.isArray(adminReportsData.report.topNgos), 'Top NGOs leaderboard is an array');

    // Test date range filtering
    const pastFrom = new Date(Date.now() - 86400000 * 30).toISOString().split('T')[0];
    const pastTo = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const filteredReportsRes = await fetch(`${BASE_URL}/admin/reports?startDate=${pastFrom}&endDate=${pastTo}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const filteredReportsData = await filteredReportsRes.json();
    assert(filteredReportsRes.status === 200, 'Admin reports with startDate and endDate filters returns 200 OK');
    assert(filteredReportsData.report.totalDonations >= 1, 'Filtered reports includes test donation');

    console.log(`\n========================================`);
    console.log(`PHASE 3 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log(`========================================\n`);

  } finally {
    console.log('Cleaning up Phase 3 test data...');
    if (donorUser?._id) await User.deleteOne({ _id: donorUser._id });
    if (ngoUser?._id) await User.deleteOne({ _id: ngoUser._id });
    if (adminUser?._id) await User.deleteOne({ _id: adminUser._id });
    if (otherDonorUser?._id) await User.deleteOne({ _id: otherDonorUser._id });
    if (testDonation?._id) await FoodDonation.deleteOne({ _id: testDonation._id });
    await Notification.deleteMany({
      recipient: { $in: [donorUser?._id, ngoUser?._id, adminUser?._id, otherDonorUser?._id].filter(Boolean) }
    });
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB Atlas.');
  }
}

runPhase3Tests().catch((err) => {
  console.error('Fatal Phase 3 test failure:', err);
  process.exit(1);
});
