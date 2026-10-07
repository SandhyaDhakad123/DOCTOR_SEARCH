console.log("DOCTORFINDER MASTER UPGRADE SCRIPT LOADED");
const API_BASE_URL = "https://doctor-search-t5sm.onrender.com/api";

let currentDoctors = [];
let selectedDoctorId = null;
let authMode = "login";
let currentUserLocation = null; // In-memory GPS coordinates { lat, lng }
let isNearbyMode = false; // true when results come from GPS /nearby/search
let userFavoritesSet = new Set();
let leafletMap = null;
let leafletMarkersLayer = null;
let userLocationMarker = null;
let viewMode = "grid"; // "grid" or "map"
let currentReviewRating = 5;

const $ = (id) => document.getElementById(id);

function getToken() {
  return (
    localStorage.getItem("doctorfinder_token") ||
    sessionStorage.getItem("doctorfinder_token") ||
    ""
  );
}

function getCurrentUser() {
  const raw =
    localStorage.getItem("doctorfinder_user") ||
    sessionStorage.getItem("doctorfinder_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isAuthenticated() {
  return Boolean(getToken());
}

function isAdmin() {
  const user = getCurrentUser();
  return Boolean(user && user.role === "admin");
}

function getAuthHeaders() {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function clearSession() {
  localStorage.removeItem("doctorfinder_token");
  localStorage.removeItem("doctorfinder_user");
  sessionStorage.removeItem("doctorfinder_token");
  sessionStorage.removeItem("doctorfinder_user");
  userFavoritesSet.clear();
  currentUserLocation = null;
}

const escapeHtml = (value) =>
  String(value ?? "Not available").replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      })[character]
  );

const valueOrMissing = (value) =>
  value === undefined || value === null || value === ""
    ? "Not available"
    : value;

const listOrMissing = (value, fallback = "Not available") =>
  Array.isArray(value) && value.length ? value.join(", ") : fallback;

const INDIA_STATES_AND_UTS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

const LOCATION_STATE_ALIASES = {
  "Himachal Pradesh": "Himachal Praddesh",
  "Dadra and Nagar Haveli and Daman and Diu": "Dadra and Nagar Haveli"
};

function initApp() {
  bindEvents();
  restoreSession();
  checkRouteGuard();
  loadHealthWellnessArticles();
  loadDynamicFilters();
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  initApp();
} else {
  window.addEventListener("DOMContentLoaded", initApp);
}

window.addEventListener("hashchange", checkRouteGuard);

function checkRouteGuard() {
  const protectedHashes = [
    "#appDashboard",
    "#doctor-results",
    "#app",
    "#search"
  ];
  if (!isAuthenticated() && protectedHashes.includes(window.location.hash)) {
    window.location.hash = "#top";
    openAuth("login");
    $("authMessage").textContent =
      "Authentication required. Please log in or sign up to access Doctor Search.";
  }
}

/*
|--------------------------------------------------------------------------
| EVENT BINDINGS
|--------------------------------------------------------------------------
*/
function bindEvents() {
  // Search and Nearby
  $("searchBtn").addEventListener("click", performSearch);
  $("clearBtn").addEventListener("click", clearSearch);

  const nearbyButton = $("findNearbyDoctorsBtn");
  if (nearbyButton) {
    nearbyButton.addEventListener("click", findNearbyDoctors);
  }

  // Hero Search CTA
  const heroSearchBtn = $("heroSearchBtn");
  if (heroSearchBtn) {
    heroSearchBtn.addEventListener("click", () => {
      if (isAuthenticated()) {
        const appDashboard = $("appDashboard");
        if (appDashboard) {
          appDashboard.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        openAuth("login");
        $("authMessage").textContent =
          "Please log in or sign up to search doctors.";
      }
    });
  }

  // CTA Section buttons
  const ctaSearchBtn = $("ctaSearchBtn");
  if (ctaSearchBtn) {
    ctaSearchBtn.addEventListener("click", () => {
      if (isAuthenticated()) {
        const appDashboard = $("appDashboard");
        if (appDashboard) {
          appDashboard.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        openAuth("login");
        $("authMessage").textContent =
          "Please log in or sign up to search doctors.";
      }
    });
  }

  const ctaSignupBtn = $("ctaSignupBtn");
  if (ctaSignupBtn) {
    ctaSignupBtn.addEventListener("click", () => {
      if (!isAuthenticated()) {
        openAuth("signup");
      } else {
        openUserDashboard("saved");
      }
    });
  }

  // Navbar Links
  const navDoctorSearch = $("navDoctorSearch");
  if (navDoctorSearch) {
    navDoctorSearch.addEventListener("click", (e) => {
      e.preventDefault();
      if (isAuthenticated()) {
        const appDashboard = $("appDashboard");
        if (appDashboard) {
          appDashboard.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        openAuth("login");
        $("authMessage").textContent =
          "Please log in or sign up to access Doctor Search.";
      }
    });
  }

  const navNearbyDoctors = $("navNearbyDoctors");
  if (navNearbyDoctors) {
    navNearbyDoctors.addEventListener("click", (e) => {
      e.preventDefault();
      if (isAuthenticated()) {
        const appDashboard = $("appDashboard");
        if (appDashboard) {
          appDashboard.scrollIntoView({ behavior: "smooth" });
        }
        findNearbyDoctors();
      } else {
        openAuth("login");
        $("authMessage").textContent =
          "Please log in or sign up to use Nearby Doctors.";
      }
    });
  }

  const navDashboard = $("navDashboard");
  if (navDashboard) {
    navDashboard.addEventListener("click", (e) => {
      e.preventDefault();
      if (isAuthenticated()) {
        openUserDashboard("saved");
      } else {
        openAuth("login");
      }
    });
  }

  const navSavedDoctors = $("navSavedDoctors");
  if (navSavedDoctors) {
    navSavedDoctors.addEventListener("click", (e) => {
      e.preventDefault();
      if (isAuthenticated()) {
        openUserDashboard("saved");
      } else {
        openAuth("login");
      }
    });
  }

  const navAiDoctor = $("navAiDoctor");
  if (navAiDoctor) {
    navAiDoctor.addEventListener("click", (e) => {
      e.preventDefault();
      if (isAuthenticated()) {
        openAiModal();
      } else {
        openAuth("login");
        $("authMessage").textContent =
          "Please log in or sign up to use the AI Specialist Finder.";
      }
    });
  }

  const navAdminPortal = $("navAdminPortal");
  if (navAdminPortal) {
    navAdminPortal.addEventListener("click", (e) => {
      e.preventDefault();
      if (isAdmin()) {
        openAdminDashboard();
      } else {
        alert("Administrator access required.");
      }
    });
  }

  // View Mode Toggle (Grid vs Leaflet Map)
  const viewGridBtn = $("viewGridBtn");
  const viewMapBtn = $("viewMapBtn");
  if (viewGridBtn && viewMapBtn) {
    viewGridBtn.addEventListener("click", () => setViewMode("grid"));
    viewMapBtn.addEventListener("click", () => setViewMode("map"));
  }

  // Filter change listeners — detect nearby mode and route to correct search function
  ["filterFee", "filterAvailability", "filterRating", "sortBy"].forEach(
    (id) => {
      const el = $(id);
      if (el) {
        el.addEventListener("change", () => {
          updateActiveFilterBadge();
          if (!isAuthenticated()) return;
          if (isNearbyMode && currentUserLocation) {
            // Re-query nearby with new filters applied
            findNearbyDoctors();
          } else if (currentDoctors.length > 0) {
            performSearch();
          }
        });
      }
    }
  );

  // Radius filter — only meaningful in nearby mode
  const radiusEl = $("filterRadius");
  if (radiusEl) {
    radiusEl.addEventListener("change", () => {
      updateActiveFilterBadge();
      if (isAuthenticated() && isNearbyMode && currentUserLocation) {
        findNearbyDoctors();
      }
    });
  }

  // Forms
  $("appointmentForm").addEventListener("submit", handleAppointmentSubmit);
  $("authForm").addEventListener("submit", handleAuthSubmit);
  $("togglePassword").addEventListener("click", togglePassword);

  // Setup Autocomplete
  setupAutocomplete("searchBySpecialization", "specAutocomplete", "specialization");
  setupAutocomplete("searchByName", "nameAutocomplete", "name");
  setupAutocomplete("searchByHospital", "hospitalAutocomplete", "hospital");

  // Setup Modals
  decorateAuthForm();
  createRequestExperience();
  initializeLocationSearch();
  setupDashboardEvents();
  setupAdminEvents();
  setupAiEvents();
  setupHealthEvents();

  // Auth tabs & triggers
  document
    .querySelectorAll("[data-auth]")
    .forEach((button) =>
      button.addEventListener("click", () => openAuth(button.dataset.auth))
    );

  document
    .querySelectorAll("[data-auth-tab]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        setAuthMode(button.dataset.authTab)
      )
    );

  // Generic modal close
  document.querySelectorAll(".modal-close").forEach((button) =>
    button.addEventListener("click", () => {
      const modal = button.closest(".modal");
      if (modal) {
        modal.setAttribute("hidden", "");
        document.body.classList.remove("modal-open");
      }
    })
  );

  // Backdrop modal dismiss
  [
    "doctorModal",
    "authModal",
    "userDashboardModal",
    "adminDashboardModal",
    "addDoctorModal",
    "aiModal",
    "healthArticleModal"
  ].forEach((id) => {
    const el = $(id);
    if (el) {
      el.addEventListener("click", (event) => {
        if (event.target === el) {
          el.setAttribute("hidden", "");
          document.body.classList.remove("modal-open");
        }
      });
    }
  });

  // Mobile menu toggle
  const menuToggle = document.querySelector(".menu-toggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const open = document
        .querySelector(".nav-links")
        .classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(open));
    });
  }

  document.querySelectorAll(".nav-links a").forEach((link) =>
    link.addEventListener("click", () => {
      document.querySelector(".nav-links").classList.remove("open");
    })
  );

  ["searchByCity", "searchBySpecialization", "searchByName", "searchByHospital"].forEach(
    (id) => {
      const el = $(id);
      if (el) {
        el.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            performSearch();
          }
        });
      }
    }
  );

  $("forgotPassword").addEventListener("click", () => {
    $("authMessage").textContent =
      "Password reset is managed in your Account Settings after logging in, or please contact administrator.";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      [
        "doctorModal",
        "authModal",
        "userDashboardModal",
        "adminDashboardModal",
        "addDoctorModal",
        "aiModal",
        "healthArticleModal",
        "requestModal",
        "successModal"
      ].forEach((id) => {
        const el = $(id);
        if (el) el.setAttribute("hidden", "");
      });
      document.body.classList.remove("modal-open");
    }
  });
}

/*
|--------------------------------------------------------------------------
| AUTOCOMPLETE ENGINE (Phase 17)
|--------------------------------------------------------------------------
*/
function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

