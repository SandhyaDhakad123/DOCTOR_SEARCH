const express = require("express");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const requireAuth = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9 ()-]{7,20}$/;
const allowedStatuses = ["requested", "confirmed", "cancelled", "completed"];

// POST create a new appointment (Requires Auth)
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      doctorId,
      patientName,
      patientEmail,
      patientPhone,
      appointmentDate,
      timeSlot,
      notes
    } = req.body;

    const normalizedName = patientName?.trim();
    const normalizedEmail = (patientEmail || req.user.email)?.trim().toLowerCase();
    const normalizedPhone = patientPhone?.trim();
    const normalizedTime = timeSlot?.trim();
    const normalizedNotes = notes?.trim() || "";

    // Validate required fields
    if (
      !doctorId ||
      !normalizedName ||
      !normalizedEmail ||
      !normalizedPhone ||
      !appointmentDate ||
      !normalizedTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields."
      });
    }

    if (
      normalizedName.length > 120 ||
      !emailPattern.test(normalizedEmail) ||
      !phonePattern.test(normalizedPhone) ||
      normalizedTime.length > 80 ||
      normalizedNotes.length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid name, email, phone number, time slot, and notes within limits."
      });
    }

    if (!doctorId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID format."
      });
    }

    const appointmentDateTime = new Date(appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (
      Number.isNaN(appointmentDateTime.getTime()) ||
      appointmentDateTime < today
    ) {
      return res.status(400).json({
        success: false,
        message: "Appointment date must be today or in the future."
      });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found."
      });
    }

    // Check duplicate pending request
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: appointmentDateTime,
      patientEmail: normalizedEmail,
      timeSlot: normalizedTime.toLowerCase(),
      status: "requested"
    });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message:
          "You already have a pending appointment request for this doctor, date and time."
      });
    }

    const appointment = new Appointment({
      doctor: doctorId,
      user: req.user.userId,
      patientName: normalizedName,
      patientEmail: normalizedEmail,
      patientPhone: normalizedPhone,
      appointmentDate: appointmentDateTime,
      timeSlot: normalizedTime,
      notes: normalizedNotes,
      status: "requested"
    });

    const savedAppointment = await appointment.save();

    const populatedAppointment = await Appointment.findById(savedAppointment._id)
      .populate("doctor", "name specialization hospitalOrClinic phone city clinicAddress")
      .select("-__v");

    res.status(201).json({
      success: true,
      message:
        "Appointment request submitted successfully. It is currently in 'requested' status.",
      data: populatedAppointment
    });
  } catch (error) {
    console.error("Error creating appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting appointment request",
      error: error.message
    });
  }
});

// GET user's appointments (Requires Auth)
router.get("/my", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email ? req.user.email.toLowerCase() : "";

    const filter = {
      $or: [{ user: userId }]
    };
    if (userEmail) {
      filter.$or.push({ patientEmail: userEmail });
    }

    const appointments = await Appointment.find(filter)
      .populate("doctor", "name specialization hospitalOrClinic phone city clinicAddress")
      .sort({ appointmentDate: -1, createdAt: -1 })
      .select("-__v");

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming = [];
    const past = [];

    appointments.forEach((apt) => {
      const aptDate = new Date(apt.appointmentDate);
      if (aptDate >= now && apt.status !== "completed" && apt.status !== "cancelled") {
        upcoming.push(apt);
      } else {
        past.push(apt);
      }
    });

    res.json({
      success: true,
      data: {
        all: appointments,
        upcoming,
        past
      }
    });
  } catch (error) {
    console.error("Error fetching user appointments:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load your appointments."
    });
  }
});

// GET all appointments with filters (Admin or user own)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { doctorId, patientEmail, status } = req.query;
    let filter = {};

    // If regular user, only view own appointments
    if (req.user.role !== "admin") {
      filter.$or = [{ user: req.user.userId }];
      if (req.user.email) {
        filter.$or.push({ patientEmail: req.user.email.toLowerCase() });
      }
    } else {
      if (patientEmail) {
        filter.patientEmail = patientEmail.trim().toLowerCase();
      }
    }

    if (doctorId && doctorId.match(/^[0-9a-fA-F]{24}$/)) {
      filter.doctor = doctorId;
    }

    if (status && allowedStatuses.includes(status)) {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .populate("doctor", "name specialization hospitalOrClinic phone city clinicAddress")
      .select("-__v")
      .sort({ appointmentDate: 1 });

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load appointments",
      error: error.message
    });
  }
});

// GET appointment by ID (Requires Auth)
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID format"
      });
    }

    const appointment = await Appointment.findById(id)
      .populate("doctor", "name specialization hospitalOrClinic phone city clinicAddress")
      .select("-__v");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    // Check authorization: must be appointment owner or admin
    const isOwner =
      (appointment.user && appointment.user.toString() === req.user.userId) ||
      (appointment.patientEmail && appointment.patientEmail.toLowerCase() === (req.user.email || "").toLowerCase());

    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this appointment."
      });
    }

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error("Error fetching appointment:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load appointment details",
      error: error.message
    });
  }
});

// PUT cancel appointment by user (Requires Auth)
router.put("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID format."
      });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found."
      });
    }

    const isOwner =
      (appointment.user && appointment.user.toString() === req.user.userId) ||
      (appointment.patientEmail && appointment.patientEmail.toLowerCase() === (req.user.email || "").toLowerCase());

    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this appointment."
      });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed appointments cannot be cancelled."
      });
    }

    appointment.status = "cancelled";
    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate("doctor", "name specialization hospitalOrClinic phone")
      .select("-__v");

    res.json({
      success: true,
      message: "Appointment cancelled successfully.",
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error cancelling appointment.",
      error: error.message
    });
  }
});

// PUT update appointment status (Admin or backwards-compatible)
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID format"
      });
    }

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}`
      });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    // If changing to confirmed/completed, require admin
    if (["confirmed", "completed"].includes(status) && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can confirm or complete appointments."
      });
    }

    appointment.status = status;
    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate("doctor", "name specialization hospitalOrClinic phone")
      .select("-__v");

    res.json({
      success: true,
      message: "Appointment updated successfully",
      data: populated
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error updating appointment",
      error: error.message
    });
  }
});

module.exports = router;
