const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    registrationYear: {
      type: Number
    },

    registeredCouncil: {
      type: String,
      required: true,
      trim: true
    },

    qualifications: [
      {
        type: String,
        trim: true
      }
    ],

    specialization: {
      type: String,
      trim: true
    },

    subSpecialization: {
      type: String,
      trim: true
    },

    state: {
      type: String,
      required: true,
      trim: true
    },

    city: {
      type: String,
      trim: true
    },

    district: {
      type: String,
      trim: true
    },

    hospitalOrClinic: {
      type: String,
      trim: true
    },

    clinicAddress: {
      type: String,
      trim: true
    },

    consultationFee: {
      type: Number
    },

    phone: {
      type: String,
      trim: true
    },

    email: {
      type: String,
      trim: true
    },

    availableDays: [
      {
        type: String,
        trim: true
      }
    ],

    availableTimeSlots: [
      {
        type: String,
        trim: true
      }
    ],

    appointmentBookingAvailable: {
      type: Boolean,
      default: false
    },

    verificationStatus: {
      type: String,
      enum: ["verified", "pending", "unverified"],
      default: "pending"
    },

    dataSource: {
      type: String,
      required: true,
      trim: true
    },

    sourceUrl: { type: String, trim: true },

    lastVerifiedAt: {
      type: Date
    },

    profileImage: {
      type: String,
      trim: true
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number]
      }
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    reviewCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Registration number is indexed through unique: true.
doctorSchema.index({ state: 1 });
doctorSchema.index({ city: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ name: 1 });
doctorSchema.index({ state: 1, city: 1, specialization: 1 });
doctorSchema.index({ verificationStatus: 1 });
doctorSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Doctor", doctorSchema);