function setupAutocomplete(inputId, dropdownId, type) {
  const input = $(inputId);
  const dropdown = $(dropdownId);
  if (!input || !dropdown) return;

  let highlightedIndex = -1;

  function getItems() {
    return Array.from(dropdown.querySelectorAll(".autocomplete-item"));
  }

  function setHighlight(index) {
    const items = getItems();
    items.forEach((item, i) => {
      item.classList.toggle("autocomplete-highlighted", i === index);
    });
    highlightedIndex = index;
  }

  const handleInput = debounce(async () => {
    const q = input.value.trim();
    highlightedIndex = -1;
    if (q.length < 1) {
      dropdown.setAttribute("hidden", "");
      dropdown.replaceChildren();
      return;
    }

    if (!isAuthenticated()) return;

    try {
      const stateVal = $("searchByState")?.value?.trim() || "";
      const cityVal = $("searchByCity")?.value?.trim() || "";
      const stateParam = stateVal ? `&state=${encodeURIComponent(stateVal)}` : "";
      const cityParam = cityVal ? `&city=${encodeURIComponent(cityVal)}` : "";
      const res = await fetch(
        `${API_BASE_URL}/doctors/autocomplete?q=${encodeURIComponent(
          q
        )}&type=${type}${stateParam}${cityParam}`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) return;
      const data = await res.json();
      const items =
        type === "specialization"
          ? data.data?.specializations || []
          : type === "name"
          ? data.data?.names || []
          : type === "hospital"
          ? data.data?.hospitals || []
          : data.data?.cities || [];

      if (!items.length) {
        dropdown.setAttribute("hidden", "");
        dropdown.replaceChildren();
        return;
      }

      dropdown.replaceChildren();
      highlightedIndex = -1;
      items.forEach((itemText, idx) => {
        const li = document.createElement("li");
        li.className = "autocomplete-item";
        li.setAttribute("role", "option");
        li.setAttribute("data-index", String(idx));
        li.innerHTML = `
          <i class="fa-solid fa-${
            type === "specialization"
              ? "stethoscope"
              : type === "name"
              ? "user-doctor"
              : "hospital"
          }"></i>
          <span>${escapeHtml(itemText)}</span>
          <span class="autocomplete-type-tag">${type}</span>
        `;
        li.addEventListener("mousedown", (e) => {
          // mousedown fires before blur so we can intercept before input loses focus
          e.preventDefault();
          input.value = itemText;
          dropdown.setAttribute("hidden", "");
          dropdown.replaceChildren();
          highlightedIndex = -1;
          if (isNearbyMode && currentUserLocation) {
            findNearbyDoctors();
          } else {
            performSearch();
          }
        });
        dropdown.appendChild(li);
      });
      dropdown.removeAttribute("hidden");
    } catch (err) {
      console.warn("Autocomplete error:", err);
    }
  }, 220);

  input.addEventListener("input", handleInput);

  // Keyboard navigation: Arrow Up/Down + Enter
  input.addEventListener("keydown", (e) => {
    if (dropdown.hasAttribute("hidden")) return;
    const items = getItems();
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = highlightedIndex < items.length - 1 ? highlightedIndex + 1 : 0;
      setHighlight(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = highlightedIndex > 0 ? highlightedIndex - 1 : items.length - 1;
      setHighlight(prev);
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && items[highlightedIndex]) {
        e.preventDefault();
        const selectedText = items[highlightedIndex].querySelector("span").textContent;
        input.value = selectedText;
        dropdown.setAttribute("hidden", "");
        dropdown.replaceChildren();
        highlightedIndex = -1;
        if (isNearbyMode && currentUserLocation) {
          findNearbyDoctors();
        } else {
          performSearch();
        }
      }
    } else if (e.key === "Escape") {
      dropdown.setAttribute("hidden", "");
      dropdown.replaceChildren();
      highlightedIndex = -1;
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.setAttribute("hidden", "");
      highlightedIndex = -1;
    }
  });

  // Close on blur (when not selecting with mouse)
  input.addEventListener("blur", () => {
    // Small delay allows mousedown on items to fire first
    setTimeout(() => {
      dropdown.setAttribute("hidden", "");
      highlightedIndex = -1;
    }, 150);
  });
}

function updateActiveFilterBadge() {
  const badge = $("activeFilterCount");
  if (!badge) return;

  let activeCount = 0;
  if ($("filterFee")?.value) activeCount++;
  if ($("filterAvailability")?.value) activeCount++;
  if ($("filterRating")?.value) activeCount++;
  if ($("searchBySpecialization")?.value.trim()) activeCount++;
  if ($("searchByName")?.value.trim()) activeCount++;
  if ($("searchByHospital")?.value.trim()) activeCount++;

  if (activeCount > 0) {
    badge.innerHTML = `<i class="fa-solid fa-sliders"></i> ${activeCount} active filter${
      activeCount > 1 ? "s" : ""
    }`;
    badge.style.background = "var(--teal)";
    badge.style.color = "#fff";
  } else {
    badge.innerHTML = `<i class="fa-solid fa-sliders"></i> Default Filters`;
    badge.style.background = "var(--mint)";
    badge.style.color = "var(--teal-dark)";
  }
}

/*
|--------------------------------------------------------------------------
| DOCTOR SEARCH & FILTERS (Phase 3 & 8)
|--------------------------------------------------------------------------
*/
async function performSearch() {
  if (!isAuthenticated()) {
    openAuth("login");
    $("authMessage").textContent = "Please log in or sign up to search doctors.";
    return;
  }

  // Regular search exits nearby mode
  isNearbyMode = false;

  const state = $("searchByState").value;
  const city = $("searchByCity").value.trim();
  const specialization = $("searchBySpecialization").value.trim();
  const name = $("searchByName").value.trim();
  const hospital = $("searchByHospital") ? $("searchByHospital").value.trim() : "";

  // Advanced filter values
  const fee = $("filterFee") ? $("filterFee").value : "";
  const availability = $("filterAvailability") ? $("filterAvailability").value : "";
  const rating = $("filterRating") ? $("filterRating").value : "";
  const sortBy = $("sortBy") ? $("sortBy").value : "name_asc";

  setLoading(true);
  $("doctorContainer").replaceChildren();

  const query = new URLSearchParams();
  if (state) query.set("state", state);
  if (city) query.set("city", city);
  if (specialization) query.set("specialization", specialization);
  if (name) query.set("name", name);
  if (hospital) query.set("hospital", hospital);

  if (fee === "under500") {
    query.set("maxFee", "500");
  } else if (fee === "500to1000") {
    query.set("minFee", "500");
    query.set("maxFee", "1000");
  } else if (fee === "1000to2000") {
    query.set("minFee", "1000");
    query.set("maxFee", "2000");
  } else if (fee === "above1000") {
    query.set("minFee", "1000");
  } else if (fee === "above2000") {
    query.set("minFee", "2000");
  }

  if (availability === "today") {
    query.set("availableToday", "true");
  } else if (availability === "this_week") {
    query.set("availableThisWeek", "true");
  }

  if (rating) {
    query.set("rating", rating);
  }

  query.set("sort", sortBy);

  if (currentUserLocation) {
    query.set("userLat", currentUserLocation.lat.toString());
    query.set("userLng", currentUserLocation.lng.toString());
  }

  try {
    const response = await fetch(`${API_BASE_URL}/doctors?${query}`, {
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      clearSession();
      updateUIForAuthState(null);
      openAuth("login");
      $("authMessage").textContent =
        "Session expired or authentication required. Please log in again.";
      return;
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Search failed");
    }

    currentDoctors = data.data || [];

    let resultTitle = "All Verified Doctors Across India";
    if (specialization) {
      resultTitle = `${specialization} Doctors`;
      if (city) resultTitle += ` in ${city}`;
      else if (state) resultTitle += ` in ${state}`;
    } else if (hospital) {
      resultTitle = `Doctors at ${hospital}`;
    } else if (name) {
      resultTitle = `Doctors matching "${name}"`;
    } else if (city && state) {
      resultTitle = `Doctors in ${city}, ${state}`;
    } else if (city) {
      resultTitle = `Doctors in ${city}`;
    } else if (state) {
      resultTitle = `Doctors in ${state}`;
    }

    $("resultsTitle").textContent = resultTitle;

    $("resultsCount").textContent = `${currentDoctors.length} verified doctor${
      currentDoctors.length === 1 ? "" : "s"
    } found`;

    if (!currentDoctors.length) {
      showResultMessage(
        "No verified doctors found matching your exact filter criteria.",
        "empty"
      );
      if (leafletMap) updateLeafletMap([], currentUserLocation);
      return;
    }

    renderDoctors(currentDoctors);
    updateLeafletMap(currentDoctors, currentUserLocation);

    showResultMessage(
      `Displaying ${currentDoctors.length} verified and traceable doctor records.`,
      "success"
    );

    const targetEl = $("doctor-results");
    if (targetEl && typeof targetEl.scrollIntoView === "function") {
      targetEl.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  } catch (error) {
    console.error(error);
    showResultMessage(
      error.message || "Unable to load doctors. Please check your connection and try again.",
      "error"
    );
  } finally {
    setLoading(false);
  }
}

/*
|--------------------------------------------------------------------------
| NEARBY DOCTORS & GEOLOCATION (Phase 6)
|--------------------------------------------------------------------------
*/
async function findNearbyDoctors() {
  if (!isAuthenticated()) {
    openAuth("login");
    $("authMessage").textContent =
      "Please log in or sign up to use Nearby Doctors.";
    return;
  }

  if (!navigator.geolocation) {
    showResultMessage(
      "Your browser does not support location access. Please use state and city search instead.",
      "error"
    );
    return;
  }

  const radiusSelect = $("filterRadius");
  const radiusKm = radiusSelect ? radiusSelect.value : "10";

  // Gather all active filters to pass to nearby endpoint
  const fee = $("filterFee") ? $("filterFee").value : "";
  const availability = $("filterAvailability") ? $("filterAvailability").value : "";
  const rating = $("filterRating") ? $("filterRating").value : "";
  const sortBy = $("sortBy") ? $("sortBy").value : "nearest";
  const specialization = $("searchBySpecialization") ? $("searchBySpecialization").value.trim() : "";
  const name = $("searchByName") ? $("searchByName").value.trim() : "";
  const hospital = $("searchByHospital") ? $("searchByHospital").value.trim() : "";
  const city = $("searchByCity") ? $("searchByCity").value.trim() : "";

  const button = $("findNearbyDoctorsBtn");
  const originalText = button ? button.innerHTML : "";

  if (button) {
    button.disabled = true;
    button.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Finding doctors...';
  }

  setLoading(true);
  $("doctorContainer").replaceChildren();

  // Only show the detecting message if we don't already have a location
  if (!currentUserLocation) {
    showResultMessage(
      "Detecting your device coordinates to discover verified doctors near you...",
      "info"
    );
  }

  try {
    // If we already have the user location cached, use it without re-asking
    let latitude, longitude;
    if (currentUserLocation) {
      latitude = currentUserLocation.lat;
      longitude = currentUserLocation.lng;
    } else {
      const position = await getCurrentPosition();
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
      // Cache in session memory only
      currentUserLocation = { lat: latitude, lng: longitude };
    }

    // Mark as nearby mode
    isNearbyMode = true;

    const query = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
      radius: radiusKm
    });

    if (specialization) query.set("specialization", specialization);
    if (name) query.set("name", name);
    if (hospital) query.set("hospital", hospital);
    if (city) query.set("city", city);

    // Pass all active filters to the backend
    if (fee === "under500") {
      query.set("maxFee", "500");
    } else if (fee === "500to1000") {
      query.set("minFee", "500");
      query.set("maxFee", "1000");
    } else if (fee === "1000to2000") {
      query.set("minFee", "1000");
      query.set("maxFee", "2000");
    } else if (fee === "above1000") {
      query.set("minFee", "1000");
    } else if (fee === "above2000") {
      query.set("minFee", "2000");
    }

    if (availability === "today") {
      query.set("availableToday", "true");
    } else if (availability === "this_week") {
      query.set("availableThisWeek", "true");
    }

    if (rating) {
      query.set("rating", rating);
    }

    query.set("sort", sortBy);

    const response = await fetch(
      `${API_BASE_URL}/doctors/nearby/search?${query}`,
      { headers: getAuthHeaders() }
    );

    if (response.status === 401) {
      clearSession();
      updateUIForAuthState(null);
      openAuth("login");
      $("authMessage").textContent =
        "Session expired or authentication required. Please log in again.";
      return;
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Nearby doctor search failed.");
    }

    currentDoctors = data.data || [];

    $("resultsTitle").textContent = "Verified Doctors Near You";
    $("resultsCount").textContent = `${currentDoctors.length} verified doctor${
      currentDoctors.length === 1 ? "" : "s"
    } found within ${data.radius || radiusKm} km`;

    if (!currentDoctors.length) {
      showResultMessage(
        `No verified doctors with verified practice coordinates found within ${radiusKm} km. Try expanding your search radius to 25 km or 50 km.`,
        "empty"
      );
      if (leafletMap) updateLeafletMap([], currentUserLocation);
      return;
    }

    renderDoctors(currentDoctors);
    updateLeafletMap(currentDoctors, currentUserLocation);

    showResultMessage(
      `Found ${currentDoctors.length} verified practice locations within ${radiusKm} km. User GPS coordinates are never stored.`,
      "success"
    );

    const targetEl = $("doctor-results");
    if (targetEl && typeof targetEl.scrollIntoView === "function") {
      targetEl.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  } catch (error) {
    console.error("Nearby search error:", error);
    let message = "Unable to find nearby doctors. Please try again.";
    if (error.code === 1) {
      message =
        "Location permission was denied. Please allow location access in your browser or use state/city search.";
    } else if (error.code === 2) {
      message =
        "Your location could not be determined. Please verify your device GPS settings.";
    } else if (error.code === 3) {
      message = "Location request timed out. Please try again.";
    } else if (error.message) {
      message = error.message;
    }
    isNearbyMode = false;
    showResultMessage(message, "error");
  } finally {
    setLoading(false);
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    });
  });
}

