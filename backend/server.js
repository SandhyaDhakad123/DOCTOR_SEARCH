require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const doctorRoutes = require("./routes/doctorRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const authRoutes = require("./routes/authRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");
const aiRoutes = require("./routes/aiRoutes");
const healthRoutes = require("./routes/healthRoutes");

const Doctor = require("./models/Doctor");
const Favorite = require("./models/Favorite");
const Review = require("./models/Review");
const Appointment = require("./models/Appointment");

const app = express();

/*
|--------------------------------------------------------------------------
| CORS Configuration
|--------------------------------------------------------------------------
*/

app.use(
    cors({
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Origin",
            "X-Requested-With",
            "Content-Type",
            "Accept",
            "Authorization"
        ],
        exposedHeaders: ["Authorization"],
        optionsSuccessStatus: 204,
        maxAge: 86400
    })
);

/*
|--------------------------------------------------------------------------
| Body Parser
|--------------------------------------------------------------------------
*/

app.use(express.json());

/*
|--------------------------------------------------------------------------
| Port
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 5001;

/*
|--------------------------------------------------------------------------
| Environment Validation
|--------------------------------------------------------------------------
*/

if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required in backend/.env");
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is required in backend/.env");
    process.exit(1);
}

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/health-wellness", healthRoutes);

/*
|--------------------------------------------------------------------------
| Test Endpoint
|--------------------------------------------------------------------------
*/

app.get("/api/test-nearby", (req, res) => {
    res.json({
        success: true,
        message: "Nearby API connection is working"
    });
});

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
    res.json({
        status: "Server is running",
        timestamp: new Date()
    });
});

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found"
    });
});

/*
|--------------------------------------------------------------------------
| MongoDB Connection
|--------------------------------------------------------------------------
*/

mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("MongoDB connected successfully!");

        /*
        |--------------------------------------------------------------------------
        | Synchronize Database Indexes
        |--------------------------------------------------------------------------
        */

        await Promise.all([
            Doctor.syncIndexes(),
            Favorite.syncIndexes(),
            Review.syncIndexes(),
            Appointment.syncIndexes()
        ]);

        console.log("Database indexes synchronized successfully!");

        /*
        |--------------------------------------------------------------------------
        | Start Server
        |--------------------------------------------------------------------------
        */

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`API available at /api/`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:");
        console.error(error.message);

        process.exit(1);
    });