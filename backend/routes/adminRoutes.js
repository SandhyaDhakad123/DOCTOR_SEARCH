const express = require("express");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const Review = require("../models/Review");
const requireAuth = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Apply auth + admin guard across all admin routes
router.use(requireAuth, requireAdmin);

/*
|--------------------------------------------------------------------------
| GET Admin Dashboard Statistics
|--------------------------------------------------------------------------
*/
router.get("/stats", async (req, res) => {
  try {
    const [
      totalUsers,
      totalDoctors,
      verifiedDoctors,
      pendingDoctors,
      unverifiedDoctors,
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      completedAppointments,
      totalReviews
    ] = await Promise.all([
      User.countDocuments(),
      Doctor.countDocuments(),
      Doctor.countDocuments({ verificationStatus: "verified" }),
      Doctor.countDocuments({ verificationStatus: "pending" }),
      Doctor.countDocuments({ verificationStatus: "unverified" }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: "requested" }),
      Appointment.countDocuments({ status: "confirmed" }),
      Appointment.countDocuments({ status: "completed" }),
      Review.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalDoctors,
        verifiedDoctors,
        pendingDoctors,
        unverifiedDoctors,
        totalAppointments,
        pendingAppointments,
        confirmedAppointments,
        completedAppointments,
        totalReviews
      }
    });
  } catch (error) {
    console.error("Error loading admin stats:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load dashboard statistics."
    });
  }
});

/*
|--------------------------------------------------------------------------
| DOCTOR MANAGEMENT
|--------------------------------------------------------------------------
*/
router.get("/doctors", async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && ["verified", "pending", "unverified"].includes(status)) {
      filter.verificationStatus = status;
    }
    if (search && search.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { name: regex },
        { registrationNumber: regex },
        { specialization: regex },
        { hospitalOrClinic: regex },
        { city: regex }
      ];
    }

    const doctors = await Doctor.find(filter)
      .select("-__v")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching doctors list." });
  }
});

// Verify Doctor
router.patch("/doctors/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found." });
    }

    if (!doctor.sourceUrl || !/^https?:\/\/.+/i.test(doctor.sourceUrl)) {
      return res.status(400).json({
        success: false,
        message: "Cannot mark doctor verified without a valid http(s) source URL."
      });
    }

    doctor.verificationStatus = "verified";
    doctor.lastVerifiedAt = new Date();
    await doctor.save();

    res.json({
      success: true,
      message: `Doctor ${doctor.name} has been verified successfully.`,
      data: doctor
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error verifying doctor." });
  }
});

// Reject / Unverify Doctor
router.patch("/doctors/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { verificationStatus: "unverified" },
      { returnDocument: 'after' }
    );
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found." });
    }

    res.json({
      success: true,
      message: `Doctor ${doctor.name} marked as unverified.`,
      data: doctor
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating doctor verification status." });
  }
});

/*
|--------------------------------------------------------------------------
| USER MANAGEMENT
|--------------------------------------------------------------------------
*/
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({})
      .select("-passwordHash -__v")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching users." });
  }
});

router.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role." });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { returnDocument: 'after' }
    ).select("-passwordHash -__v");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({
      success: true,
      message: `User role updated to ${role}.`,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating user role." });
  }
});

/*
|--------------------------------------------------------------------------
| APPOINTMENT MANAGEMENT
|--------------------------------------------------------------------------
*/
router.get("/appointments", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && ["requested", "confirmed", "cancelled", "completed"].includes(status)) {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .populate("doctor", "name specialization hospitalOrClinic phone city clinicAddress")
      .populate("user", "fullName email phone")
      .sort({ appointmentDate: -1, createdAt: -1 })
      .select("-__v");

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching appointments." });
  }
});

router.patch("/appointments/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["requested", "confirmed", "cancelled", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value."
      });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { returnDocument: 'after' }
    )
      .populate("doctor", "name specialization hospitalOrClinic phone city")
      .select("-__v");

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    res.json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      data: appointment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating appointment status." });
  }
});

/*
|--------------------------------------------------------------------------
| REVIEW MANAGEMENT
|--------------------------------------------------------------------------
*/
router.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate("user", "fullName email")
      .populate("doctor", "name specialization hospitalOrClinic city")
      .sort({ createdAt: -1 })
      .select("-__v");

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching reviews." });
  }
});

router.delete("/reviews/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    // Recalculate doctor rating summary
    const remaining = await Review.find({ doctor: review.doctor });
    const count = remaining.length;
    let avg = 0;
    if (count > 0) {
      const sum = remaining.reduce((a, b) => a + b.rating, 0);
      avg = Number((sum / count).toFixed(1));
    }
    await Doctor.findByIdAndUpdate(review.doctor, {
      averageRating: avg,
      reviewCount: count
    });

    res.json({
      success: true,
      message: "Review moderated and removed successfully."
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting review." });
  }
});

module.exports = router;