/*
|--------------------------------------------------------------------------
| LEAFLET + OPENSTREETMAP INTERACTIVE MAP VIEW (Phase 7)
|--------------------------------------------------------------------------
*/
function setViewMode(mode) {
  viewMode = mode;
  const gridBtn = $("viewGridBtn");
  const mapBtn = $("viewMapBtn");
  const mapWrapper = $("mapWrapper");
  const doctorContainer = $("doctorContainer");

  if (mode === "map") {
    if (gridBtn) gridBtn.classList.remove("active");
    if (mapBtn) mapBtn.classList.add("active");
    if (mapWrapper) mapWrapper.removeAttribute("hidden");
    if (doctorContainer) {
      doctorContainer.style.display = "grid";
      doctorContainer.style.opacity = "1";
      doctorContainer.style.visibility = "visible";
      doctorContainer.classList.add("results-arrived");
    }

    initLeafletMap();
    setTimeout(() => {
      if (leafletMap) {
        leafletMap.invalidateSize();
        updateLeafletMap(currentDoctors, currentUserLocation);
      }
    }, 150);
  } else {
    if (gridBtn) gridBtn.classList.add("active");
    if (mapBtn) mapBtn.classList.remove("active");
    if (mapWrapper) mapWrapper.setAttribute("hidden", "");
    if (doctorContainer) {
      doctorContainer.style.display = "grid";
      doctorContainer.style.opacity = "1";
      doctorContainer.style.visibility = "visible";
      doctorContainer.classList.add("results-arrived");
    }
  }
}

function initLeafletMap() {
  if (leafletMap) return;
  const mapEl = $("doctorMap");
  if (!mapEl || typeof L === "undefined") return;

  // Default center across India
  leafletMap = L.map("doctorMap").setView([20.5937, 78.9629], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(leafletMap);

  leafletMarkersLayer = L.layerGroup().addTo(leafletMap);

  // === SEARCH THIS AREA feature ===
  let searchAreaTimer = null;
  const searchAreaBtn = $("searchThisAreaBtn");

  function showSearchAreaBtn() {
    if (searchAreaBtn) searchAreaBtn.removeAttribute("hidden");
  }

  function hideSearchAreaBtn() {
    if (searchAreaBtn) searchAreaBtn.setAttribute("hidden", "");
  }

  // Show button after user moves/zooms the map (debounced)
  leafletMap.on("moveend", () => {
    clearTimeout(searchAreaTimer);
    // Only show button if we've already done a search
    if (currentDoctors.length > 0 || isNearbyMode) {
      searchAreaTimer = setTimeout(showSearchAreaBtn, 400);
    }
  });

  leafletMap.on("zoomend", () => {
    clearTimeout(searchAreaTimer);
    if (currentDoctors.length > 0 || isNearbyMode) {
      searchAreaTimer = setTimeout(showSearchAreaBtn, 400);
    }
  });

  if (searchAreaBtn) {
    searchAreaBtn.addEventListener("click", async () => {
      if (!isAuthenticated()) return;
      hideSearchAreaBtn();

      const center = leafletMap.getCenter();
      const bounds = leafletMap.getBounds();
      // Approximate radius from map bounds diagonal (half the NE-SW distance)
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const diagonal = ne.distanceTo(sw); // in metres
      const radiusKm = Math.min(Math.ceil(diagonal / 2000), 100);

      setLoading(true);
      try {
        const query = new URLSearchParams({
          lat: center.lat.toString(),
          lng: center.lng.toString(),
          radius: radiusKm.toString()
        });

        // Pass active filters
        const fee = $("filterFee") ? $("filterFee").value : "";
        const availability = $("filterAvailability") ? $("filterAvailability").value : "";
        const rating = $("filterRating") ? $("filterRating").value : "";
        const sortBy = $("sortBy") ? $("sortBy").value : "nearest";

        if (fee === "under500") { query.set("maxFee", "500"); }
        else if (fee === "500to1000") { query.set("minFee", "500"); query.set("maxFee", "1000"); }
        else if (fee === "1000to2000") { query.set("minFee", "1000"); query.set("maxFee", "2000"); }
        else if (fee === "above1000") { query.set("minFee", "1000"); }
        else if (fee === "above2000") { query.set("minFee", "2000"); }
        if (availability === "today") { query.set("availableToday", "true"); }
        else if (availability === "this_week") { query.set("availableThisWeek", "true"); }
        if (rating) { query.set("rating", rating); }
        query.set("sort", sortBy);

        const response = await fetch(`${API_BASE_URL}/doctors/nearby/search?${query}`, {
          headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message);

        currentDoctors = data.data || [];
        isNearbyMode = true;
        currentUserLocation = { lat: center.lat, lng: center.lng };

        $("resultsTitle").textContent = "Doctors in This Map Area";
        $("resultsCount").textContent = `${currentDoctors.length} verified doctor${
          currentDoctors.length === 1 ? "" : "s"
        } found in this area`;

        renderDoctors(currentDoctors);
        updateLeafletMap(currentDoctors, currentUserLocation);

        showResultMessage(
          `Found ${currentDoctors.length} verified doctors in this map area (~${radiusKm} km radius).`,
          currentDoctors.length ? "success" : "empty"
        );
      } catch (err) {
        console.error("Search area error:", err);
        showResultMessage("Could not search this area. Please try again.", "error");
      } finally {
        setLoading(false);
      }
    });
  }
}

function updateLeafletMap(doctors, userCoords) {
  if (!leafletMap || !leafletMarkersLayer) return;

  leafletMarkersLayer.clearLayers();
  const bounds = [];

  // Add User Location Pin
  if (userCoords && userCoords.lat && userCoords.lng) {
    const userMarker = L.circleMarker([userCoords.lat, userCoords.lng], {
      radius: 9,
      fillColor: "#3b82f6",
      color: "#ffffff",
      weight: 3,
      opacity: 1,
      fillOpacity: 0.95
    }).bindPopup(`
      <div style="font-family: 'DM Sans', sans-serif; font-size: 13px;">
        <strong style="color: #1e3a8a;"><i class="fa-solid fa-location-crosshairs"></i> Your Current Location</strong>
        <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">Browser GPS Geolocation (Never stored)</p>
      </div>
    `);
    leafletMarkersLayer.addLayer(userMarker);
    bounds.push([userCoords.lat, userCoords.lng]);
  }

  let mappedCount = 0;
  doctors.forEach((doc) => {
    if (
      doc.location &&
      Array.isArray(doc.location.coordinates) &&
      doc.location.coordinates.length === 2
    ) {
      const [lng, lat] = doc.location.coordinates;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        mappedCount++;
        bounds.push([lat, lng]);

        const distStr =
          doc.distanceInKm != null
            ? `<span><i class="fa-solid fa-route"></i> ${doc.distanceInKm} km away</span>`
            : "";

        const ratingStr =
          doc.averageRating > 0
            ? `<span style="color: #b45309;"><i class="fa-solid fa-star"></i> ${doc.averageRating} (${doc.reviewCount || 0})</span>`
            : "";

        const popupHtml = `
          <div class="map-popup-card">
            <h4>${escapeHtml(doc.name)}</h4>
            <div class="map-popup-spec">${escapeHtml(doc.specialization || "General Medicine")}</div>
            <div class="map-popup-info">
              <span><i class="fa-regular fa-hospital"></i> ${escapeHtml(doc.hospitalOrClinic || doc.city || "")}</span>
              ${distStr}
              ${ratingStr}
            </div>
            <button class="map-popup-btn" onclick="viewDoctorDetails('${doc._id}')">
              <i class="fa-solid fa-eye"></i> View Full Profile
            </button>
          </div>
        `;

        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: "#087f8c",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }).bindPopup(popupHtml);

        marker.on("click", () => {
          viewDoctorDetails(doc._id);
        });

        leafletMarkersLayer.addLayer(marker);
      }
    }
  });

  const countBadge = $("mapCountBadge");
  if (countBadge) {
    countBadge.textContent = `${mappedCount} doctor${
      mappedCount === 1 ? "" : "s"
    } on map`;
  }

  if (bounds.length > 0) {
    leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }
}

/*
|--------------------------------------------------------------------------
| RENDER DOCTOR CARDS (Phase 5, 8, 10, 12)
|--------------------------------------------------------------------------
*/
function renderDoctors(doctors, targetContainerId = "doctorContainer") {
  const container = $(targetContainerId);
  if (!container) {
    console.error(`renderDoctors: Container '#${targetContainerId}' not found.`);
    return;
  }

  container.replaceChildren();
  container.classList.add("results-arrived");
  container.style.opacity = "1";
  container.style.visibility = "visible";
  container.style.display = "grid";

  if (!Array.isArray(doctors) || doctors.length === 0) {
    return;
  }

  doctors.forEach((doctor, index) => {
    const card = document.createElement("article");
    card.className = "doctor-card";
    card.style.opacity = "1";
    card.style.visibility = "visible";
    card.style.display = "flex";
    card.style.animationDelay = `${index * 50}ms`;

    const hasProfileImage = Boolean(doctor.profileImage);
    const image = doctor.profileImage || "stethoscope.png";
    const verified = doctor.verificationStatus === "verified";
    const qualifications = listOrMissing(doctor.qualifications);
    const fee =
      doctor.consultationFee !== undefined &&
      doctor.consultationFee !== null &&
      doctor.consultationFee !== ""
        ? `₹${escapeHtml(doctor.consultationFee)}`
        : "Not available";

    const isFav = userFavoritesSet.has(doctor._id);

    const distanceItem =
      doctor.distanceInKm !== undefined && doctor.distanceInKm !== null
        ? `
          <div>
            <i class="fa-solid fa-route"></i>
            <span>
              <b>Distance from practice</b>
              ${escapeHtml(doctor.distanceInKm)} km away
            </span>
          </div>
        `
        : "";

    const distanceBadge =
      doctor.distanceInKm !== undefined && doctor.distanceInKm !== null
        ? `
          <span class="distance-badge">
            <i class="fa-solid fa-location-arrow"></i>
            ${escapeHtml(doctor.distanceInKm)} km
          </span>
        `
        : "";

    const ratingBadge =
      doctor.averageRating > 0
        ? `
          <span class="rating-badge">
            <i class="fa-solid fa-star"></i>
            ${doctor.averageRating} (${doctor.reviewCount || 0})
          </span>
        `
        : `
          <span class="rating-badge" style="background: #f1f5f9; color: #64748b;">
            <i class="fa-regular fa-star"></i> New
          </span>
        `;

    card.innerHTML = `
      <div class="doctor-image-wrap">
        <img
          class="doctor-image ${hasProfileImage ? "" : "placeholder-image"}"
          src="${escapeHtml(image)}"
          alt="${
            hasProfileImage
              ? `Profile image for ${escapeHtml(valueOrMissing(doctor.name))}`
              : "Doctor profile placeholder"
          }"
          onerror="this.onerror=null;this.src='stethoscope.png';this.classList.add('placeholder-image')"
        >
        <span class="image-label">
          ${hasProfileImage ? "Profile Image" : "Official Placeholder"}
        </span>
      </div>

      <div class="doctor-info">
        <div class="doctor-top">
          <h3>${escapeHtml(valueOrMissing(doctor.name))}</h3>
          <div class="badges-row">
            ${distanceBadge}
            ${ratingBadge}
            <span class="verification-badge ${verified ? "" : "not-verified"}">
              <i class="fa-solid fa-${
                verified ? "circle-check" : "circle-exclamation"
              }"></i>
              ${verified ? "Verified" : "Pending"}
            </span>
          </div>
        </div>

        <p class="specialization">
          ${escapeHtml(valueOrMissing(doctor.specialization))}
        </p>

        <div class="doctor-details">
          <div>
            <i class="fa-solid fa-graduation-cap"></i>
            <span>
              <b>Qualifications:</b> ${escapeHtml(qualifications)}
            </span>
          </div>

          <div>
            <i class="fa-solid fa-location-dot"></i>
            <span>
              <b>Location:</b> ${escapeHtml(valueOrMissing(doctor.city))} / ${escapeHtml(
      valueOrMissing(doctor.state)
    )}
            </span>
          </div>

          <div>
            <i class="fa-regular fa-hospital"></i>
            <span>
              <b>Hospital / Clinic:</b> ${escapeHtml(
                valueOrMissing(doctor.hospitalOrClinic)
              )}
            </span>
          </div>

          <div>
            <i class="fa-solid fa-indian-rupee-sign"></i>
            <span>
              <b>Consultation Fee:</b> ${fee}
            </span>
          </div>

          ${distanceItem}
        </div>

        <div class="card-actions-row">
          <button class="btn-small btn-details" type="button">
            <i class="fa-solid fa-eye"></i> View details
          </button>

          <button class="btn-small btn-book" type="button">
            <i class="fa-regular fa-calendar"></i> Book
          </button>

          <button class="btn-fav ${
            isFav ? "favorited" : ""
          }" type="button" aria-label="Save doctor" title="${
      isFav ? "Remove from saved" : "Save doctor"
    }">
            <i class="fa-${isFav ? "solid" : "regular"} fa-heart"></i>
          </button>
        </div>
      </div>
    `;

    card
      .querySelector(".btn-details")
      .addEventListener("click", () => viewDoctorDetails(doctor._id));

    card
      .querySelector(".btn-book")
      .addEventListener("click", () =>
        selectDoctorForBooking(doctor._id, doctor.name)
      );

    const favBtn = card.querySelector(".btn-fav");
    favBtn.addEventListener("click", () => toggleFavorite(doctor._id, favBtn));

    container.appendChild(card);
  });
}

