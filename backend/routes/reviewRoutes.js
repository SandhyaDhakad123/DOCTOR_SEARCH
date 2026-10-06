const express = require("express");
const Review = require("../models/Review");
const Doctor = require("../models/Doctor");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

async function updateDoctorRatingSummary(doctorId) {
  const reviews = await Review.find({ doctor: doctorId });
  const reviewCount = reviews.length;
  let averageRating = 0;
  if (reviewCount > 0) {
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    averageRating = Number((sum / reviewCount).toFixed(1));
  }
  await Doctor.findByIdAndUpdate(doctorId, { averageRating, reviewCount });
}

// GET all reviews for a doctor (Requires Auth)
router.get("/doctor/:doctorId", requireAuth, async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID format."
      });
    }

    const reviews = await Review.find({ doctor: doctorId })
      .populate("user", "fullName")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load reviews."
    });
  }
});

// GET all reviews submitted by the logged in user
router.get("/my", requireAuth, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.userId })
      .populate("doctor", "name specialization hospitalOrClinic city")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load your reviews."
    });
  }
});

// POST submit a review for a doctor
router.post("/doctor/:doctorId", requireAuth, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { rating, comment } = req.body;

    if (!doctorId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID format."
      });
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5 stars."
      });
    }

    if (!comment || !comment.trim() || comment.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Please provide a written review (maximum 1000 characters)."
      });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found."
      });
    }

    // Check if user already reviewed this doctor
    const existing = await Review.findOne({
      user: req.user.userId,
      doctor: doctorId
    });

    if (existing) {
      existing.rating = numRating;
      existing.comment = comment.trim();
      await existing.save();
      await updateDoctorRatingSummary(doctorId);

      const populated = await Review.findById(existing._id).populate("user", "fullName");
      return res.json({
        success: true,
        message: "Your review has been updated.",
        data: populated
      });
    }

    const review = await Review.create({
      user: req.user.userId,
      doctor: doctorId,
      rating: numRating,
      comment: comment.trim()
    });

    await updateDoctorRatingSummary(doctorId);

    const populatedReview = await Review.findById(review._id).populate("user", "fullName");

    res.status(201).json({
      success: true,
      message: "Review submitted successfully.",
      data: populatedReview
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({
      success: false,
      message: "Unable to submit review."
    });
  }
});

// PUT update review
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    // Verify ownership
    if (review.user.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own reviews."
      });
    }

    if (rating !== undefined) {
      const numRating = Number(rating);
      if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ success: false, message: "Rating must be 1-5." });
      }
      review.rating = numRating;
    }

    if (comment !== undefined) {
      if (!comment.trim() || comment.trim().length > 1000) {
        return res.status(400).json({ success: false, message: "Comment is invalid or too long." });
      }
      review.comment = comment.trim();
    }

    await review.save();
    await updateDoctorRatingSummary(review.doctor);

    const populated = await Review.findById(review._id).populate("user", "fullName");

    res.json({
      success: true,
      message: "Review updated successfully.",
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating review." });
  }
});

// DELETE review
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    if (review.user.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this review."
      });
    }

    const doctorId = review.doctor;
    await Review.findByIdAndDelete(id);
    await updateDoctorRatingSummary(doctorId);

    res.json({
      success: true,
      message: "Review deleted successfully."
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting review." });
  }
});

module.exports = router;
