require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const csvParser = require("csv-parser");
const Doctor = require("./models/Doctor");

const REQUIRED_FIELDS = [
  "name",
  "registrationNumber",
  "registeredCouncil",
  "state",
  "dataSource"
];

const VERIFICATION_STATUSES = [
  "verified",
  "pending",
  "unverified"
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlPattern = /^https?:\/\/.+/i;
const phonePattern = /^\+?[0-9 ()-]{7,20}$/;

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nullable(value) {
  const normalized = text(value);
  return normalized || null;
}

function parseList(value) {
  return text(value)
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseOptionalInteger(value, label, errors) {
  const normalized = text(value);

  if (!normalized) {
    return null;
  }

  if (!/^\d{4}$/.test(normalized)) {
    errors.push(`${label} must be a four-digit year`);
    return null;
  }

  return Number(normalized);
}

function parseFee(value, errors) {
  const normalized = text(value);

  if (!normalized) {
    return null;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    errors.push(
      "consultationFee must be a non-negative number"
    );

    return null;
  }

  return Number(normalized);
}

function parseBoolean(value, label, errors) {
  const normalized = text(value).toLowerCase();

  if (!normalized) {
    return false;
  }

  if (!["true", "false"].includes(normalized)) {
    errors.push(`${label} must be true or false`);
    return false;
  }

  return normalized === "true";
}

/*
  Converts latitude and longitude from CSV into numbers.

  IMPORTANT:
  We do NOT generate coordinates.
  Coordinates must already be present in the CSV
  from a verified doctor/hospital/clinic location source.
*/
function parseCoordinates(row, verificationStatus, errors) {
  const latitudeText = text(row.latitude);
  const longitudeText = text(row.longitude);

  /*
    For verified doctors, coordinates are required.
  */
  if (verificationStatus === "verified") {
    if (!latitudeText) {
      errors.push(
        "verified records require latitude"
      );
    }

    if (!longitudeText) {
      errors.push(
        "verified records require longitude"
      );
    }
  }

  /*
    If both are empty and record is not verified,
    location can remain undefined.
  */
  if (!latitudeText && !longitudeText) {
    return undefined;
  }

  /*
    One coordinate without the other is invalid.
  */
  if (!latitudeText || !longitudeText) {
    errors.push(
      "latitude and longitude must be provided together"
    );

    return undefined;
  }

  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);

  if (!Number.isFinite(latitude)) {
    errors.push("latitude must be a valid number");
  }

  if (!Number.isFinite(longitude)) {
    errors.push("longitude must be a valid number");
  }

  if (Number.isFinite(latitude)) {
    if (latitude < -90 || latitude > 90) {
      errors.push(
        "latitude must be between -90 and 90"
      );
    }
  }

  if (Number.isFinite(longitude)) {
    if (longitude < -180 || longitude > 180) {
      errors.push(
        "longitude must be between -180 and 180"
      );
    }
  }

  if (errors.length) {
    return undefined;
  }

  /*
    GeoJSON / MongoDB format:
    [longitude, latitude]

    NOT:
    [latitude, longitude]
  */
  return {
    type: "Point",
    coordinates: [longitude, latitude]
  };
}

function validateRow(
  row,
  rowNumber,
  seenRegistrationNumbers
) {
  const errors = [];

  /*
    Required fields
  */
  REQUIRED_FIELDS.forEach((field) => {
    if (!text(row[field])) {
      errors.push(`missing ${field}`);
    }
  });

  /*
    Registration number
  */
  const registrationNumber = text(
    row.registrationNumber
  );

  if (
    registrationNumber &&
    seenRegistrationNumbers.has(registrationNumber)
  ) {
    errors.push(
      `duplicate registrationNumber in CSV: ${registrationNumber}`
    );
  }

  if (registrationNumber) {
    seenRegistrationNumbers.add(
      registrationNumber
    );
  }

  /*
    Verification status
  */
  const verificationStatus = (
    text(row.verificationStatus) || "pending"
  ).toLowerCase();

  if (
    !VERIFICATION_STATUSES.includes(
      verificationStatus
    )
  ) {
    errors.push(
      "verificationStatus must be verified, pending, or unverified"
    );
  }

  /*
    Source URL
  */
  const sourceUrl = nullable(row.sourceUrl);

  if (
    verificationStatus === "verified" &&
    (!sourceUrl || !urlPattern.test(sourceUrl))
  ) {
    errors.push(
      "verified records require an http(s) sourceUrl"
    );
  }

  if (
    sourceUrl &&
    !urlPattern.test(sourceUrl)
  ) {
    errors.push(
      "sourceUrl must start with http:// or https://"
    );
  }

  /*
    Email
  */
  const email = nullable(row.email);

  if (
    email &&
    !emailPattern.test(email)
  ) {
    errors.push("email is invalid");
  }

  /*
    Phone
  */
  const phone = nullable(row.phone);

  if (
    phone &&
    !phonePattern.test(phone)
  ) {
    errors.push("phone is invalid");
  }

  /*
    Other fields
  */
  const registrationYear =
    parseOptionalInteger(
      row.registrationYear,
      "registrationYear",
      errors
    );

  const consultationFee =
    parseFee(
      row.consultationFee,
      errors
    );

  const appointmentBookingAvailable =
    parseBoolean(
      row.appointmentBookingAvailable,
      "appointmentBookingAvailable",
      errors
    );

  /*
    Location
  */
  const location = parseCoordinates(
    row,
    verificationStatus,
    errors
  );

  /*
    Stop this row if validation failed
  */
  if (errors.length) {
    return {
      errors: errors.map(
        (error) =>
          `Row ${rowNumber}: ${error}`
      )
    };
  }

  /*
    Final MongoDB record
  */
  return {
    record: {
      name: text(row.name),

      registrationNumber,

      registrationYear,

      registeredCouncil:
        text(row.registeredCouncil),

      qualifications:
        parseList(row.qualifications),

      specialization:
        text(row.specialization),

      subSpecialization:
        nullable(row.subSpecialization),

      state:
        text(row.state),

      city:
        text(row.city),

      district:
        nullable(row.district),

      hospitalOrClinic:
        nullable(row.hospitalOrClinic),

      clinicAddress:
        nullable(row.clinicAddress),

      consultationFee,

      phone,

      email,

      availableDays:
        parseList(row.availableDays),

      availableTimeSlots:
        parseList(row.availableTimeSlots),

      appointmentBookingAvailable,

      verificationStatus,

      dataSource:
        text(row.dataSource),

      sourceUrl,

      lastVerifiedAt:
        verificationStatus === "verified"
          ? new Date()
          : null,

      profileImage:
        nullable(row.profileImage),

      /*
        Only add location if valid coordinates
        were supplied in the CSV.
      */
      ...(location
        ? { location }
        : {})
    }
  };
}

function readCsv(csvFilePath) {
  return new Promise(
    (resolve, reject) => {
      const rows = [];
      let rowNumber = 1;

      fs.createReadStream(csvFilePath)
        .pipe(csvParser())

        .on("data", (row) => {
          const rowValues =
            Object.values(row).map(
              (value) => text(value)
            );

          if (rowValues.some(Boolean)) {
            rows.push({
              row,
              rowNumber: ++rowNumber
            });
          } else {
            rowNumber += 1;
          }
        })

        .on("end", () => {
          resolve(rows);
        })

        .on("error", reject);
    }
  );
}

async function importRealData(
  csvFilePath
) {
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(
      `File not found: ${csvFilePath}`
    );
  }

  if (!process.env.MONGO_URI) {
    throw new Error(
      "MONGO_URI is required in backend/.env"
    );
  }

  await mongoose.connect(
    process.env.MONGO_URI
  );

  console.log(
    "MongoDB connected"
  );

  const rows =
    await readCsv(csvFilePath);

  const seenRegistrationNumbers =
    new Set();

  const records = [];
  const errors = [];

  /*
    Validate every CSV row
  */
  for (
    const { row, rowNumber } of rows
  ) {
    const result =
      validateRow(
        row,
        rowNumber,
        seenRegistrationNumbers
      );

    if (result.errors) {
      errors.push(
        ...result.errors
      );
    } else {
      records.push(
        result.record
      );
    }
  }

  /*
    Check duplicate registration numbers
    already present in MongoDB
  */
  const registrationNumbers =
    records.map(
      (record) =>
        record.registrationNumber
    );

  const existing =
    await Doctor.find({
      registrationNumber: {
        $in: registrationNumbers
      }
    })
      .select("registrationNumber")
      .lean();

  const existingNumbers =
    new Set(
      existing.map(
        (doctor) =>
          doctor.registrationNumber
      )
    );

  const newRecords =
    records.filter(
      (record) => {
        if (
          !existingNumbers.has(
            record.registrationNumber
          )
        ) {
          return true;
        }

        errors.push(
          `Registration number already exists in database: ${record.registrationNumber}`
        );

        return false;
      }
    );

  /*
    Insert valid records
  */
  let importedCount = 0;

  if (newRecords.length) {
    const inserted =
      await Doctor.insertMany(
        newRecords,
        {
          ordered: false
        }
      );

    importedCount =
      inserted.length;
  }

  console.log(
    `Imported: ${importedCount}`
  );

  console.log(
    `Rejected: ${errors.length}`
  );

  /*
    Show validation errors
  */
  if (errors.length) {
    console.log(
      "Import errors:"
    );

    errors.forEach(
      (error) =>
        console.log(
          `- ${error}`
        )
    );
  }

  return {
    importedCount,
    rejectedCount:
      errors.length,
    errors
  };
}

/*
  Default CSV:
  backend/real-doctors.csv

  You can also pass another CSV:
  node import-real-data.js filename.csv
*/
const csvFilePath =
  process.argv[2]
    ? path.resolve(
        process.argv[2]
      )
    : path.join(
        __dirname,
        "real-doctors.csv"
      );

if (require.main === module) {
  importRealData(
    csvFilePath
  )
    .then(
      async (result) => {
        await mongoose.disconnect();

        process.exitCode =
          result.rejectedCount
            ? 1
            : 0;
      }
    )
    .catch(
      async (error) => {
        console.error(
          `Import failed: ${error.message}`
        );

        await mongoose.disconnect();

        process.exitCode = 1;
      }
    );
}

module.exports = {
  importRealData,
  validateRow
};