/*
|--------------------------------------------------------------------------
| DOCTOR PROFILE MODAL WITH REVIEWS & RATINGS (Phase 5, 10, 12)
|--------------------------------------------------------------------------
*/
async function viewDoctorDetails(doctorId) {
  if (!isAuthenticated()) {
    openAuth("login");
    $("authMessage").textContent =
      "Please log in or sign up to view full doctor credentials and reviews.";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Could not load doctor details");
    const resData = await response.json();
    const doctor = resData.data;

    const hasProfileImage = Boolean(doctor.profileImage);
    const image = doctor.profileImage || "stethoscope.png";
    const verified = doctor.verificationStatus === "verified";
    const qualifications = listOrMissing(doctor.qualifications);
    const availableDays = listOrMissing(doctor.availableDays);
    const availableSlots = listOrMissing(doctor.availableTimeSlots);
    const isFav = userFavoritesSet.has(doctor._id);

    const fee =
      doctor.consultationFee !== undefined &&
      doctor.consultationFee !== null &&
      doctor.consultationFee !== ""
        ? `₹${escapeHtml(doctor.consultationFee)}`
        : "Not available";

    const sourceUrl =
      typeof doctor.sourceUrl === "string" &&
      /^https?:\/\//i.test(doctor.sourceUrl)
        ? doctor.sourceUrl
        : "";

    const reviews = doctor.reviews || [];
    const avgRating = doctor.averageRating || 0;
    const reviewCount = doctor.reviewCount || reviews.length;

    $("modalBody").innerHTML = `
      <div class="doctor-modal-profile">
        <div class="doctor-modal-hero" style="display: flex; gap: 20px; align-items: center; margin-bottom: 22px;">
          <img
            style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid var(--teal);"
            src="${escapeHtml(image)}"
            alt="${escapeHtml(valueOrMissing(doctor.name))}"
            onerror="this.onerror=null;this.src='stethoscope.png';"
          >
          <div style="flex: 1;">
            <p class="eyebrow"><i class="fa-solid fa-id-badge"></i> VERIFIED PRACTITIONER PROFILE</p>
            <h2 style="font-size: 24px; color: var(--navy); margin: 0 0 6px;">
              ${escapeHtml(valueOrMissing(doctor.name))}
            </h2>
            <p style="color: var(--teal); font-weight: 700; font-size: 14px; margin: 0 0 8px;">
              ${escapeHtml(valueOrMissing(doctor.specialization))}
            </p>
            <div style="display: flex; gap: 10px; align-items: center;">
              <span class="verification-badge ${verified ? "" : "not-verified"}">
                <i class="fa-solid fa-${
                  verified ? "circle-check" : "circle-exclamation"
                }"></i>
                ${verified ? "Verified Registration" : "Pending Verification"}
              </span>
              <button id="modalFavBtn" class="profile-save-btn ${
                isFav ? "active" : ""
              }" type="button">
                <i class="fa-${isFav ? "solid" : "regular"} fa-heart"></i>
                <span>${isFav ? "Saved to Favorites" : "Save Doctor"}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Credentials & Practice Info -->
        <div class="modal-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px;">
          <div class="modal-section">
            <h3><i class="fa-solid fa-certificate"></i> Registration & Council</h3>
            <p><strong>Reg. Number:</strong> ${escapeHtml(
              valueOrMissing(doctor.registrationNumber)
            )}</p>
            <p><strong>Medical Council:</strong> ${escapeHtml(
              valueOrMissing(doctor.registeredCouncil)
            )}</p>
            <p><strong>Registration Year:</strong> ${escapeHtml(
              valueOrMissing(doctor.registrationYear)
            )}</p>
            <p><strong>Qualifications:</strong> ${escapeHtml(qualifications)}</p>
          </div>

          <div class="modal-section">
            <h3><i class="fa-regular fa-hospital"></i> Practice & Availability</h3>
            <p><strong>Hospital / Clinic:</strong> ${escapeHtml(
              valueOrMissing(doctor.hospitalOrClinic)
            )}</p>
            <p><strong>Address:</strong> ${escapeHtml(
              valueOrMissing(doctor.clinicAddress)
            )}</p>
            <p><strong>Consultation Fee:</strong> ${fee}</p>
            <p><strong>Available Days:</strong> ${escapeHtml(availableDays)}</p>
            <p><strong>Time Slots:</strong> ${escapeHtml(availableSlots)}</p>
          </div>
        </div>

        <!-- Verification Source -->
        <div style="background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 14px 18px; margin-bottom: 22px;">
          <strong style="color: var(--navy); font-size: 13px; display: block; margin-bottom: 4px;">
            <i class="fa-solid fa-shield-check" style="color: var(--teal);"></i> Traceable Source Information
          </strong>
          <p style="font-size: 13px; color: var(--ink); margin: 0 0 4px;">
            ${escapeHtml(valueOrMissing(doctor.dataSource))}
          </p>
          ${
            sourceUrl
              ? `<a href="${escapeHtml(
                  sourceUrl
                )}" target="_blank" rel="noopener noreferrer" style="color: var(--teal); font-size: 12px; font-weight: 700;">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i> Verify on Official Source Registry
                 </a>`
              : ""
          }
        </div>

        <div style="display: flex; gap: 12px; margin-bottom: 24px;">
          <button class="btn btn-primary" id="modalBookBtn" type="button" style="flex: 1;">
            <i class="fa-regular fa-calendar-check"></i> Request Appointment with Doctor
          </button>
        </div>

        <!-- REVIEWS & RATINGS SECTION -->
        <div class="reviews-section-wrap">
          <div class="reviews-header-stats">
            <div>
              <h3 style="font-size: 18px; color: var(--navy); margin: 0 0 4px;">Patient Reviews &amp; Ratings</h3>
              <p style="font-size: 13px; color: var(--muted); margin: 0;">Verified community feedback</p>
            </div>
            <div class="rating-score-large">
              <i class="fa-solid fa-star" style="color: #f59e0b;"></i>
              <span>${avgRating > 0 ? avgRating : "N/A"}</span>
              <span style="font-size: 14px; font-weight: 600; color: var(--muted);">(${reviewCount} review${
      reviewCount === 1 ? "" : "s"
    })</span>
            </div>
          </div>

          <!-- Write a Review Form -->
          <div class="review-form-card">
            <h4 style="font-size: 14px; color: var(--navy); margin: 0 0 6px;">Leave Your Review</h4>
            <div class="star-rating-picker" id="starPicker">
              <i class="fa-solid fa-star selected" data-star="1"></i>
              <i class="fa-solid fa-star selected" data-star="2"></i>
              <i class="fa-solid fa-star selected" data-star="3"></i>
              <i class="fa-solid fa-star selected" data-star="4"></i>
              <i class="fa-solid fa-star selected" data-star="5"></i>
            </div>
            <textarea id="reviewCommentInput" style="width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 10px; font-size: 13px; resize: vertical;" rows="3" placeholder="Share your consultation experience with this specialist..." required></textarea>
            <button class="btn btn-primary" id="submitReviewBtn" type="button" style="margin-top: 10px; padding: 8px 16px; font-size: 13px;">
              <i class="fa-solid fa-paper-plane"></i> Submit Review
            </button>
            <div id="reviewFeedbackMsg" class="result-message" hidden style="margin-top: 10px;"></div>
          </div>

          <!-- Reviews List -->
          <div class="reviews-list-container" id="modalReviewsList">
            ${
              reviews.length === 0
                ? `<p style="font-size: 13px; color: var(--muted); font-style: italic;">No reviews have been submitted for this doctor yet. Be the first to share your experience!</p>`
                : reviews
                    .map((r) => {
                      const isOwn =
                        getCurrentUser() &&
                        (r.user?._id === getCurrentUser().id ||
                          r.user === getCurrentUser().id);
                      return `
                        <div class="review-card-item">
                          <div class="review-top-meta">
                            <span class="reviewer-name">${escapeHtml(
                              r.user?.fullName || "Verified Patient"
                            )}</span>
                            <div>
                              ${Array.from({ length: 5 })
                                .map(
                                  (_, i) =>
                                    `<i class="fa-solid fa-star" style="color: ${
                                      i < r.rating ? "#f59e0b" : "#e2e8f0"
                                    }; font-size: 11px;"></i>`
                                )
                                .join("")}
                              <span class="review-date" style="margin-left: 6px;">${new Date(
                                r.createdAt
                              ).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div class="review-comment-text">${escapeHtml(
                            r.comment
                          )}</div>
                          ${
                            isOwn
                              ? `<div class="review-item-actions">
                                  <button class="review-action-btn danger" onclick="deleteReview('${r._id}', '${doctor._id}')">
                                    <i class="fa-solid fa-trash"></i> Delete
                                  </button>
                                 </div>`
                              : ""
                          }
                        </div>
                      `;
                    })
                    .join("")
            }
          </div>
        </div>
      </div>
    `;

    // Modal Fav Toggle
    const modalFavBtn = $("modalFavBtn");
    if (modalFavBtn) {
      modalFavBtn.addEventListener("click", async () => {
        await toggleFavorite(doctor._id);
        const nowFav = userFavoritesSet.has(doctor._id);
        modalFavBtn.classList.toggle("active", nowFav);
        modalFavBtn.querySelector("span").textContent = nowFav
          ? "Saved to Favorites"
          : "Save Doctor";
        modalFavBtn.querySelector("i").className = `fa-${
          nowFav ? "solid" : "regular"
        } fa-heart`;
      });
    }

    // Modal Book Button
    $("modalBookBtn").addEventListener("click", () => {
      closeDoctorModal();
      selectDoctorForBooking(doctor._id, doctor.name);
    });

    // Star picker events
    currentReviewRating = 5;
    const starPicker = $("starPicker");
    if (starPicker) {
      const stars = starPicker.querySelectorAll("i");
      stars.forEach((star) => {
        star.addEventListener("click", () => {
          currentReviewRating = Number(star.dataset.star);
          stars.forEach((s, idx) => {
            if (idx < currentReviewRating) {
              s.className = "fa-solid fa-star selected";
            } else {
              s.className = "fa-regular fa-star";
            }
          });
        });
      });
    }

    // Submit review event
    $("submitReviewBtn").addEventListener("click", async () => {
      const comment = $("reviewCommentInput").value.trim();
      const feedback = $("reviewFeedbackMsg");
      if (!comment) {
        feedback.textContent = "Please write a comment for your review.";
        feedback.className = "result-message error";
        feedback.removeAttribute("hidden");
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/reviews/doctor/${doctor._id}`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ rating: currentReviewRating, comment })
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.message || "Unable to submit review");
        feedback.textContent = d.message || "Review submitted successfully!";
        feedback.className = "result-message success";
        feedback.removeAttribute("hidden");
        $("reviewCommentInput").value = "";

        // Reload modal details to show fresh review
        setTimeout(() => viewDoctorDetails(doctor._id), 800);
      } catch (err) {
        feedback.textContent = err.message;
        feedback.className = "result-message error";
        feedback.removeAttribute("hidden");
      }
    });

    $("doctorModal").removeAttribute("hidden");
    document.body.classList.add("modal-open");
  } catch (err) {
    console.error(err);
    alert("Could not load doctor details: " + err.message);
  }
}

function closeDoctorModal() {
  $("doctorModal").setAttribute("hidden", "");
  document.body.classList.remove("modal-open");
}

window.viewDoctorDetails = viewDoctorDetails;

window.deleteReview = async function (reviewId, doctorId) {
  if (!confirm("Are you sure you want to delete this review?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Could not delete review");
    viewDoctorDetails(doctorId);
  } catch (err) {
    alert(err.message);
  }
};

/*
|--------------------------------------------------------------------------
| FAVORITES MANAGEMENT (Phase 10)
|--------------------------------------------------------------------------
*/
async function loadUserFavorites() {
  if (!isAuthenticated()) {
    userFavoritesSet.clear();
    updateSavedBadge();
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/favorites`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return;
    const data = await res.json();
    userFavoritesSet = new Set((data.data || []).map((d) => d._id));
    updateSavedBadge();
  } catch (err) {
    console.warn("Error loading favorites:", err);
  }
}

function updateSavedBadge() {
  const badge = $("navSavedBadge");
  if (badge) {
    badge.textContent = userFavoritesSet.size.toString();
  }
}

async function toggleFavorite(doctorId, buttonElement = null) {
  if (!isAuthenticated()) {
    openAuth("login");
    $("authMessage").textContent =
      "Please log in or sign up to save favorite doctors.";
    return;
  }

  const isFavorited = userFavoritesSet.has(doctorId);
  const method = isFavorited ? "DELETE" : "POST";

  try {
    const res = await fetch(`${API_BASE_URL}/favorites/${doctorId}`, {
      method,
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Favorite update failed");

    if (isFavorited) {
      userFavoritesSet.delete(doctorId);
    } else {
      userFavoritesSet.add(doctorId);
    }

    updateSavedBadge();

    if (buttonElement) {
      const nowFav = userFavoritesSet.has(doctorId);
      buttonElement.classList.toggle("favorited", nowFav);
      buttonElement.querySelector("i").className = `fa-${
        nowFav ? "solid" : "regular"
      } fa-heart`;
    }
  } catch (err) {
    console.error("Favorite toggle error:", err);
  }
}

/*
|--------------------------------------------------------------------------
| USER DASHBOARD (Phase 9, 10, 11)
|--------------------------------------------------------------------------
*/
async function openUserDashboard(initialTab = "saved") {
  if (!isAuthenticated()) {
    openAuth("login");
    return;
  }

  const user = getCurrentUser();
  if (user) {
    $("dashUserMeta").textContent = `${escapeHtml(user.fullName)} (${escapeHtml(
      user.email
    )})`;
  }

  // Load live stats
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      const stats = data.stats || {};
      $("statSavedCount").textContent = stats.savedDoctors || 0;
      $("statUpcomingCount").textContent = stats.upcomingAppointments || 0;
      $("statCompletedCount").textContent = stats.completedAppointments || 0;
      $("statReviewsCount").textContent = stats.reviewsCount || 0;
    }
  } catch (err) {
    console.warn("Could not fetch me stats:", err);
  }

  switchDashboardTab(initialTab);
  $("userDashboardModal").removeAttribute("hidden");
  document.body.classList.add("modal-open");
}

function setupDashboardEvents() {
  document.querySelectorAll(".dashboard-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchDashboardTab(btn.dataset.tab);
    });
  });

  const closeBtn = $("closeUserDashboardBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      $("userDashboardModal").setAttribute("hidden", "");
      document.body.classList.remove("modal-open");
    });
  }

  // Profile Update Form
  const profileForm = $("profileUpdateForm");
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fullName = $("editFullName").value.trim();
      const phone = $("editPhone").value.trim();
      const msg = $("profileUpdateMessage");

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ fullName, phone })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Profile update failed");

        // Update stored user
        const stored = getCurrentUser() || {};
        stored.fullName = fullName;
        stored.phone = phone;
        localStorage.setItem("doctorfinder_user", JSON.stringify(stored));
        updateUIForAuthState(stored);

        msg.textContent = "Profile updated successfully!";
        msg.className = "result-message success";
        msg.removeAttribute("hidden");
      } catch (err) {
        msg.textContent = err.message;
        msg.className = "result-message error";
        msg.removeAttribute("hidden");
      }
    });
  }

  // Password Change Form
  const pwdForm = $("passwordChangeForm");
  if (pwdForm) {
    pwdForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const currentPassword = $("currentPassword").value;
      const newPassword = $("newPassword").value;
      const msg = $("passwordChangeMessage");

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me/password`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Password update failed");

        pwdForm.reset();
        msg.textContent = "Password changed successfully!";
        msg.className = "result-message success";
        msg.removeAttribute("hidden");
      } catch (err) {
        msg.textContent = err.message;
        msg.className = "result-message error";
        msg.removeAttribute("hidden");
      }
    });
  }
}

function switchDashboardTab(tabName) {
  document.querySelectorAll(".dashboard-tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  const panels = {
    saved: "tabContentSaved",
    upcoming: "tabContentUpcoming",
    past: "tabContentPast",
    reviews: "tabContentReviews",
    settings: "tabContentSettings"
  };

  Object.entries(panels).forEach(([key, elementId]) => {
    const el = $(elementId);
    if (el) {
      if (key === tabName) {
        el.removeAttribute("hidden");
      } else {
        el.setAttribute("hidden", "");
      }
    }
  });

  if (tabName === "saved") loadDashboardSaved();
  if (tabName === "upcoming" || tabName === "past") loadDashboardAppointments();
  if (tabName === "reviews") loadDashboardReviews();
  if (tabName === "settings") loadDashboardSettings();
}

async function loadDashboardSaved() {
  const container = $("dashSavedContainer");
  if (!container) return;
  container.innerHTML =
    '<div class="loading-spinner"><div class="spinner-ring"></div><strong>Loading saved doctors...</strong></div>';

  try {
    const res = await fetch(`${API_BASE_URL}/favorites`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    const docs = data.data || [];
    if (!docs.length) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; padding: 30px; text-align: center; color: var(--muted);">
          <i class="fa-regular fa-heart" style="font-size: 32px; color: var(--teal); margin-bottom: 12px; display: block;"></i>
          <strong>No saved doctors yet</strong>
          <p style="font-size: 13px; margin-top: 6px;">Click the heart icon on any doctor card to keep them saved here.</p>
        </div>
      `;
      return;
    }
    renderDoctors(docs, "dashSavedContainer");
  } catch (err) {
    container.innerHTML = `<p style="color: var(--rose);">Unable to load saved doctors.</p>`;
  }
}

