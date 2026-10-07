# 🩺 DoctorFinder

DoctorFinder is a full-stack doctor discovery platform that helps users find verified doctors based on state, city, specialization, and name. The platform also provides doctor details, nearby doctor search, appointments, favorites, reviews, authentication, AI-based specialist suggestions, and health & wellness resources.

## 🌐 Live Demo

**Frontend:**  
https://doctorsearch-frontend.vercel.app

**Backend API:**  
https://doctor-search-t5rm.onrender.com

---

## ✨ Features

### 👨‍⚕️ Doctor Search
- Search doctors by:
  - State
  - City
  - Specialization
  - Doctor name
- Verified doctor information
- Doctor profile details
- Hospital/clinic information
- Consultation fee
- Available days and time slots

### 📍 Nearby Doctors
- Find doctors near a selected location
- Location-based doctor discovery
- Interactive map using Leaflet

### 🤖 AI Specialist
- AI-based specialist recommendation
- Helps users identify the appropriate medical specialty based on their symptoms
- Gemini API integration

### 🔐 Authentication
- User registration
- User login
- JWT-based authentication
- Protected user features
- Logout functionality

### 📅 Appointments
- Select a doctor
- Choose appointment date
- Select available time slot
- Submit appointment request

### ❤️ Favorites
- Save favorite doctors
- View saved doctors
- Remove doctors from favorites

### ⭐ Reviews
- Submit doctor reviews
- View doctor ratings and reviews

### 🏥 Health & Wellness
- Health-related articles
- Wellness information
- Helpful health resources

### 👨‍💼 Admin Portal
- Admin authentication
- Doctor management
- Appointment management
- User-related management features

---

## 🛠️ Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript
- Leaflet.js
- Font Awesome

### Backend
- Node.js
- Express.js
- REST API
- JWT Authentication
- CORS

### Database
- MongoDB
- MongoDB Atlas
- Mongoose

### AI
- Google Gemini API

### Deployment
- **Frontend:** Vercel
- **Backend:** Render
- **Database:** MongoDB Atlas

---

## 📁 Project Structure

```text
DOCTOR_SEARCH/
│
├── backend/
│   ├── middleware/
│   │   └── authMiddleware.js
│   │
│   ├── models/
│   │   ├── Appointment.js
│   │   ├── Doctor.js
│   │   ├── Favorite.js
│   │   ├── HealthArticle.js
│   │   ├── Review.js
│   │   └── User.js
│   │
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── aiRoutes.js
│   │   ├── appointmentRoutes.js
│   │   ├── authRoutes.js
│   │   ├── doctorRoutes.js
│   │   ├── favoriteRoutes.js
│   │   ├── healthRoutes.js
│   │   └── reviewRoutes.js
│   │
│   ├── .env
│   ├── server.js
│   ├── package.json
│   └── ...
│
├── frontend/
│   ├── data/
│   ├── images/
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── package.json
│
├── README.md
└── package.json
