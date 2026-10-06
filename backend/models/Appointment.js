const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true
    },

    patientName: {
      type: String,
      required: true,
      trim: true
    },

    patientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    patientPhone: {
      type: String,
      required: true,
      trim: true
    },

    appointmentDate: {
      type: Date,
      required: true
    },

    timeSlot: {
      type: String,
      required: true,
      trim: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    status: {
      type: String,
      enum: ["requested", "confirmed", "cancelled", "completed"],
      default: "requested"
    },

    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Add indexes for common queries
appointmentSchema.index({ doctor: 1, appointmentDate: 1, timeSlot: 1 });
appointmentSchema.index({ doctor: 1, status: 1 });
appointmentSchema.index({ patientEmail: 1 });
appointmentSchema.index({ user: 1, appointmentDate: -1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