async function loadDashboardAppointments() {
  const upcomingList = $("dashUpcomingList");
  const pastList = $("dashPastList");
  if (upcomingList) {
    upcomingList.innerHTML =
      '<div class="loading-spinner"><div class="spinner-ring"></div><strong>Loading appointments...</strong></div>';
  }

  try {
    const res = await fetch(`${API_BASE_URL}/appointments/my`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    const upcoming = data.data?.upcoming || [];
    const past = data.data?.past || [];

    if (upcomingList) {
      upcomingList.innerHTML =
        upcoming.length === 0
          ? `<p style="font-size: 13px; color: var(--muted); font-style: italic; padding: 20px;">No upcoming appointments.</p>`
          : upcoming
              .map(
                (apt) => `
                <div class="review-card-item">
                  <div class="review-top-meta">
                    <span class="reviewer-name" style="font-size: 15px;">
                      <i class="fa-solid fa-user-doctor" style="color: var(--teal)"></i> ${escapeHtml(
                        apt.doctor?.name || "Doctor"
                      )}
                    </span>
                    <span class="status-badge ${escapeHtml(apt.status)}">
                      ${escapeHtml(apt.status)}
                    </span>
                  </div>
                  <div style="font-size: 13px; color: var(--ink); margin: 6px 0; display: grid; gap: 4px;">
                    <div><i class="fa-regular fa-calendar"></i> <b>Preferred Date:</b> ${new Date(
                      apt.appointmentDate
                    ).toLocaleDateString()} at ${escapeHtml(apt.timeSlot)}</div>
                    <div><i class="fa-regular fa-hospital"></i> <b>Hospital:</b> ${escapeHtml(
                      apt.doctor?.hospitalOrClinic || "Clinic"
                    )}, ${escapeHtml(apt.doctor?.city || "")}</div>
                    ${
                      apt.notes
                        ? `<div><i class="fa-regular fa-note-sticky"></i> <b>Notes:</b> ${escapeHtml(
                            apt.notes
                          )}</div>`
                        : ""
                    }
                  </div>
                  ${
                    apt.status !== "cancelled"
                      ? `<div class="review-item-actions">
                          <button class="review-action-btn danger" onclick="cancelAppointment('${apt._id}')">
                            <i class="fa-solid fa-ban"></i> Cancel Request
                          </button>
                         </div>`
                      : ""
                  }
                </div>
              `
              )
              .join("");
    }

    if (pastList) {
      pastList.innerHTML =
        past.length === 0
          ? `<p style="font-size: 13px; color: var(--muted); font-style: italic; padding: 20px;">No past appointment history.</p>`
          : past
              .map(
                (apt) => `
                <div class="review-card-item">
                  <div class="review-top-meta">
                    <span class="reviewer-name">
                      ${escapeHtml(apt.doctor?.name || "Doctor")} (${escapeHtml(
                  apt.doctor?.specialization || ""
                )})
                    </span>
                    <span class="status-badge ${escapeHtml(apt.status)}">
                      ${escapeHtml(apt.status)}
                    </span>
                  </div>
                  <div style="font-size: 13px; color: var(--muted); margin: 4px 0;">
                    ${new Date(apt.appointmentDate).toLocaleDateString()} at ${escapeHtml(
                  apt.timeSlot
                )} &bull; ${escapeHtml(apt.doctor?.hospitalOrClinic || "")}
                  </div>
                  ${
                    apt.status === "completed"
                      ? `<div class="review-item-actions">
                          <button class="review-action-btn" onclick="viewDoctorDetails('${apt.doctor?._id}')">
                            <i class="fa-regular fa-star"></i> Leave Review
                          </button>
                         </div>`
                      : ""
                  }
                </div>
              `
              )
              .join("");
    }
  } catch (err) {
    if (upcomingList)
      upcomingList.innerHTML = `<p style="color: var(--rose);">Error loading appointments.</p>`;
  }
}

window.cancelAppointment = async function (aptId) {
  if (!confirm("Are you sure you want to cancel this appointment request?"))
    return;
  try {
    const res = await fetch(`${API_BASE_URL}/appointments/${aptId}/cancel`, {
      method: "PUT",
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Could not cancel appointment");
    loadDashboardAppointments();
  } catch (err) {
    alert(err.message);
  }
};

async function loadDashboardReviews() {
  const container = $("dashReviewsList");
  if (!container) return;
  container.innerHTML =
    '<div class="loading-spinner"><div class="spinner-ring"></div><strong>Loading your reviews...</strong></div>';

  try {
    const res = await fetch(`${API_BASE_URL}/reviews/my`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    const reviews = data.data || [];
    if (!reviews.length) {
      container.innerHTML = `<p style="font-size: 13px; color: var(--muted); font-style: italic; padding: 20px;">You have not written any doctor reviews yet.</p>`;
      return;
    }

    container.innerHTML = reviews
      .map(
        (r) => `
        <div class="review-card-item">
          <div class="review-top-meta">
            <span class="reviewer-name">${escapeHtml(
              r.doctor?.name || "Doctor"
            )}</span>
            <div>
              ${Array.from({ length: 5 })
                .map(
                  (_, i) =>
                    `<i class="fa-solid fa-star" style="color: ${
                      i < r.rating ? "#f59e0b" : "#e2e8f0"
                    }; font-size: 11px;"></i>`
                )
                .join("")}
              <span class="review-date" style="margin-left: 6px;">${new Date(
                r.createdAt
              ).toLocaleDateString()}</span>
            </div>
          </div>
          <p class="review-comment-text">${escapeHtml(r.comment)}</p>
          <div class="review-item-actions">
            <button class="review-action-btn danger" onclick="deleteMyReview('${
              r._id
            }')">
              <i class="fa-solid fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `
      )
      .join("");
  } catch (err) {
    container.innerHTML = `<p style="color: var(--rose);">Error loading reviews.</p>`;
  }
}

window.deleteMyReview = async function (reviewId) {
  if (!confirm("Are you sure you want to delete this review?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Could not delete review");
    loadDashboardReviews();
  } catch (err) {
    alert(err.message);
  }
};

function loadDashboardSettings() {
  const user = getCurrentUser();
  if (user) {
    if ($("editFullName")) $("editFullName").value = user.fullName || "";
    if ($("editPhone")) $("editPhone").value = user.phone || "";
  }
}

/*
|--------------------------------------------------------------------------
| ADMIN DASHBOARD PORTAL (Phase 13 & 14)
|--------------------------------------------------------------------------
*/
async function openAdminDashboard() {
  if (!isAdmin()) {
    alert("Unauthorized access. Admin privileges required.");
    return;
  }

  // Load KPI Stats
  try {
    const res = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const d = await res.json();
      const stats = d.data || {};
      $("adminTotalUsers").textContent = stats.totalUsers || 0;
      $("adminTotalDoctors").textContent = stats.totalDoctors || 0;
      $("adminVerifiedDoctors").textContent = stats.verifiedDoctors || 0;
      $("adminPendingDoctors").textContent = stats.pendingDoctors || 0;
      $("adminTotalAppointments").textContent = stats.totalAppointments || 0;
      $("adminTotalReviews").textContent = stats.totalReviews || 0;
    }
  } catch (err) {
    console.warn("Error fetching admin stats:", err);
  }

  switchAdminTab("doctors");
  $("adminDashboardModal").removeAttribute("hidden");
  document.body.classList.add("modal-open");
}

