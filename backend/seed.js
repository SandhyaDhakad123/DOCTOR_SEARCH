require("dotenv").config();
const mongoose = require("mongoose");
const Doctor = require("./models/Doctor");

/**
 * REAL DATA ONLY POLICY
 * 
 * This script imports ONLY verified, real doctor information from authorized sources.
 * 
 * NO fabricated, sample, or test doctor data is added to the production database.
 * 
 * Authorized Real Data Sources:
 * 1. National Medical Commission (NMC) / Indian Medical Register
 * 2. ABDM Healthcare Professionals Registry
 * 3. State Medical Councils
 * 4. Official hospital/clinic verified lists
 * 
 * For each doctor, we require:
 * - name (from official register)
 * - registrationNumber (from official register)
 * - registrationYear (from official register)
 * - registeredCouncil (the authorizing body)
 * - qualifications (from official register)
 * - specialization (from official register)
 * - state (verified practice location)
 * - city (verified practice location)
 * 
 * Fields that cannot be verified are left empty/null:
 * - consultationFee (unless officially published)
 * - phone/email (unless publicly authorized)
 * - availableDays/slots (unless from authorized clinic system)
 * 
 * Currently: NO REAL DATA SOURCES HAVE BEEN CONFIGURED
 * 
 * The database starts empty until real data is imported.
 */

// TEMPLATE: Example structure for real doctor imports
// This is NOT actual data - it shows the correct format for verified imports
const REAL_DATA_TEMPLATE = {
  example: {
    name: "[Doctor Name from Official Register]",
    registrationNumber: "[From NMC/State Council Register]",
    registrationYear: "[Year from Official Record]",
    registeredCouncil: "[e.g., Medical Council of India, State Medical Council]",
    qualifications: ["[From Official Register]"],
    specialization: "[From Official Register]",
    subSpecialization: "[If available in official record]",
    state: "[Verified State]",
    city: "[Verified City]",
    district: "[Verified District]",
    hospitalOrClinic: "[If verified by clinic]",
    clinicAddress: "[If verified by clinic]",
    consultationFee: null, // null unless officially published
    phone: null, // null unless publicly authorized
    email: null, // null unless publicly authorized
    availableDays: [], // empty unless from authorized clinic system
    availableTimeSlots: [], // empty unless from authorized clinic system
    appointmentBookingAvailable: false, // only true if genuinely available
    verificationStatus: "verified", // only if source is authoritative
    dataSource: "[Specific authorized source URL or system name]",
    lastVerifiedAt: new Date(),
    profileImage: "[Only if legally/publicly usable image]"
  }
};

async function clearDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ MongoDB connected");

    const result = await Doctor.deleteMany({});
    console.log(`✓ Cleared database (removed ${result.deletedCount} records)`);

    // Check if database is empty
    const count = await Doctor.countDocuments();
    if (count === 0) {
      console.log("\n✓ Database is now empty and ready for REAL verified doctor data only");
      console.log("\n📋 REAL DATA SOURCES REQUIRED:");
      console.log("   1. National Medical Commission (NMC) - https://nmc.org.in");
      console.log("   2. ABDM Healthcare Professionals Registry - https://abdm.gov.in");
      console.log("   3. State Medical Councils");
      console.log("   4. Official authorized clinic/hospital data");
      console.log("\n📝 IMPORT PROCESS:");
      console.log("   - Obtain real data from authorized sources");
      console.log("   - Verify all information against official registers");
      console.log("   - Create CSV/JSON with verified data");
      console.log("   - Use import mechanism to add to database");
      console.log("   - Mark verificationStatus as 'verified'");
      console.log("   - Store dataSource reference");
      console.log("\n❌ NO fabricated, sample, or test data is acceptable");
    }

    process.exit(0);
  } catch (error) {
    console.error("✗ Error clearing database:", error.message);
    process.exit(1);
  }
}

// Run clearance
clearDatabase();
