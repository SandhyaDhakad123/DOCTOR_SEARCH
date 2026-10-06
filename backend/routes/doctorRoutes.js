const express = require("express");
const Doctor = require("../models/Doctor");
const Review = require("../models/Review");
const requireAuth = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

const validVerificationStatuses = ["verified", "pending", "unverified"];

function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

const MASTER_SPECIALIZATIONS = [
  "Internal Medicine",
  "Neurology",
  "Nephrology",
  "Endocrinology",
  "General Surgery",
  "Urology",
  "Dermatology",
  "Cardiology",
  "Pediatrics",
  "Orthopedics",
  "Ophthalmology",
  "Gynecology & Obstetrics",
  "ENT / Otolaryngology",
  "Psychiatry",
  "Gastroenterology",
  "Pulmonology",
  "Rheumatology",
  "Oncology",
  "Radiology",
  "Anesthesiology",
  "Pathology"
];

/*
|--------------------------------------------------------------------------
| GET Autocomplete Suggestions (Requires Auth)
| URL: /api/doctors/autocomplete?q=car&type=specialization
|--------------------------------------------------------------------------
*/
router.get("/autocomplete", requireAuth, async (req, res) => {
  try {
    const { q, type } = req.query;
    if (!q || !q.trim() || q.trim().length < 1) {
      return res.json({
        success: true,
        data: { names: [], specializations: [], hospitals: [], cities: [] }
      });
    }

    const searchTerm = q.trim();
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const baseFilter = { verificationStatus: "verified" };

    const results = {
      names: [],
      specializations: [],
      hospitals: [],
      cities: []
    };

    if (!type || type === "name") {
      const names = await Doctor.distinct("name", { ...baseFilter, name: regex });
      results.names = names.filter(Boolean).slice(0, 8);
    }

    if (!type || type === "specialization") {
      const dbSpecs = await Doctor.distinct("specialization", { ...baseFilter, specialization: regex });
      const matchingMaster = MASTER_SPECIALIZATIONS.filter((s) => regex.test(s));
      const combined = Array.from(new Set([...dbSpecs.filter(Boolean), ...matchingMaster]));
      results.specializations = combined.slice(0, 8);
    }

    if (!type || type === "hospital") {
      const hospitals = await Doctor.distinct("hospitalOrClinic", { ...baseFilter, hospitalOrClinic: regex });
      results.hospitals = hospitals.filter(Boolean).slice(0, 8);
    }

    if (!type || type === "city") {
      const cities = await Doctor.distinct("city", { ...baseFilter, city: regex });
      results.cities = cities.filter(Boolean).slice(0, 8);
    }

    return res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return res.status(500).json({
      success: false,
      message: "Autocomplete failed",
      error: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET Nearby Verified Doctors (Requires Auth)
| URL: /api/doctors/nearby/search?lat=23.2599&lng=77.4126&radius=10
|--------------------------------------------------------------------------
*/
router.get("/nearby/search", requireAuth, async (req, res) => {
  try {
    const {
      lat,
      lng,
      radius = 10,
      minFee,
      maxFee,
      rating,
      availableToday,
      availableThisWeek,
      sort,
      specialization,
      name,
      hospital,
      city
    } = req.query;

    const latitude = Number(lat);
    const longitude = Number(lng);
    const radiusInKm = Number(radius);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(radiusInKm)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude, longitude and radius are required."
      });
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude."
      });
    }

    if (radiusInKm <= 0 || radiusInKm > 100) {
      return res.status(400).json({
        success: false,
        message: "Radius must be between 1 and 100 km."
      });
    }

    // Build the additional filter query for geoNear
    const geoNearQuery = {
      verificationStatus: "verified",
      "location.coordinates": { $exists: true, $ne: [] }
    };

    if (specialization && specialization.trim()) {
      geoNearQuery.specialization = { $regex: specialization.trim(), $options: "i" };
    }

    if (name && name.trim()) {
      geoNearQuery.name = { $regex: name.trim(), $options: "i" };
    }

    if (hospital && hospital.trim()) {
      geoNearQuery.hospitalOrClinic = { $regex: hospital.trim(), $options: "i" };
    }

    if (city && city.trim()) {
      geoNearQuery.city = { $regex: city.trim(), $options: "i" };
    }

    if (minFee || maxFee) {
      geoNearQuery.consultationFee = {};
      if (minFee && !isNaN(Number(minFee))) {
        geoNearQuery.consultationFee.$gte = Number(minFee);
      }
      if (maxFee && !isNaN(Number(maxFee))) {
        geoNearQuery.consultationFee.$lte = Number(maxFee);
      }
    }

    if (rating && !isNaN(Number(rating))) {
      geoNearQuery.averageRating = { $gte: Number(rating) };
    }

    if (availableToday === "true") {
      const todayDay = DAYS_OF_WEEK[new Date().getDay()];
      geoNearQuery.availableDays = todayDay;
    } else if (availableThisWeek === "true") {
      geoNearQuery["availableDays.0"] = { $exists: true };
    }

    let doctors = [];
    try {
      doctors = await Doctor.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [longitude, latitude]
            },
            distanceField: "distanceInMeters",
            maxDistance: radiusInKm * 1000,
            query: geoNearQuery,
            spherical: true
          }
        },
        { $limit: 100 },
        { $project: { __v: 0 } }
      ]);
    } catch (aggError) {
      console.warn("geoNear fallback:", aggError.message);
      // Build fallback filter (without location, that's handled by $near)
      const fallbackFilter = { ...geoNearQuery };
      delete fallbackFilter["location.coordinates"];
      fallbackFilter.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusInKm * 1000
        }
      };
      doctors = await Doctor.find(fallbackFilter)
        .select("-__v")
        .limit(100)
        .lean();
    }

    let doctorsWithDistance = doctors.map((doc) => {
      let distanceInKm = null;
      if (doc.distanceInMeters != null) {
        distanceInKm = Number((doc.distanceInMeters / 1000).toFixed(1));
      } else if (
        doc.location &&
        Array.isArray(doc.location.coordinates) &&
        doc.location.coordinates.length === 2
      ) {
        const [docLng, docLat] = doc.location.coordinates;
        distanceInKm = calculateHaversineDistanceKm(latitude, longitude, docLat, docLng);
      }
      return {
        ...doc,
        distanceInKm
      };
    });

    // Apply sort on top of the geoNear distance ordering
    if (sort === "fee_asc") {
      doctorsWithDistance.sort((a, b) => {
        const fA = a.consultationFee != null ? a.consultationFee : Infinity;
        const fB = b.consultationFee != null ? b.consultationFee : Infinity;
        return fA - fB || a.name.localeCompare(b.name);
      });
    } else if (sort === "fee_desc") {
      doctorsWithDistance.sort((a, b) => {
        const fA = a.consultationFee != null ? a.consultationFee : -Infinity;
        const fB = b.consultationFee != null ? b.consultationFee : -Infinity;
        return fB - fA || a.name.localeCompare(b.name);
      });
    } else if (sort === "rating_desc") {
      doctorsWithDistance.sort((a, b) =>
        (b.averageRating || 0) - (a.averageRating || 0) ||
        (b.reviewCount || 0) - (a.reviewCount || 0) ||
        a.name.localeCompare(b.name)
      );
    } else if (sort === "name_asc") {
      doctorsWithDistance.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "name_z_a") {
      doctorsWithDistance.sort((a, b) => b.name.localeCompare(a.name));
    }
    // Default (no sort or "nearest"): geoNear already orders by distance

    return res.json({
      success: true,
      count: doctorsWithDistance.length,
      radius: radiusInKm,
      data: doctorsWithDistance
    });
  } catch (error) {
    console.error("Nearby doctor search error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to find nearby doctors.",
      error: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET All Verified Doctors with Advanced Filters and Sorting (Requires Auth)
|--------------------------------------------------------------------------
*/
router.get("/", requireAuth, async (req, res) => {
  try {
    const {
      state,
      city,
      specialization,
      name,
      hospital,
      minFee,
      maxFee,
      rating,
      availableToday,
      availableThisWeek,
      verifiedOnly,
      sort,
      userLat,
      userLng
    } = req.query;

    const filter = {};

    // Verified doctors policy
    if (verifiedOnly === "false" && req.user && req.user.role === "admin") {
      // Admin can see unverified
    } else {
      filter.verificationStatus = "verified";
    }

    if (state && state.trim()) {
      filter.state = { $regex: state.trim(), $options: "i" };
    }

    if (city && city.trim()) {
      filter.city = { $regex: city.trim(), $options: "i" };
    }

    if (specialization && specialization.trim()) {
      filter.specialization = { $regex: specialization.trim(), $options: "i" };
    }

    if (name && name.trim()) {
      filter.name = { $regex: name.trim(), $options: "i" };
    }

    if (hospital && hospital.trim()) {
      filter.hospitalOrClinic = { $regex: hospital.trim(), $options: "i" };
    }

    if (minFee || maxFee) {
      filter.consultationFee = {};
      if (minFee && !isNaN(Number(minFee))) {
        filter.consultationFee.$gte = Number(minFee);
      }
      if (maxFee && !isNaN(Number(maxFee))) {
        filter.consultationFee.$lte = Number(maxFee);
      }
    }

    if (rating && !isNaN(Number(rating))) {
      filter.averageRating = { $gte: Number(rating) };
    }

    if (availableToday === "true") {
      const todayDay = DAYS_OF_WEEK[new Date().getDay()];
      filter.availableDays = todayDay;
    } else if (availableThisWeek === "true") {
      filter["availableDays.0"] = { $exists: true };
    }

    let sortOptions = { name: 1 };
    if (sort === "fee_asc") {
      sortOptions = { consultationFee: 1, name: 1 };
    } else if (sort === "fee_desc") {
      sortOptions = { consultationFee: -1, name: 1 };
    } else if (sort === "rating_desc") {
      sortOptions = { averageRating: -1, reviewCount: -1, name: 1 };
    } else if (sort === "name_asc") {
      sortOptions = { name: 1 };
    } else if (sort === "name_z_a") {
      sortOptions = { name: -1 };
    }

    let doctors = await Doctor.find(filter)
      .select("-__v")
      .sort(sortOptions)
      .lean();

    // If user provided coordinates, calculate distance for all results
    const parsedLat = Number(userLat);
    const parsedLng = Number(userLng);
    const hasUserLocation =
      Number.isFinite(parsedLat) && Number.isFinite(parsedLng);

    if (hasUserLocation) {
      doctors = doctors.map((doc) => {
        let distanceInKm = null;
        if (
          doc.location &&
          Array.isArray(doc.location.coordinates) &&
          doc.location.coordinates.length === 2
        ) {
          const [docLng, docLat] = doc.location.coordinates;
          distanceInKm = calculateHaversineDistanceKm(
            parsedLat,
            parsedLng,
            docLat,
            docLng
          );
        }
        return {
          ...doc,
          distanceInKm
        };
      });

      if (sort === "nearest") {
        doctors.sort((a, b) => {
          if (a.distanceInKm === null) return 1;
          if (b.distanceInKm === null) return -1;
          return a.distanceInKm - b.distanceInKm;
        });
      }
    }

    return res.json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load doctors. Please try again."
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET Doctor by ID (Requires Auth)
|--------------------------------------------------------------------------
*/
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID format."
      });
    }

    const doctor = await Doctor.findById(id).select("-__v").lean();

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found."
      });
    }

    // Fetch reviews for this doctor
    const reviews = await Review.find({ doctor: id })
      .populate("user", "fullName")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: {
        ...doctor,
        reviews
      }
    });
  } catch (error) {
    console.error("Error fetching doctor:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load doctor details."
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST Create Doctor (Requires Auth)
|--------------------------------------------------------------------------
*/
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      name,
      registrationNumber,
      registrationYear,
      registeredCouncil,
      qualifications,
      specialization,
      subSpecialization,
      state,
      city,
      district,
      hospitalOrClinic,
      clinicAddress,
      consultationFee,
      phone,
      email,
      availableDays,
      availableTimeSlots,
      appointmentBookingAvailable,
      verificationStatus,
      dataSource,
      sourceUrl,
      profileImage,
      location
    } = req.body;

    if (
      !name ||
      !registrationNumber ||
      !registeredCouncil ||
      !state ||
      !dataSource
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: name, registrationNumber, registeredCouncil, state, dataSource."
      });
    }

    const normalizedVerificationStatus = verificationStatus || "pending";

    if (!validVerificationStatuses.includes(normalizedVerificationStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verificationStatus."
      });
    }

    if (
      normalizedVerificationStatus === "verified" &&
      (!sourceUrl || !/^https?:\/\/.+/i.test(sourceUrl))
    ) {
      return res.status(400).json({
        success: false,
        message: "Verified records require a valid http(s) sourceUrl."
      });
    }

    const existingDoctor = await Doctor.findOne({ registrationNumber });
    if (existingDoctor) {
      return res.status(409).json({
        success: false,
        message: "A doctor with this registration number already exists."
      });
    }

    const doctor = new Doctor({
      name,
      registrationNumber,
      registrationYear,
      registeredCouncil,
      qualifications,
      specialization,
      subSpecialization,
      state,
      city,
      district,
      hospitalOrClinic,
      clinicAddress,
      consultationFee,
      phone,
      email,
      availableDays,
      availableTimeSlots,
      appointmentBookingAvailable: Boolean(appointmentBookingAvailable),
      verificationStatus: normalizedVerificationStatus,
      dataSource,
      sourceUrl,
      profileImage,
      location
    });

    const savedDoctor = await doctor.save();

    return res.status(201).json({
      success: true,
      message: "Doctor created successfully.",
      data: savedDoctor
    });
  } catch (error) {
    console.error("Error creating doctor:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating doctor.",
      error: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| PUT Update Doctor (Requires Auth)
|--------------------------------------------------------------------------
*/
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID format."
      });
    }

    const updateData = { ...req.body };
    delete updateData.registrationNumber;

    if (updateData.verificationStatus === "verified" && updateData.sourceUrl) {
      if (!/^https?:\/\/.+/i.test(updateData.sourceUrl)) {
        return res.status(400).json({
          success: false,
          message: "Verified records require a valid http(s) sourceUrl."
        });
      }
      updateData.lastVerifiedAt = new Date();
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).select("-__v");

    if (!updatedDoctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found."
      });
    }

    return res.json({
      success: true,
      message: "Doctor updated successfully.",
      data: updatedDoctor
    });
  } catch (error) {
    console.error("Error updating doctor:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating doctor.",
      error: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| DELETE Doctor (Admin Only)
|--------------------------------------------------------------------------
*/
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Doctor.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Doctor not found." });
    }
    return res.json({
      success: true,
      message: "Doctor record deleted successfully."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting doctor.",
      error: error.message
    });
  }
});

module.exports = router;