function setupAdminEvents() {
  document.querySelectorAll("[data-admin-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchAdminTab(btn.dataset.adminTab);
    });
  });

  const closeBtn = $("closeAdminDashboardBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      $("adminDashboardModal").setAttribute("hidden", "");
      document.body.classList.remove("modal-open");
    });
  }

  const doctorStatusFilter = $("adminDoctorStatusFilter");
  if (doctorStatusFilter) {
    doctorStatusFilter.addEventListener("change", loadAdminDoctors);
  }

  const doctorSearchInput = $("adminDoctorSearchInput");
  if (doctorSearchInput) {
    doctorSearchInput.addEventListener("input", debounce(loadAdminDoctors, 300));
  }

  const aptStatusFilter = $("adminAptStatusFilter");
  if (aptStatusFilter) {
    aptStatusFilter.addEventListener("change", loadAdminAppointments);
  }

  // Open Add Doctor Modal
  const openAddDoc = $("openAddDoctorModalBtn");
  if (openAddDoc) {
    openAddDoc.addEventListener("click", () => {
      $("addDoctorModal").removeAttribute("hidden");
    });
  }

  const closeAddDoc = $("closeAddDoctorBtn");
  if (closeAddDoc) {
    closeAddDoc.addEventListener("click", () => {
      $("addDoctorModal").setAttribute("hidden", "");
    });
  }

  // Add Doctor Form Submit
  const addDocForm = $("addDoctorForm");
  if (addDocForm) {
    addDocForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = $("addDoctorMessage");
      const name = $("newDocName").value.trim();
      const registrationNumber = $("newDocReg").value.trim();
      const registeredCouncil = $("newDocCouncil").value.trim();
      const registrationYear = $("newDocRegYear").value
        ? Number($("newDocRegYear").value)
        : undefined;
      const qualifications = $("newDocQual").value
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      const specialization = $("newDocSpec").value.trim();
      const state = $("newDocState").value.trim();
      const city = $("newDocCity").value.trim();
      const hospitalOrClinic = $("newDocHospital").value.trim();
      const consultationFee = $("newDocFee").value
        ? Number($("newDocFee").value)
        : undefined;
      const clinicAddress = $("newDocAddress").value.trim();
      const lat = $("newDocLat").value ? Number($("newDocLat").value) : null;
      const lng = $("newDocLng").value ? Number($("newDocLng").value) : null;
      const dataSource = $("newDocSource").value.trim();
      const sourceUrl = $("newDocSourceUrl").value.trim();
      const verificationStatus = $("newDocVerification").value;

      let location = undefined;
      if (lat !== null && lng !== null) {
        location = { type: "Point", coordinates: [lng, lat] };
      }

      try {
        const res = await fetch(`${API_BASE_URL}/doctors`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name,
            registrationNumber,
            registeredCouncil,
            registrationYear,
            qualifications,
            specialization,
            state,
            city,
            hospitalOrClinic,
            consultationFee,
            clinicAddress,
            location,
            dataSource,
            sourceUrl,
            verificationStatus
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create doctor");

        msg.textContent = "Doctor created successfully!";
        msg.className = "result-message success";
        msg.removeAttribute("hidden");
        addDocForm.reset();
        setTimeout(() => {
          $("addDoctorModal").setAttribute("hidden", "");
          loadAdminDoctors();
        }, 1000);
      } catch (err) {
        msg.textContent = err.message;
        msg.className = "result-message error";
        msg.removeAttribute("hidden");
      }
    });
  }
}

function switchAdminTab(tabName) {
  document.querySelectorAll("[data-admin-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.adminTab === tabName);
  });

  const panels = {
    doctors: "adminTabDoctors",
    users: "adminTabUsers",
    appointments: "adminTabAppointments",
    reviews: "adminTabReviews"
  };

  Object.entries(panels).forEach(([key, elId]) => {
    const el = $(elId);
    if (el) {
      if (key === tabName) {
        el.removeAttribute("hidden");
      } else {
        el.setAttribute("hidden", "");
      }
    }
  });

  if (tabName === "doctors") loadAdminDoctors();
  if (tabName === "users") loadAdminUsers();
  if (tabName === "appointments") loadAdminAppointments();
  if (tabName === "reviews") loadAdminReviews();
}

async function loadAdminDoctors() {
  const tbody = $("adminDoctorsTableBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">Loading doctors directory...</td></tr>`;

  const status = $("adminDoctorStatusFilter")?.value || "";
  const search = $("adminDoctorSearchInput")?.value.trim() || "";

  try {
    const res = await fetch(
      `${API_BASE_URL}/admin/doctors?status=${encodeURIComponent(
        status
      )}&search=${encodeURIComponent(search)}`,
      { headers: getAuthHeaders() }
    );
    const data = await res.json();
    const doctors = data.data || [];

    if (!doctors.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--muted);">No matching doctors found.</td></tr>`;
      return;
    }

    tbody.innerHTML = doctors
      .map(
        (doc) => `
        <tr>
          <td><strong>${escapeHtml(doc.name)}</strong></td>
          <td>${escapeHtml(doc.registrationNumber)}</td>
          <td>${escapeHtml(doc.specialization || "General")}</td>
          <td>${escapeHtml(doc.hospitalOrClinic || doc.city || "N/A")}</td>
          <td>
            <span class="status-badge ${escapeHtml(doc.verificationStatus)}">
              ${escapeHtml(doc.verificationStatus)}
            </span>
          </td>
          <td>
            <small style="display: block; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(doc.dataSource)}
            </small>
            ${
              doc.sourceUrl
                ? `<a href="${escapeHtml(
                    doc.sourceUrl
                  )}" target="_blank" style="color: var(--teal); font-size: 11px;">Link</a>`
                : ""
            }
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              ${
                doc.verificationStatus !== "verified"
                  ? `<button class="table-action-btn verify" onclick="adminVerifyDoctor('${doc._id}')">Verify</button>`
                  : `<button class="table-action-btn reject" onclick="adminRejectDoctor('${doc._id}')">Unverify</button>`
              }
              <button class="table-action-btn" style="color: var(--rose);" onclick="adminDeleteDoctor('${
                doc._id
              }')">Delete</button>
            </div>
          </td>
        </tr>
      `
      )
      .join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--rose); padding: 20px;">Error loading doctors.</td></tr>`;
  }
}

window.adminVerifyDoctor = async function (id) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/doctors/${id}/verify`, {
      method: "PATCH",
      headers: getAuthHeaders()
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || "Failed to verify doctor");
    loadAdminDoctors();
  } catch (err) {
    alert(err.message);
  }
};

window.adminRejectDoctor = async function (id) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/doctors/${id}/reject`, {
      method: "PATCH",
      headers: getAuthHeaders()
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || "Failed to reject doctor");
    loadAdminDoctors();
  } catch (err) {
    alert(err.message);
  }
};

window.adminDeleteDoctor = async function (id) {
  if (!confirm("Are you sure you want to permanently delete this doctor record?"))
    return;
  try {
    const res = await fetch(`${API_BASE_URL}/doctors/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Delete failed");
    loadAdminDoctors();
  } catch (err) {
    alert(err.message);
  }
};

async function loadAdminUsers() {
  const tbody = $("adminUsersTableBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Loading users...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    const users = data.data || [];

    tbody.innerHTML = users
      .map(
        (u) => `
        <tr>
          <td><strong>${escapeHtml(u.fullName)}</strong></td>
          <td>${escapeHtml(u.email)}</td>
          <td>${escapeHtml(u.phone)}</td>
          <td>
            <span class="status-badge ${u.role === "admin" ? "verified" : "requested"}">
              ${escapeHtml(u.role || "user")}
            </span>
          </td>
          <td>${new Date(u.createdAt).toLocaleDateString()}</td>
          <td>
            <button class="table-action-btn" onclick="adminToggleUserRole('${
              u._id
            }', '${u.role === "admin" ? "user" : "admin"}')">
              ${u.role === "admin" ? "Revoke Admin" : "Make Admin"}
            </button>
          </td>
        </tr>
      `
      )
      .join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--rose);">Error loading users.</td></tr>`;
  }
}

window.adminToggleUserRole = async function (userId, newRole) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ role: newRole })
    });
    if (!res.ok) throw new Error("Failed to change user role");
    loadAdminUsers();
  } catch (err) {
    alert(err.message);
  }
};

async function loadAdminAppointments() {
  const tbody = $("adminAppointmentsTableBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Loading appointments...</td></tr>`;

  const status = $("adminAptStatusFilter")?.value || "";

  try {
    const res = await fetch(
      `${API_BASE_URL}/admin/appointments?status=${encodeURIComponent(status)}`,
      { headers: getAuthHeaders() }
    );
    const data = await res.json();
    const apts = data.data || [];

    if (!apts.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--muted); padding: 20px;">No appointments found.</td></tr>`;
      return;
    }

    tbody.innerHTML = apts
      .map(
        (apt) => `
        <tr>
          <td>
            <strong>${escapeHtml(apt.patientName)}</strong><br>
            <small style="color: var(--muted);">${escapeHtml(
              apt.patientEmail
            )} &bull; ${escapeHtml(apt.patientPhone)}</small>
          </td>
          <td>${escapeHtml(apt.doctor?.name || "Doctor")}</td>
          <td>
            ${new Date(apt.appointmentDate).toLocaleDateString()}<br>
            <small style="color: var(--muted);">${escapeHtml(apt.timeSlot)}</small>
          </td>
          <td>
            <span class="status-badge ${escapeHtml(apt.status)}">
              ${escapeHtml(apt.status)}
            </span>
          </td>
          <td style="max-width: 160px; font-size: 12px; color: var(--muted);">${escapeHtml(
            apt.notes || "None"
          )}</td>
          <td>
            <select onchange="adminUpdateAptStatus('${apt._id}', this.value)" style="padding: 4px 8px; border-radius: 6px; border: 1px solid var(--line); font-size: 12px;">
              <option value="requested" ${
                apt.status === "requested" ? "selected" : ""
              }>Requested</option>
              <option value="confirmed" ${
                apt.status === "confirmed" ? "selected" : ""
              }>Confirmed</option>
              <option value="completed" ${
                apt.status === "completed" ? "selected" : ""
              }>Completed</option>
              <option value="cancelled" ${
                apt.status === "cancelled" ? "selected" : ""
              }>Cancelled</option>
            </select>
          </td>
        </tr>
      `
      )
      .join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--rose);">Error loading appointments.</td></tr>`;
  }
}

window.adminUpdateAptStatus = async function (aptId, newStatus) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/admin/appointments/${aptId}/status`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      }
    );
    if (!res.ok) throw new Error("Status update failed");
    loadAdminAppointments();
  } catch (err) {
    alert(err.message);
  }
};

async function loadAdminReviews() {
  const tbody = $("adminReviewsTableBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Loading reviews...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE_URL}/admin/reviews`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    const reviews = data.data || [];

    if (!reviews.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--muted); padding: 20px;">No patient reviews recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = reviews
      .map(
        (r) => `
        <tr>
          <td><strong>${escapeHtml(r.user?.fullName || "Patient")}</strong><br><small style="color: var(--muted);">${escapeHtml(
          r.user?.email || ""
        )}</small></td>
          <td>${escapeHtml(r.doctor?.name || "Doctor")}</td>
          <td>
            <span style="color: #b45309; font-weight: 700;">
              <i class="fa-solid fa-star"></i> ${r.rating}
            </span>
          </td>
          <td style="max-width: 220px; font-size: 13px;">${escapeHtml(
            r.comment
          )}</td>
          <td>${new Date(r.createdAt).toLocaleDateString()}</td>
          <td>
            <button class="table-action-btn reject" onclick="adminDeleteReview('${
              r._id
            }')">
              Delete
            </button>
          </td>
        </tr>
      `
      )
      .join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--rose);">Error loading reviews.</td></tr>`;
  }
}

