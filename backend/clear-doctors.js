require("dotenv").config();

const mongoose = require("mongoose");
const Doctor = require("./models/Doctor");

async function clearDoctors() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4
    });

    console.log("MongoDB connected");

    const result = await Doctor.deleteMany({});

    console.log(`Deleted doctor records: ${result.deletedCount}`);

    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  } catch (error) {
    console.error("Delete failed:", error.message);
    process.exitCode = 1;
  }
}

clearDoctors();