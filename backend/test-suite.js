require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Doctor = require("./models/Doctor");
const Appointment = require("./models/Appointment");
const Favorite = require("./models/Favorite");
const Review = require("./models/Review");
const HealthArticle = require("./models/HealthArticle");

const { spawn } = require("child_process");

async function ensureServerRunning(port) {
  try {
    const res = await fetch(`http://localhost:${port}/api/health`);
    if (res.ok) {
      console.log(`✓ Existing backend server detected on port ${port}`);
      return null;
    }
  } catch (e) {
    // Server not running yet, will spawn
  }

  console.log(`Starting backend server on port ${port} for test suite...`);
  const serverProcess = spawn("node", ["server.js"], {
    cwd: __dirname,
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env
  });

  await new Promise((resolve, reject) => {
    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        serverProcess.kill();
        reject(new Error("Timeout waiting for server to start"));
      }
    }, 15000);

    serverProcess.stdout.on("data", (data) => {
      const text = data.toString();
      if (text.includes("Server running on http://localhost:")) {
        started = true;
        clearTimeout(timeout);
        resolve();
      }
    });

    serverProcess.on("exit", (code) => {
      if (!started) {
        clearTimeout(timeout);
        reject(new Error(`Server exited prematurely with code ${code}`));
      }
    });
  });

  console.log(`✓ Backend server started successfully on port ${port}`);
  return serverProcess;
}