window.adminDeleteReview = async function (id) {
  if (!confirm("Are you sure you want to delete and moderate this review?"))
    return;
  try {
    const res = await fetch(`${API_BASE_URL}/admin/reviews/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Review deletion failed");
    loadAdminReviews();
  } catch (err) {
    alert(err.message);
  }
};

/*
|--------------------------------------------------------------------------
| AI SPECIALIST RECOMMENDATION (Phase 15 - Gemini Proxy)
|--------------------------------------------------------------------------
*/
function openAiModal() {
  $("aiModal").removeAttribute("hidden");
  document.body.classList.add("modal-open");
}

function setupAiEvents() {
  const closeBtn = $("closeAiModalBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      $("aiModal").setAttribute("hidden", "");
      document.body.classList.remove("modal-open");
    });
  }

  // Quick prompt chips
  document.querySelectorAll(".ai-example-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const input = $("aiSymptomInput");
      if (input) {
        input.value = chip.dataset.prompt;
        input.focus();
      }
    });
  });

  const form = $("aiRecommendForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const symptoms = $("aiSymptomInput").value.trim();
      if (!symptoms) return;

      const loading = $("aiLoading");
      const resultPanel = $("aiResultPanel");
      const submitBtn = $("aiSubmitBtn");

      loading.removeAttribute("hidden");
      resultPanel.setAttribute("hidden", "");
      submitBtn.disabled = true;

      try {
        const res = await fetch(`${API_BASE_URL}/ai/recommend`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ symptoms })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to analyze symptoms");
        }

        const rec = data.recommendation || {};
        $("aiPrimarySpecBadge").textContent =
          rec.primarySpecialization || "General Medicine";
        $("aiExplanation").textContent = rec.explanation || "";

        const qList = $("aiQuestionsList");
        if (qList) {
          qList.replaceChildren();
          (rec.suggestedQuestions || []).forEach((q) => {
            const li = document.createElement("li");
            li.textContent = q;
            qList.appendChild(li);
          });
        }

        if (data.disclaimer) {
          $("aiDisclaimerText").innerHTML = `<strong>Important Safety Notice:</strong> ${escapeHtml(
            data.disclaimer
          )}`;
        }

        const matchDocs = data.matchingDoctors || [];
        renderDoctors(matchDocs, "aiMatchedDoctorsContainer");

        resultPanel.removeAttribute("hidden");
      } catch (err) {
        alert("AI Assistant notice: " + err.message);
      } finally {
        loading.setAttribute("hidden", "");
        submitBtn.disabled = false;
      }
    });
  }
}

/*
|--------------------------------------------------------------------------
| HEALTH & WELLNESS ARTICLES (Phase 16)
|--------------------------------------------------------------------------
*/
let cachedHealthArticles = [];

async function loadHealthWellnessArticles(category = "") {
  const container = $("healthArticlesContainer");
  if (!container) return;

  container.innerHTML =
    '<div class="loading-spinner"><div class="spinner-ring"></div><strong>Loading health guidelines...</strong></div>';

  try {
    const url = category
      ? `${API_BASE_URL}/health-wellness?category=${encodeURIComponent(category)}`
      : `${API_BASE_URL}/health-wellness`;
    const res = await fetch(url);
    const data = await res.json();
    cachedHealthArticles = data.data || [];

    if (!cachedHealthArticles.length) {
      container.innerHTML = `<p style="color: var(--muted); padding: 20px;">No articles found in this category.</p>`;
      return;
    }

    container.innerHTML = cachedHealthArticles
      .map(
        (article, idx) => `
        <article class="health-article-card">
          <div class="health-article-meta">
            <span class="health-cat-badge">${escapeHtml(article.category)}</span>
            <span><i class="fa-regular fa-clock"></i> ${escapeHtml(
              article.readTime || "4 min read"
            )}</span>
          </div>
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.summary)}</p>
          <button class="health-read-btn" type="button" onclick="openHealthArticle(${idx})">
            Read Full Guide <i class="fa-solid fa-arrow-right"></i>
          </button>
        </article>
      `
      )
      .join("");
  } catch (err) {
    container.innerHTML = `<p style="color: var(--rose);">Unable to load wellness articles.</p>`;
  }
}

function setupHealthEvents() {
  document.querySelectorAll("#healthCategoryTabs .cat-pill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("#healthCategoryTabs .cat-pill-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      loadHealthWellnessArticles(btn.dataset.cat);
    });
  });

  const closeBtn = $("closeHealthModalBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      $("healthArticleModal").setAttribute("hidden", "");
      document.body.classList.remove("modal-open");
    });
  }
}

window.openHealthArticle = function (index) {
  const article = cachedHealthArticles[index];
  if (!article) return;

  $("healthModalCategory").textContent = article.category;
  $("healthModalTitle").textContent = article.title;
  $("healthModalReadTime").textContent = article.readTime || "4 min read";
  $("healthModalSummary").textContent = article.summary;
  $("healthModalDetailed").textContent = article.detailedContent;

  const tipsList = $("healthModalTipsList");
  if (tipsList) {
    tipsList.replaceChildren();
    (article.keyTips || []).forEach((tip) => {
      const li = document.createElement("li");
      li.textContent = tip;
      tipsList.appendChild(li);
    });
  }

  $("healthModalDisclaimer").textContent =
    article.disclaimer ||
    "Informational purposes only. Always consult a certified medical professional for diagnosis and therapy.";

  $("healthArticleModal").removeAttribute("hidden");
  document.body.classList.add("modal-open");
};

/*
|--------------------------------------------------------------------------
| APPOINTMENTS REQUEST (Phase 11)
|--------------------------------------------------------------------------
*/
function selectDoctorForBooking(id, name) {
  const doctor = currentDoctors.find((item) => item._id === id);
  if (!doctor) {
    showResultMessage("Doctor not found in current results.", "error");
    return;
  }

  selectedDoctorId = id;
  $("selectedDoctorId").value = id;
  $("selectedDoctorName").textContent = valueOrMissing(name);
  if ($("requestDoctorSummary")) {
    $("requestDoctorSummary").textContent = valueOrMissing(name);
  }
  $("doctorSelection").removeAttribute("hidden");

  // Clear previous message
  $("appointmentMessage").textContent = "";
  $("appointmentMessage").className = "appointment-message";
  $("appointmentMessage").setAttribute("hidden", "");

  const user = getCurrentUser();
  if (user) {
    if (!$("patientName").value) $("patientName").value = user.fullName || "";
    if (!$("patientEmail").value) $("patientEmail").value = user.email || "";
    if (!$("patientPhone").value) $("patientPhone").value = user.phone || "";
  }

  $("requestModal").removeAttribute("hidden");
  document.body.classList.add("modal-open");
}

async function handleAppointmentSubmit(event) {
  event.preventDefault();

  if (!isAuthenticated()) {
    closeRequestModal();
    openAuth("login");
    $("authMessage").textContent =
      "Please log in or sign up to request an appointment.";
    return;
  }

  if (!selectedDoctorId) {
    showAppointmentMessage("Select a doctor from the directory first.", "error");
    return;
  }

  const patientName = $("patientName").value.trim();
  const patientEmail = $("patientEmail").value.trim();
  const patientPhone = $("patientPhone").value.trim();
  const appointmentDate = $("appointmentDate").value;
  const appointmentTime = $("appointmentTime").value.trim();
  const notes = $("appointmentNotes").value.trim();

  const today = new Date();
  const todayString = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 10);

  if (
    !patientName ||
    patientName.length > 120 ||
    !/^\S+@\S+\.\S+$/.test(patientEmail) ||
    !/^\d{10}$/.test(patientPhone.replace(/\D/g, "")) ||
    !appointmentDate ||
    !appointmentTime ||
    notes.length > 1000
  ) {
    showAppointmentMessage(
      "Please provide a valid name, email, 10-digit phone number, date, and preferred time slot.",
      "error"
    );
    return;
  }

  if (appointmentDate < todayString) {
    showAppointmentMessage(
      "Preferred consultation date must be today or in the future.",
      "error"
    );
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/appointments`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        doctorId: selectedDoctorId,
        patientName,
        patientEmail,
        patientPhone,
        appointmentDate: `${appointmentDate}T00:00:00.000Z`,
        timeSlot: appointmentTime,
        notes
      })
    });

    if (response.status === 401) {
      closeRequestModal();
      clearSession();
      updateUIForAuthState(null);
      openAuth("login");
      $("authMessage").textContent =
        "Session expired. Please log in again.";
      return;
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      showAppointmentMessage(
        data.message || "Unable to submit appointment request.",
        "error"
      );
      return;
    }

    const doctor = currentDoctors.find((d) => d._id === selectedDoctorId);
    showRequestSuccess({
      doctorName: doctor?.name,
      date: appointmentDate,
      time: appointmentTime
    });

    $("appointmentForm").reset();
    selectedDoctorId = null;
    $("doctorSelection").setAttribute("hidden", "");
  } catch (error) {
    console.error(error);
    showAppointmentMessage(
      "Unable to submit appointment request. Please check your connection and try again.",
      "error"
    );
  }
}

function showAppointmentMessage(message, type) {
  const element = $("appointmentMessage");
  if (!element) return;
  element.textContent = message;
  element.className = `appointment-message ${type}`;
  element.removeAttribute("hidden");
}

function setLoading(isLoading) {
  $("loadingSpinner").hidden = !isLoading;
  $("searchBtn").disabled = isLoading;
}

function showResultMessage(message, type) {
  const element = $("resultMessage");
  if (!element) return;
  element.className = `result-message ${type}`;
  element.innerHTML = `
    <i class="fa-solid fa-${
      type === "error"
        ? "triangle-exclamation"
        : type === "success"
        ? "circle-check"
        : type === "empty"
        ? "magnifying-glass"
        : "compass"
    }"></i>
    <div>
      <strong>${escapeHtml(message)}</strong>
      <p>${
        type === "info" || type === "empty"
          ? "Search by city, specialization, or doctor name."
          : ""
      }</p>
    </div>
  `;
}

/*
|--------------------------------------------------------------------------
| LOCATION SELECTOR & DYNAMIC FILTERS INITIALIZATION
|--------------------------------------------------------------------------
*/
let verifiedFilterMetadata = {
  states: [],
  cities: [],
  specializations: [],
  hospitals: [],
  doctorNames: [],
  totalVerifiedDoctors: 0
};

