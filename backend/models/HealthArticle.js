const mongoose = require("mongoose");

const healthArticleSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: [
        "General Health",
        "Heart Health",
        "Women's Health",
        "Mental Health",
        "Nutrition",
        "Preventive Care"
      ]
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    readTime: {
      type: String,
      default: "4 min read"
    },
    summary: {
      type: String,
      required: true,
      trim: true
    },
    keyTips: [
      {
        type: String,
        trim: true
      }
    ],
    detailedContent: {
      type: String,
      required: true
    },
    disclaimer: {
      type: String,
      default:
        "The information presented is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified physician."
    }
  },
  {
    timestamps: true
  }
);

healthArticleSchema.index({ category: 1 });

module.exports = mongoose.model("HealthArticle", healthArticleSchema);
