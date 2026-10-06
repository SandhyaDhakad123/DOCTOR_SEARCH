# DOCTORFINDER — Advanced Healthcare Discovery & Appointment Platform

A modern, production-grade web application for discovering verified medical specialists, calculating geospatial distances, viewing clinic locations via Leaflet and OpenStreetMap, getting clinical specialization guidance powered by Google Gemini AI, and managing patient appointments.

---

## 🎯 Platform Highlights

* **Privacy-First Authentication**: Visitors can read educational health articles and explore platform features on the landing page; searching, profile views, mapping, and booking strictly require verified login credentials.
* **100% Verifiable Medical Faculty**: Zero dummy, simulated, or fabricated doctors. Powered by 21 verified medical faculty from Gandhi Medical College / Hamidia Hospital Bhopal and Apollo Sage Hospitals, with traceable state medical council (MPMC) registration numbers and official source URLs (`gmcbhopal.net`).
* **Interactive Leaflet + OpenStreetMap Integration**: Replaces proprietary map providers with privacy-conscious OpenStreetMap tiles, interactive doctor pins, and custom popups.
* **Geospatial Proximity (2dsphere + Haversine)**: Browser-based geolocation computes user-to-clinic distance on demand without persisting patient GPS coordinates.
* **AI Specialization Discovery (Google Gemini API)**: Analyzes patient symptom queries to recommend relevant clinical specializations (e.g. Cardiology, Dermatology, Orthopedics) with explicit non-diagnosis disclaimers and automated fallback clinical routing heuristics.
* **Unified User Dashboard**: 6-tab dashboard featuring user profile stats, saved favorites, upcoming and past appointments with cancellation, written reviews with ratings, and account management.
* **Role-Based Admin Management Portal**: Dedicated administrative portal for doctor verification, analytics KPI tracking, appointment status moderation, user viewing, and review moderation.
* **Health & Wellness Library**: Evidence-based wellness and preventive care articles.

---

## 📊 Database & Directory Statistics

| Metric | Status |
| :--- | :--- |
| **Verified Faculty Doctors** | **21 Real Practitioners** |
| **Medical Registration Council** | Madhya Pradesh Medical Council (MPMC) |
| **Primary Hospital Facilities** | GMC / Hamidia Hospital & Apollo Sage Hospital Bhopal |
| **Geospatial Indexing** | MongoDB 2dsphere (`[longitude, latitude]`) |
| **Data Verifiability** | 100% Traceable with official institution URLs |
| **Default Administrator** | `sandhyadhakad601@gmail.com` |

---

## 🛠️ Technology Stack

* **Backend**: Node.js, Express.js (Port `5001`), Mongoose ODM, MongoDB Atlas
* **Frontend**: Vanilla ES6+ JavaScript, CSS3 Design System (`upgrade.css`), HTML5 Semantic Architecture
* **Maps & Geospatial**: Leaflet.js `v1.9.4`, OpenStreetMap tiles, MongoDB `$nearSphere`
* **AI & Clinical Guidance**: Google Gemini API (`gemini-3.5-flash-lite`, `gemini-3.5-flash`), with fallback clinical heuristics
* **Security**: JWT (JSON Web Tokens), bcryptjs password hashing, role-based authorization (`user` / `admin`), strict CORS, `.env` parameter isolation

---

## 🚀 Getting Started

### 1. Launch Backend Server
```bash
cd backend
npm install
node server.js
```
* Backend runs at: `http://localhost:5001`
* Automated MongoDB index synchronization occurs on startup.

### 2. Launch Frontend
```bash
cd frontend
npx -y serve -l 3000
```
Visit: `http://localhost:3000`

### 3. Run Automated Integration Test Suite
```bash
cd backend
node test-suite.js
```
Executes complete end-to-end testing across all 10 major subsystems (100% pass rate).

---

## 🔒 Security & Data Integrity

1. **Environment Separation**: API keys (`GEMINI_API_KEY`, `JWT_SECRET`, `MONGO_URI`) remain strictly in `backend/.env` and are never exposed to client-side code.
2. **Medical Safety Disclaimers**: The AI recommendation engine is strictly non-diagnostic; disclaimers notify users that recommendations do not replace consultation with licensed medical practitioners.
3. **Owner-Only Data Access**: Patients can only inspect, cancel, and modify their own appointments, favorites, and reviews.
