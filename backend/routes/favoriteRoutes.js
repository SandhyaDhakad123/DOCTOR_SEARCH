const express = require("express");
const Favorite = require("../models/Favorite");
const Doctor = require("../models/Doctor");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

// GET all favorites for the logged-in user
router.get("/", requireAuth, async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.userId })
      .populate({
        path: "doctor",
        select: "-__v"
      })
      .sort({ createdAt: -1 });

    // Filter out any favorites where doctor may have been removed
    const validFavorites = favorites
      .filter((fav) => fav.doctor != null)
      .map((fav) => fav.doctor);

    res.json({
      success: true,
      count: validFavorites.length,
      data: validFavorites
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load favorite doctors."
    });
  }
});

// GET check if a doctor is in favorites
router.get("/check/:doctorId", requireAuth, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const exists = await Favorite.exists({
      user: req.user.userId,
      doctor: doctorId
    });
    res.json({
      success: true,
      isFavorite: Boolean(exists)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking favorite status."
    });
  }
});

// POST save a doctor to favorites
router.post("/:doctorId", requireAuth, async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID format."
      });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found."
      });
    }

    const existing = await Favorite.findOne({
      user: req.user.userId,
      doctor: doctorId
    });

    if (existing) {
      return res.json({
        success: true,
        message: "Doctor is already in your favorites.",
        isFavorite: true
      });
    }

    await Favorite.create({
      user: req.user.userId,
      doctor: doctorId
    });

    res.status(201).json({
      success: true,
      message: "Doctor saved to favorites.",
      isFavorite: true
    });
  } catch (error) {
    console.error("Error adding favorite:", error);
    res.status(500).json({
      success: false,
      message: "Unable to save doctor to favorites."
    });
  }
});

// DELETE remove a doctor from favorites
router.delete("/:doctorId", requireAuth, async (req, res) => {
  try {
    const { doctorId } = req.params;

    const result = await Favorite.findOneAndDelete({
      user: req.user.userId,
      doctor: doctorId
    });

    if (!result) {
      return res.json({
        success: true,
        message: "Doctor was not in favorites.",
        isFavorite: false
      });
    }

    res.json({
      success: true,
      message: "Doctor removed from favorites.",
      isFavorite: false
    });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({
      success: false,
      message: "Unable to remove doctor from favorites."
    });
  }
});

module.exports = router;