async function loadDynamicFilters() {
  try {
    const res = await fetch(`${API_BASE_URL}/doctors/filters`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return;
    const json = await res.json();
    if (json.success && json.data) {
      verifiedFilterMetadata = json.data;
      refreshLocationDropdowns();
    }
  } catch (err) {
    console.warn("Unable to load dynamic filters from server:", err);
  }
}

function refreshLocationDropdowns() {
  const stateSelect = $("searchByState");
  if (!stateSelect) return;

  const currentSelectedState = stateSelect.value;
  stateSelect.replaceChildren();

  const allStatesOption = document.createElement("option");
  allStatesOption.value = "";
  allStatesOption.textContent = "All States (Across India)";
  stateSelect.appendChild(allStatesOption);

  const verifiedStatesSet = new Set(verifiedFilterMetadata.states || []);

  const combinedStates = Array.from(
    new Set([...(verifiedFilterMetadata.states || []), ...INDIA_STATES_AND_UTS])
  ).sort((a, b) => a.localeCompare(b));

  combinedStates.forEach((state) => {
    const option = document.createElement("option");
    option.value = state;
    if (verifiedStatesSet.has(state)) {
      option.textContent = `${state} (Verified Doctors)`;
    } else {
      option.textContent = state;
    }
    stateSelect.appendChild(option);
  });

  if (currentSelectedState) {
    stateSelect.value = currentSelectedState;
  }

  populateCitiesForState(stateSelect.value);
}

function initializeLocationSearch() {
  const stateSelect = $("searchByState");
  const citySelect = $("searchByCity");
  if (!stateSelect || !citySelect) return;

  refreshLocationDropdowns();

  stateSelect.addEventListener("change", async () => {
    const selectedState = stateSelect.value;
    populateCitiesForState(selectedState);
    if (selectedState) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/doctors/filters?state=${encodeURIComponent(selectedState)}`,
          { headers: getAuthHeaders() }
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.cities?.length) {
            const verifiedCitiesForState = new Set(json.data.cities);
            Array.from(citySelect.options).forEach((opt) => {
              if (opt.value && verifiedCitiesForState.has(opt.value)) {
                opt.textContent = `${opt.value} (Verified Doctors)`;
              }
            });
          }
        }
      } catch (e) {}
    }
  });

  citySelect.addEventListener("change", () => {
    const chosenCity = citySelect.value;
    if (chosenCity && !stateSelect.value && window.INDIA_CITY_DATA) {
      const match = window.INDIA_CITY_DATA.find(
        (c) => c.name && c.name.toLowerCase() === chosenCity.toLowerCase()
      );
      if (match && match.state) {
        stateSelect.value = match.state;
      }
    }
  });

  populateCitiesForState("");
}

function populateCitiesForState(state) {
  const citySelect = $("searchByCity");
  if (!citySelect) return;

  const currentVal = citySelect.value;
  citySelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  citySelect.appendChild(placeholder);

  if (!state) {
    placeholder.textContent = "All Cities (Across India)";
    const verifiedCities = (verifiedFilterMetadata.cities || []).filter(Boolean);
    verifiedCities.forEach((city) => {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = `${city} (Verified Doctors)`;
      citySelect.appendChild(option);
    });
    citySelect.disabled = false;
    citySelect.value = currentVal && verifiedCities.includes(currentVal) ? currentVal : "";
    return;
  }

  placeholder.textContent = `All Cities in ${state}`;

  const datasetState = LOCATION_STATE_ALIASES[state] || state;
  const stateNamesToMatch = new Set([state, datasetState]);

  const staticCities = (window.INDIA_CITY_DATA || [])
    .filter((entry) => stateNamesToMatch.has(entry.state?.trim()))
    .map((entry) => entry.name?.trim())
    .filter(Boolean);

  const allCities = [
    ...new Set([...staticCities])
  ].sort((a, b) => a.localeCompare(b));

  allCities.forEach((city) => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    citySelect.appendChild(option);
  });

  citySelect.disabled = allCities.length === 0;
  if (!allCities.length) {
    placeholder.textContent = `All Cities in ${state}`;
  } else {
    citySelect.value = currentVal && allCities.includes(currentVal) ? currentVal : "";
  }
}

function clearSearch() {
  $("searchByState").value = "";
  populateCitiesForState("");
  [
    "searchBySpecialization",
    "searchByName",
    "searchByHospital",
    "filterFee",
    "filterAvailability",
    "filterRating"
  ].forEach((id) => {
    const el = $(id);
    if (el) el.value = "";
  });

  ["specAutocomplete", "nameAutocomplete", "hospitalAutocomplete"].forEach((id) => {
    const dropdown = $(id);
    if (dropdown) {
      dropdown.setAttribute("hidden", "");
      dropdown.replaceChildren();
    }
  });

  if ($("sortBy")) $("sortBy").value = "name_asc";
  if ($("filterRadius")) $("filterRadius").value = "10";

  // Reset nearby mode and cached location
  isNearbyMode = false;
  currentUserLocation = null;

  updateActiveFilterBadge();

  currentDoctors = [];
  const docContainer = $("doctorContainer");
  if (docContainer) {
    docContainer.replaceChildren();
    docContainer.classList.remove("results-arrived");
  }
  $("resultsTitle").textContent = "Doctors near you";
  $("resultsCount").textContent = "Select a state and city to begin.";
  showResultMessage("Ready when you are", "info");

  // Hide Search This Area button
  const searchAreaBtn = $("searchThisAreaBtn");
  if (searchAreaBtn) searchAreaBtn.setAttribute("hidden", "");

  if (leafletMap && leafletMarkersLayer) {
    leafletMarkersLayer.clearLayers();
  }

  // Update map count badge
  const countBadge = $("mapCountBadge");
  if (countBadge) countBadge.textContent = "0 on map";
}

/*
|--------------------------------------------------------------------------
| REQUEST DRAWER & SUCCESS MODAL
|--------------------------------------------------------------------------
*/
function createRequestExperience() {
  if ($("requestModal")) return;

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div id="requestModal" class="modal" hidden>
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="requestModalTitle">
          <button class="modal-close" type="button" aria-label="Close request dialog">
            <i class="fa-solid fa-xmark"></i>
          </button>
          <div class="modal-header">
            <p class="eyebrow"><i class="fa-regular fa-calendar-check"></i> REQUEST CONSULTATION</p>
            <h2 id="requestModalTitle">Appointment Request</h2>
            <p>Selected Specialist: <strong id="requestDoctorSummary" style="color: var(--teal)"></strong></p>
          </div>
          <div id="requestDrawerBody"></div>
        </div>
      </div>

      <div id="successModal" class="modal" hidden>
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="successTitle">
          <button class="modal-close" type="button" aria-label="Close success dialog">
            <i class="fa-solid fa-xmark"></i>
          </button>
          <div style="text-align: center; padding: 20px 10px;">
            <i class="fa-solid fa-circle-check" style="font-size: 52px; color: var(--emerald); margin-bottom: 16px;"></i>
            <h2 id="successTitle" style="color: var(--navy); margin-bottom: 8px;">Request Submitted</h2>
            <p style="font-size: 14px; color: var(--ink); margin-bottom: 18px;" id="successSummary"></p>
            <div style="background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 14px; font-size: 12px; color: var(--muted); margin-bottom: 22px;">
              <i class="fa-solid fa-info-circle"></i> This request has been logged in your Patient Dashboard under "Requested" status.
            </div>
            <button class="btn btn-primary" id="successCloseBtn" type="button" style="width: 100%;">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    `
  );

  const drawerBody = $("requestDrawerBody");
  const appointmentForm = $("appointmentForm");
  if (drawerBody && appointmentForm) {
    drawerBody.appendChild(appointmentForm);
  }

  document
    .querySelectorAll("#requestModal .modal-close")
    .forEach((btn) => btn.addEventListener("click", closeRequestModal));

  $("requestModal").addEventListener("click", (e) => {
    if (e.target === $("requestModal")) closeRequestModal();
  });

  document
    .querySelectorAll("#successModal .modal-close")
    .forEach((btn) => btn.addEventListener("click", closeSuccessModal));

  $("successModal").addEventListener("click", (e) => {
    if (e.target === $("successModal")) closeSuccessModal();
  });

  const successCloseBtn = $("successCloseBtn");
  if (successCloseBtn) {
    successCloseBtn.addEventListener("click", () => {
      closeSuccessModal();
      openUserDashboard("upcoming");
    });
  }
}

function closeRequestModal() {
  $("requestModal").setAttribute("hidden", "");
  document.body.classList.remove("modal-open");
}

function closeSuccessModal() {
  $("successModal").setAttribute("hidden", "");
  document.body.classList.remove("modal-open");
}

function showRequestSuccess(details) {
  closeRequestModal();
  $("successSummary").textContent = `Your appointment request with ${escapeHtml(
    details.doctorName || "Doctor"
  )} for ${escapeHtml(details.date)} (${escapeHtml(
    details.time
  )}) has been successfully sent.`;
  $("successModal").removeAttribute("hidden");
  document.body.classList.add("modal-open");
}

/*
|--------------------------------------------------------------------------
| AUTHENTICATION HANDLING (Phase 1 & 19)
|--------------------------------------------------------------------------
*/
function openAuth(mode) {
  authMode = mode === "signup" ? "signup" : "login";
  setAuthMode(authMode);
  $("authModal").removeAttribute("hidden");
  document.body.classList.add("modal-open");
  $("authMessage").textContent = "";
}

function closeAuthModal() {
  $("authModal").setAttribute("hidden", "");
  document.body.classList.remove("modal-open");
}

function setAuthMode(mode) {
  authMode = mode;
  document
    .querySelectorAll("[data-auth-tab]")
    .forEach((btn) => btn.classList.toggle("active", btn.dataset.authTab === mode));

  const isLogin = mode === "login";
  $("authTitle").textContent = isLogin ? "Welcome Back" : "Create Account";
  $("authIntro").textContent = isLogin
    ? "Sign in to access Doctor Search, Appointments, and AI recommendations."
    : "Create your free account to discover and book verified doctors.";
  $("authSubmit").textContent = isLogin ? "Login" : "Sign Up";

  $("fullNameField").style.display = isLogin ? "none" : "grid";
  $("phoneField").style.display = isLogin ? "none" : "grid";
  $("confirmPasswordField").style.display = isLogin ? "none" : "grid";
  $("rememberRow").style.display = isLogin ? "flex" : "none";
  $("forgotPassword").style.display = isLogin ? "block" : "none";

  const visualLogin = $("authVisualLogin");
  const visualSignup = $("authVisualSignup");
  if (visualLogin && visualSignup) {
    visualLogin.style.display = isLogin ? "block" : "none";
    visualSignup.style.display = isLogin ? "none" : "block";
  }

  const switchText = $("authSwitchText");
  if (switchText) {
    switchText.innerHTML = isLogin
      ? `Don't have an account? <button type="button" data-auth-tab="signup">Sign Up</button>`
      : `Already have an account? <button type="button" data-auth-tab="login">Login</button>`;

    switchText
      .querySelector("button")
      .addEventListener("click", () =>
        setAuthMode(isLogin ? "signup" : "login")
      );
  }
}

function decorateAuthForm() {
  setAuthMode("login");
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const fullName = $("authFullName").value.trim();
  const phone = $("authPhone").value.trim();
  const confirmPassword = $("authConfirmPassword").value;

  const authMessage = $("authMessage");
  authMessage.textContent = "";

  const endpoint =
    authMode === "signup"
      ? `${API_BASE_URL}/auth/signup`
      : `${API_BASE_URL}/auth/login`;

  const payload =
    authMode === "signup"
      ? { fullName, email, phone, password, confirmPassword }
      : { email, password };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      authMessage.textContent =
        data.message || "Authentication error. Please check your credentials.";
      return;
    }

    const storage = $("rememberMe")?.checked ? localStorage : sessionStorage;
    storage.setItem("doctorfinder_token", data.token);
    storage.setItem("doctorfinder_user", JSON.stringify(data.user));

    updateUIForAuthState(data.user);
    closeAuthModal();
    loadUserFavorites();

    showAuthToast(`Welcome back, ${data.user.fullName || "User"}!`);

    // Reveal and scroll to application dashboard
    const appDashboard = $("appDashboard");
    if (appDashboard) {
      appDashboard.removeAttribute("hidden");
      appDashboard.scrollIntoView({ behavior: "smooth" });
    }
  } catch (error) {
    authMessage.textContent = "Unable to connect to server. Please try again.";
  }
}

function togglePassword() {
  const input = $("authPassword");
  const icon = $("togglePassword").querySelector("i");
  if (input.type === "password") {
    input.type = "text";
    icon.className = "fa-regular fa-eye-slash";
  } else {
    input.type = "password";
    icon.className = "fa-regular fa-eye";
  }
}

function restoreSession() {
  const token = getToken();
  const user = getCurrentUser();

  if (token && user) {
    updateUIForAuthState(user);
    loadUserFavorites();
  } else {
    updateUIForAuthState(null);
  }
}

function updateUIForAuthState(user) {
  const loggedIn = Boolean(user && getToken());

  const appDashboard = $("appDashboard");
  if (appDashboard) {
    if (loggedIn) {
      appDashboard.removeAttribute("hidden");
    } else {
      appDashboard.setAttribute("hidden", "");
    }
  }

  document.querySelectorAll(".nav-public-item").forEach((el) => {
    if (loggedIn) el.setAttribute("hidden", "");
    else el.removeAttribute("hidden");
  });

  document.querySelectorAll(".nav-auth-item").forEach((el) => {
    if (loggedIn) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  });

  const adminNavItem = $("adminNavItem");
  if (adminNavItem) {
    if (loggedIn && user?.role === "admin") {
      adminNavItem.removeAttribute("hidden");
    } else {
      adminNavItem.setAttribute("hidden", "");
    }
  }

  updateAuthNav(loggedIn ? user : null);
  if (loggedIn) {
    loadDynamicFilters();
  }
}

function updateAuthNav(user) {
  const authNav = $("authNav");
  if (!authNav) return;

  if (user) {
    const firstName = user.fullName ? user.fullName.split(" ")[0] : "User";
    authNav.innerHTML = `
      <span class="nav-greeting" style="font-weight: 700; color: var(--navy); font-size: 13px;">
        Hi, ${escapeHtml(firstName)}
      </span>
      <button class="nav-login" type="button" id="logoutBtn" style="border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px;">
        Logout
      </button>
    `;
    $("logoutBtn").addEventListener("click", handleLogout);
  } else {
    authNav.innerHTML = `
      <button class="nav-login" type="button" data-auth="login">Login</button>
      <button class="nav-signup" type="button" data-auth="signup">Sign Up</button>
    `;
    authNav.querySelectorAll("[data-auth]").forEach((btn) =>
      btn.addEventListener("click", () => openAuth(btn.dataset.auth))
    );
  }
}

function handleLogout() {
  clearSession();
  updateUIForAuthState(null);
  showAuthToast("Logged out successfully.");
  window.location.hash = "#top";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showAuthToast(message) {
  const toast = document.createElement("div");
  toast.style.cssText =
    "position: fixed; bottom: 24px; right: 24px; background: var(--navy); color: #fff; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 13px; z-index: 1000; box-shadow: 0 10px 30px rgba(0,0,0,0.25); animation: rise 0.3s ease;";
  toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--teal); margin-right: 8px;"></i> ${escapeHtml(
    message
  )}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}