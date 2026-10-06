# DOCTORFINDER — Master Quick Start Guide

Welcome to the upgraded **DoctorFinder** platform! This document outlines how to launch, configure, test, and manage the complete healthcare discovery system.

---

## 🚀 Quick Launch (Under 2 Minutes)

### 1. Start the Backend Server

```bash
cd backend
npm install
node server.js
```

* Backend runs at: `http://localhost:5001`
* Automated MongoDB connection & 2dsphere geospatial index synchronization occur on startup.
* API Documentation root: `http://localhost:5001/api/`

### 2. Launch the Frontend Application

You can serve `frontend/` using any static HTTP server (e.g. Node `serve`, Python HTTP server, or Live Server in VS Code):

```bash
cd frontend
npx -y serve -l 3000
```
Open your browser and navigate to: `http://localhost:3000`

---

## 🔑 Default Credentials & Role Access

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Admin** | `sandhyadhakad601@gmail.com` | `admin12345` | Doctor Verification, Full KPI Analytics, Appointment Status Updates, Review Moderation, User Roster |
| **User / Patient** | Any registered email or Sign Up | User defined | Public Landing, Doctor Search, Leaflet Map, Geolocation Nearby, Appointments, Favorites, Reviews, User Dashboard |

---

## 🧪 Automated End-to-End Test Suite

Run the comprehensive integration test suite to verify all 10 platform subsystems:

```bash
cd backend
node test-suite.js
```

**Verification Checklist in Test Suite**:
1. Server health check (`/api/health`)
2. Patient signup, authentication token generation & login
3. Profile retrieval (`/api/auth/me`) with aggregate dashboard stats
4. Multi-criteria doctor query & database-driven autocomplete
5. Geospatial nearby doctor discovery (2dsphere + Haversine distance)
6. Favorites bookmarking and retrieval
7. Review & rating submission with automatic average rating recalculation
8. Appointment creation (`requested` status) and user cancellation
9. Health & wellness educational article retrieval
10. Admin portal verification, appointment status transition, and Google Gemini AI clinical recommendation proxy

---

## 🌟 Key Platform Features

### 1. Privacy-First Authentication Flow
* Unauthenticated visitors can freely browse the landing page, educational features, and health articles.
* The doctor discovery catalog, map view, profiles, and appointment requests are securely guarded behind authentication.

### 2. Interactive Map (Leaflet + OpenStreetMap)
* Strictly uses OpenStreetMap and Leaflet (no Google Maps API keys or billing required).
* Pins user coordinates and doctor clinics with custom interactive popups.

### 3. AI Specialization Guide (Gemini API)
* Uses `gemini-3.5-flash-lite` or `gemini-3.5-flash` with backend key protection (`process.env.GEMINI_API_KEY`).
* Analyzes non-emergency symptoms and recommends appropriate clinical specialties without providing medical diagnoses or drug prescriptions.
* Includes automatic fallback clinical heuristics for guaranteed uptime.

### 4. Zero Fake Data Guarantee
* Database contains 21 verified doctors from Gandhi Medical College / Hamidia Hospital Bhopal with official MPMC registration records and source URLs.

---

## 📁 Project Architecture

```
DOCTOR_SEARCH-main/
├── backend/
│   ├── models/
│   │   ├── User.js             # User & Admin roles, authentication schema
│   │   ├── Doctor.js           # 2dsphere geospatial location, registration data
│   │   ├── Appointment.js      # Appointment lifecycle & status transitions
│   │   ├── Favorite.js         # User doctor bookmarks (compound unique index)
│   │   ├── Review.js           # 1-5 star ratings & reviews
│   │   └── HealthArticle.js    # Evidence-based wellness articles
│   ├── middleware/
│   │   └── authMiddleware.js   # requireAuth, requireAdmin, optionalAuth
│   ├── routes/
│   │   ├── authRoutes.js       # Signup, login, /me, profile & password updates
│   │   ├── doctorRoutes.js     # Search, autocomplete, geospatial nearby search
│   │   ├── favoriteRoutes.js   # User favorites CRUD
│   │   ├── reviewRoutes.js     # Patient reviews & rating aggregation
│   │   ├── appointmentRoutes.js# Booking & patient cancellation
│   │   ├── adminRoutes.js      # Admin dashboard, verify/reject, user view
│   │   ├── healthRoutes.js     # Health & wellness library
│   │   └── aiRoutes.js         # Gemini API clinical specialization proxy
│   ├── server.js               # Express application entry point
│   ├── test-suite.js           # Automated end-to-end integration test suite
│   ├── real-doctors.csv        # Verifiable MPMC doctor dataset
│   └── import-real-doctors.js  # CSV ingestion & upsert utility
└── frontend/
    ├── index.html              # Modern, accessible landing & app interface
    ├── script.js               # Reactive state manager, Leaflet maps & modals
    ├── upgrade.css             # Unified modern CSS design system
    ├── styles.css              # Baseline legacy styles
    └── assets/                 # Icons and branding assets
```
