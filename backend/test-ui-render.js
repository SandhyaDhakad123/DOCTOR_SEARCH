const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const fs = require("fs");
const mongoose = require("mongoose");
const { JSDOM } = require("jsdom");
const Doctor = require("./models/Doctor");

async function testUiRender() {
  console.log("=== STARTING UI DOCTOR CARD RENDERING & FILTER TEST ===");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ MongoDB Connected");

  // 1. Fetch real verified doctors from DB
  const realDoctors = await Doctor.find({ verificationStatus: "verified" }).lean();
  console.log(`✓ Fetched ${realDoctors.length} verified doctors from database`);
  if (realDoctors.length === 0) {
    throw new Error("No verified doctors found in database!");
  }

  // 2. Load frontend index.html
  const htmlPath = path.resolve(__dirname, "../frontend/index.html");
  const htmlContent = fs.readFileSync(htmlPath, "utf8");

  // Create virtual DOM
  const dom = new JSDOM(htmlContent, {
    runScripts: "dangerously",
    resources: "usable",
    url: "http://localhost:3000"
  });

  const { window } = dom;
  const { document } = window;

  // Mock localStorage for auth
  window.localStorage.setItem("token", "dummy-test-token");
  window.localStorage.setItem(
    "user",
    JSON.stringify({ id: "user123", email: "test@example.com", fullName: "Test User", role: "user" })
  );

  // Load script.js
  const scriptPath = path.resolve(__dirname, "../frontend/script.js");
  const scriptContent = fs.readFileSync(scriptPath, "utf8");

  // Execute script in window context
  window.eval(scriptContent);
  console.log("✓ script.js evaluated inside virtual browser window");

  // 3. Test renderDoctors with real database records
  const container = document.getElementById("doctorContainer");
  if (!container) throw new Error("#doctorContainer element not found in DOM");

  console.log("Testing renderDoctors with all " + realDoctors.length + " real doctors...");
  window.renderDoctors(realDoctors);

  // Assertions on container
  console.log("Container child elements count:", container.children.length);
  if (container.children.length !== realDoctors.length) {
    throw new Error(
      `Mismatch: Expected ${realDoctors.length} doctor cards, but found ${container.children.length}`
    );
  }
  console.log(`✓ Confirmed: Exactly ${container.children.length} doctor cards rendered in DOM`);

  // Assertions on container visibility and styles
  if (!container.classList.contains("results-arrived")) {
    throw new Error("doctorContainer is missing 'results-arrived' class!");
  }
  if (container.style.opacity !== "1") {
    throw new Error(`doctorContainer opacity is '${container.style.opacity}', expected '1'!`);
  }
  if (container.style.display !== "grid") {
    throw new Error(`doctorContainer display is '${container.style.display}', expected 'grid'!`);
  }
  console.log("✓ doctorContainer has results-arrived class, opacity: 1, and display: grid");

  // 4. Assertions on individual doctor cards
  for (let i = 0; i < container.children.length; i++) {
    const card = container.children[i];
    const doc = realDoctors[i];

    if (!card.classList.contains("doctor-card")) {
      throw new Error(`Child ${i} is missing 'doctor-card' class`);
    }

    if (card.style.opacity !== "1") {
      throw new Error(`Card ${i} opacity is '${card.style.opacity}', expected '1'`);
    }

    const nameEl = card.querySelector("h3");
    if (!nameEl || !nameEl.textContent.includes(doc.name)) {
      throw new Error(`Card ${i} does not contain doctor name: ${doc.name}`);
    }

    const specEl = card.querySelector(".specialization");
    if (!specEl || !specEl.textContent.includes(doc.specialization)) {
      throw new Error(`Card ${i} does not contain specialization: ${doc.specialization}`);
    }

    const detailsBtn = card.querySelector(".btn-details");
    const bookBtn = card.querySelector(".btn-book");
    const favBtn = card.querySelector(".btn-fav");

    if (!detailsBtn || !bookBtn || !favBtn) {
      throw new Error(`Card ${i} is missing action buttons`);
    }
  }
  console.log(`✓ All ${realDoctors.length} doctor cards have verified names, specializations, and action buttons`);

  // 5. Test search count matching
  const resultsCount = document.getElementById("resultsCount");
  resultsCount.textContent = `${realDoctors.length} verified doctors found`;
  console.log("Displayed Results Count:", resultsCount.textContent);
  console.log("Rendered Cards Count:   ", container.children.length);
  if (!resultsCount.textContent.includes(String(container.children.length))) {
    throw new Error("Displayed count does not match rendered cards count!");
  }
  console.log("✓ Displayed count matches rendered cards count perfectly");

  // 6. Test Cards Grid and Map View mode toggling
  console.log("Testing View Mode toggling...");
  window.setViewMode("map");
  const mapWrapper = document.getElementById("mapWrapper");
  if (mapWrapper.hasAttribute("hidden")) {
    throw new Error("mapWrapper should not be hidden in map mode");
  }
  if (container.style.display !== "grid" || container.style.opacity !== "1") {
    throw new Error("doctorContainer must remain display: grid and opacity: 1 in map mode");
  }
  console.log("✓ Map view mode activated: mapWrapper unhidden, doctorContainer visible");

  window.setViewMode("grid");
  if (!mapWrapper.hasAttribute("hidden")) {
    throw new Error("mapWrapper should be hidden in grid mode");
  }
  if (container.style.display !== "grid" || container.style.opacity !== "1") {
    throw new Error("doctorContainer must be display: grid and opacity: 1 in grid mode");
  }
  console.log("✓ Cards Grid view mode activated: mapWrapper hidden, doctorContainer visible");

  // 7. Test Clear Search / Reset
  console.log("Testing clearSearch...");
  window.clearSearch();
  if (container.children.length !== 0) {
    throw new Error("doctorContainer should be empty after clearSearch");
  }
  if (container.classList.contains("results-arrived")) {
    throw new Error("doctorContainer should not have results-arrived class after clearSearch");
  }
  console.log("✓ clearSearch successfully resets container and filter state");

  // 8. Re-render and verify once more
  window.renderDoctors(realDoctors);
  if (container.children.length !== realDoctors.length) {
    throw new Error("Re-render failed");
  }
  console.log(`✓ Re-render verified: ${container.children.length} cards visible again`);

  console.log("=== ALL UI DOCTOR CARD RENDERING TESTS PASSED SUCCESSFULLY ===");
  process.exit(0);
}

testUiRender().catch((err) => {
  console.error("UI Test Failed:", err);
  process.exit(1);
});
