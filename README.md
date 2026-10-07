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


🚀 Installation & Setup
1. Clone the Repository
git clone https://github.com/SandhyaDhakad123/DOCTOR_SEARCH.git
cd DOCTOR_SEARCH

2. Backend Setup
cd backend
npm install

Create a .env file inside the backend folder:
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
PORT=5001

3. Start Backend
node server.js

Backend will run locally on:
http://localhost:5001

4. Frontend
Open the frontend/index.html file in your browser or use a local development server.
🔌 API Endpoints
Authentication
POST /api/auth/register
POST /api/auth/login

Doctors
GET /api/doctors

Appointments
POST /api/appointments
GET /api/appointments

Favorites
GET /api/favorites
POST /api/favorites
DELETE /api/favorites/:id

Reviews
GET /api/reviews
POST /api/reviews

AI
POST /api/ai

Health
GET /api/health-wellness

Server Health Check
GET /api/health

🔒 Security
- JWT authentication
- Protected API routes
- Environment variables for sensitive credentials
- CORS configuration
- Passwords are not stored in frontend code
- API keys are kept on the backend
Never commit .env files or API keys to GitHub.

📊 Doctor Data
DoctorFinder uses verified doctor information collected from traceable sources.
The platform is designed to support doctor discovery across India based on the available verified data.
Doctor records may include:
- Doctor Name
- Registration Number
- Registration Year
- Registered Council
- Qualifications
- Specialization
- Sub-specialization
- State
- City
- District
- Hospital/Clinic
- Clinic Address
- Consultation Fee
- Phone
- Email
- Available Days
- Available Time Slots
- Appointment Availability
- Data Source
- 
🎯 Project Objective
The main objective of DoctorFinder is to provide users with a simple and accessible platform for discovering doctors and healthcare information.
The application combines:
- Doctor discovery
- Location-based search
- AI assistance
- Authentication
- Reviews
- Favorites
- Appointment requests
- Health resources
into a single platform.

🔮 Future Improvements
- Expand the verified doctor database
- Online video consultation
- Real-time appointment availability
- Online payment integration
- Doctor dashboard
- Patient medical history
- Improved AI health assistance
- Mobile application
- Advanced doctor recommendation system
  
👩‍💻 Developer
Sandhya Dhakad
B.Tech CSE (AI & ML)
Oriental Institute of Science and Technology, Bhopal
GitHub
https://github.com/SandhyaDhakad123

📜 License
This project is developed for educational and portfolio purposes.
