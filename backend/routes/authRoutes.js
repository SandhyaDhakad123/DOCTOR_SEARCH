const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Favorite = require("../models/Favorite");
const Appointment = require("../models/Appointment");
const Review = require("../models/Review");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role || "user" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role || "user"
  };
}

function validateInput({ fullName, email, phone, password, confirmPassword }) {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return "Please enter a valid email address.";
  if (!password || password.length < 8) return "Password must be at least 8 characters.";
  if (confirmPassword !== undefined && password !== confirmPassword) return "Passwords do not match.";
  if (fullName !== undefined && (!fullName.trim() || fullName.trim().length > 100)) return "Please enter a valid full name.";
  if (phone !== undefined && !/^\+?[0-9 ()-]{7,20}$/.test(phone.trim())) return "Please enter a valid phone number.";
  return null;
}

router.post("/signup", async (req, res) => {
  try {
    const { fullName, email, phone, password, confirmPassword, adminSecret } = req.body;
    const validationError = validateInput({ fullName, email, phone, password, confirmPassword });
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    let role = "user";
    const expectedAdminSecret = process.env.ADMIN_SECRET || "doctorfinder_admin_2026";
    if (adminSecret && adminSecret.trim() === expectedAdminSecret) {
      role = "admin";
    } else if (process.env.ADMIN_EMAIL && normalizedEmail === process.env.ADMIN_EMAIL.toLowerCase()) {
      role = "admin";
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      passwordHash,
      role
    });

    res.status(201).json({
      success: true,
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, message: "Unable to create your account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const validationError = validateInput({ email, password });
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: "Email or password is incorrect." });
    }

    res.json({
      success: true,
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Unable to sign you in." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(401).json({ success: false, message: "User not found." });

    const [savedCount, upcomingCount, completedCount, reviewsCount] = await Promise.all([
      Favorite.countDocuments({ user: user._id }),
      Appointment.countDocuments({
        $or: [{ user: user._id }, { patientEmail: user.email }],
        status: { $in: ["requested", "confirmed"] },
        appointmentDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      Appointment.countDocuments({
        $or: [{ user: user._id }, { patientEmail: user.email }],
        status: "completed"
      }),
      Review.countDocuments({ user: user._id })
    ]);

    res.json({
      success: true,
      user: publicUser(user),
      stats: {
        savedDoctors: savedCount,
        upcomingAppointments: upcomingCount,
        completedAppointments: completedCount,
        reviewsCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching user profile." });
  }
});

router.put("/me", requireAuth, async (req, res) => {
  try {
    const { fullName, phone } = req.body;
    const updates = {};
    if (fullName && fullName.trim()) updates.fullName = fullName.trim();
    if (phone && phone.trim()) {
      if (!/^\+?[0-9 ()-]{7,20}$/.test(phone.trim())) {
        return res.status(400).json({ success: false, message: "Invalid phone number format." });
      }
      updates.phone = phone.trim();
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.userId, updates, { returnDocument: 'after' });
    res.json({
      success: true,
      message: "Profile updated successfully.",
      user: publicUser(updatedUser)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating profile." });
  }
});

router.put("/me/password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long."
      });
    }

    const user = await User.findById(req.user.userId).select("+passwordHash");
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully."
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error changing password." });
  }
});

module.exports = router;