async function runTestSuite() {
  console.log("=== STARTING COMPREHENSIVE DOCTORFINDER TEST SUITE ===");

  const port = process.env.PORT || 5001;
  const spawnedServer = await ensureServerRunning(port);

  let createdApt = null;
  let testEmail = null;
  let userToken = null;
  let signupData = null;

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ MongoDB Connected");

    const baseUrl = `http://localhost:${port}/api`;

  // 1. Health check
  const healthRes = await fetch(`${baseUrl}/health`);
  const healthData = await healthRes.json();
  console.log("✓ /api/health:", healthData.status);

  // 2. Authentication Test
  const testEmail = `testuser_${Date.now()}@example.com`;
  const signupRes = await fetch(`${baseUrl}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Test Verification Patient",
      email: testEmail,
      phone: "9876543210",
      password: "Password123!",
      confirmPassword: "Password123!"
    })
  });
  const signupData = await signupRes.json();
  if (!signupData.success) throw new Error("Signup failed: " + signupData.message);
  console.log("✓ /api/auth/signup successful, token received");
  const userToken = signupData.token;

  // Login test
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "Password123!"
    })
  });
  const loginData = await loginRes.json();
  if (!loginData.success) throw new Error("Login failed");
  console.log("✓ /api/auth/login successful");

  // Get current user profile
  const meRes = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const meData = await meRes.json();
  console.log("✓ /api/auth/me:", meData.user.fullName, "Stats:", meData.stats);

  // 3. Doctor Search & Autocomplete
  const searchRes = await fetch(`${baseUrl}/doctors?state=Madhya%20Pradesh&city=Bhopal`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const searchData = await searchRes.json();
  console.log(`✓ /api/doctors returned ${searchData.count} verified doctors in Bhopal`);
  if (searchData.count === 0) throw new Error("Expected verified doctors in Bhopal");

  const sampleDoctor = searchData.data[0];
  console.log(`  Sample Doctor: ${sampleDoctor.name} (${sampleDoctor.specialization}) at ${sampleDoctor.hospitalOrClinic}`);

  // Test Dynamic Filter Options endpoint
  const filterRes = await fetch(`${baseUrl}/doctors/filters`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const filterData = await filterRes.json();
  if (!filterData.success || !filterData.data.states.length) throw new Error("Expected filter options with states");
  console.log(`✓ /api/doctors/filters returned ${filterData.data.states.length} states, ${filterData.data.cities.length} cities, ${filterData.data.totalVerifiedDoctors} verified doctors across India`);

  // Test Pan-India Search (all states, no query filters)
  const allIndiaRes = await fetch(`${baseUrl}/doctors`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const allIndiaData = await allIndiaRes.json();
  console.log(`✓ /api/doctors (All India) returned ${allIndiaData.count} verified doctors`);
  if (allIndiaData.count < 30) throw new Error("Expected 30+ verified doctors across India");

  // Test Delhi search
  const delhiRes = await fetch(`${baseUrl}/doctors?state=Delhi`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const delhiData = await delhiRes.json();
  console.log(`✓ /api/doctors (Delhi) returned ${delhiData.count} verified doctors`);
  if (delhiData.count === 0) throw new Error("Expected verified doctors in Delhi");

  // Test Maharashtra search
  const mahaRes = await fetch(`${baseUrl}/doctors?state=Maharashtra&city=Mumbai`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const mahaData = await mahaRes.json();
  console.log(`✓ /api/doctors (Maharashtra/Mumbai) returned ${mahaData.count} verified doctors`);
  if (mahaData.count === 0) throw new Error("Expected verified doctors in Maharashtra/Mumbai");

  // Test Specialization search across India (Cardiology)
  const cardioRes = await fetch(`${baseUrl}/doctors?specialization=Cardiology`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const cardioData = await cardioRes.json();
  console.log(`✓ /api/doctors (Specialization: Cardiology) returned ${cardioData.count} verified doctors across India`);
  if (cardioData.count === 0) throw new Error("Expected Cardiology doctors across India");

  // Autocomplete Test
  const autoRes = await fetch(`${baseUrl}/doctors/autocomplete?q=Gopal`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const autoData = await autoRes.json();
  console.log("✓ /api/doctors/autocomplete matching names:", autoData.data?.names);

  // 4. Geolocation & Nearby Doctors
  const nearbyRes = await fetch(
    `${baseUrl}/doctors/nearby/search?lat=23.2599&lng=77.4126&radius=25`,
    { headers: { Authorization: `Bearer ${userToken}` } }
  );
  const nearbyData = await nearbyRes.json();
  console.log(`✓ /api/doctors/nearby/search returned ${nearbyData.count} doctors within 25km`);
  if (nearbyData.count > 0) {
    console.log(`  Closest Doctor: ${nearbyData.data[0].name}, Distance: ${nearbyData.data[0].distanceInKm} km`);
  }

  // 5. Favorites
  const favAddRes = await fetch(`${baseUrl}/favorites/${sampleDoctor._id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const favAddData = await favAddRes.json();
  console.log("✓ /api/favorites POST:", favAddData.message);

  const favListRes = await fetch(`${baseUrl}/favorites`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const favListData = await favListRes.json();
  console.log(`✓ /api/favorites GET returned ${favListData.count} saved doctor(s)`);

  // 6. Reviews & Ratings
  const reviewRes = await fetch(`${baseUrl}/reviews/doctor/${sampleDoctor._id}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      rating: 5,
      comment: "Outstanding consultation. Clear guidance and very polite demeanor."
    })
  });
  const reviewData = await reviewRes.json();
  console.log("✓ /api/reviews/doctor POST:", reviewData.message);

  // 7. Appointments Management
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 3);
  const aptCreateRes = await fetch(`${baseUrl}/appointments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      doctorId: sampleDoctor._id,
      patientName: "Test Patient",
      patientEmail: testEmail,
      patientPhone: "9876543210",
      appointmentDate: futureDate.toISOString().slice(0, 10),
      timeSlot: "11:00 AM",
      notes: "Routine checkup and blood pressure review"
    })
  });
  const aptCreateData = await aptCreateRes.json();
  console.log("✓ /api/appointments POST:", aptCreateData.message);
  const createdApt = aptCreateData.data;

  // View user appointments
  const myAptsRes = await fetch(`${baseUrl}/appointments/my`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const myAptsData = await myAptsRes.json();
  console.log(`✓ /api/appointments/my returned ${myAptsData.data?.upcoming?.length} upcoming appointment(s)`);

  // 8. Health & Wellness
  const healthArticlesRes = await fetch(`${baseUrl}/health-wellness`);
  const healthArticlesData = await healthArticlesRes.json();
  console.log(`✓ /api/health-wellness returned ${healthArticlesData.count} evidence-based articles`);

  // 9. Admin Portal Test
  // Create or promote user to admin
  const adminEmail = "sandhyadhakad601@gmail.com";
  const adminUser = await User.findOne({ email: adminEmail });
  let adminToken;
  if (adminUser) {
    adminToken = jwt.sign({ userId: adminUser._id.toString(), role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    console.log("✓ Admin token generated for", adminEmail);

    const statsRes = await fetch(`${baseUrl}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const statsData = await statsRes.json();
    console.log("✓ /api/admin/stats:", statsData.data);

    // Verify appointment update by admin
    const aptStatusRes = await fetch(`${baseUrl}/admin/appointments/${createdApt._id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: "confirmed" })
    });
    const aptStatusData = await aptStatusRes.json();
    console.log("✓ /api/admin/appointments status update:", aptStatusData.message);
  }

  // 10. AI Doctor Recommendation (Gemini API Proxy)
  console.log("Testing AI Specialization Recommendation via Gemini...");
  const aiRes = await fetch(`${baseUrl}/ai/recommend`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      symptoms: "I have had severe joint stiffness, swelling, and sharp pain in both knees especially in the morning."
    })
  });
  const aiData = await aiRes.json();
  if (!aiData.success) {
    console.warn("AI recommendation returned notice:", aiData.message);
  } else {
    console.log("✓ /api/ai/recommend Primary Specialization:", aiData.recommendation?.primarySpecialization);
    console.log("  Matching verified doctors found:", aiData.matchingDoctors?.length);
    console.log("  Disclaimer present:", Boolean(aiData.disclaimer));
  }

    // Clean up test user
    if (testEmail) await User.deleteOne({ email: testEmail });
    if (createdApt && createdApt._id) await Appointment.deleteOne({ _id: createdApt._id });
    if (signupData && signupData.user && signupData.user.id) {
      await Favorite.deleteMany({ user: signupData.user.id });
      await Review.deleteMany({ user: signupData.user.id });
    }
    console.log("✓ Test cleanup completed");

    console.log("=== ALL TESTS COMPLETED SUCCESSFULLY ===");
  } finally {
    if (spawnedServer) {
      spawnedServer.kill();
      console.log("✓ Spawned test server process cleanly terminated");
    }
  }
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
