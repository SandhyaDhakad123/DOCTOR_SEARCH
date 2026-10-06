const express = require("express");
const HealthArticle = require("../models/HealthArticle");

const router = express.Router();

const DEFAULT_ARTICLES = [
  {
    category: "Heart Health",
    title: "Understanding Blood Pressure and Cardiovascular Wellness",
    readTime: "4 min read",
    summary:
      "Essential insights into maintaining healthy arterial elasticity, managing resting pulse rates, and reducing cardiovascular risks through consistent daily habits.",
    keyTips: [
      "Target at least 150 minutes of moderate aerobic exercise every week.",
      "Limit sodium intake to under 2,000 mg per day for optimal arterial pressure.",
      "Monitor blood pressure periodically and record baseline metrics.",
      "Prioritize potassium-rich whole foods like leafy greens, bananas, and lentils."
    ],
    detailedContent:
      "Hypertension is often called the silent condition because it typically presents without overt symptoms. Regular screening, combined with a diet low in ultra-processed sodium and high in fiber, significantly lowers long-term risk. Consistent physical movement, such as brisk walking for 30 minutes five days a week, strengthens the heart muscle and enhances vascular nitric oxide production.",
    disclaimer:
      "This content is for educational purposes only and is not medical advice. Consult a licensed cardiologist or physician regarding cardiovascular symptoms or treatment."
  },
  {
    category: "General Health",
    title: "Foundations of Annual Preventive Health Checkups",
    readTime: "3 min read",
    summary:
      "Why scheduled routine blood work, lipid panels, and baseline physiological assessments are critical before acute symptoms arise.",
    keyTips: [
      "Schedule yearly comprehensive physical exams regardless of perceived fitness.",
      "Track fasting blood glucose, HbA1c, complete blood count, and lipid profiles.",
      "Maintain an up-to-date record of vaccinations and family medical history.",
      "Discuss sleep quality, chronic fatigue, and joint pain proactively."
    ],
    detailedContent:
      "Preventive health focuses on catching biochemical alterations before they manifest as chronic conditions. Key biomarkers such as fasting blood sugar, creatinine, and lipid ratios provide actionable windows of opportunity for lifestyle or early pharmaceutical intervention.",
    disclaimer:
      "Educational information only. Always consult a certified general physician or internist for diagnosis and lab test interpretation."
  },
  {
    category: "Women's Health",
    title: "Navigating Hormonal Harmony and Bone Density Through the Decades",
    readTime: "5 min read",
    summary:
      "A structured guide to reproductive health, routine gynecological screenings, thyroid regulation, and maintaining bone mineral density.",
    keyTips: [
      "Schedule regular pelvic screenings and age-appropriate Pap smears and mammograms.",
      "Incorporate resistance training to stimulate bone mineralization and prevent osteopenia.",
      "Ensure sufficient intake of calcium and Vitamin D3 through dietary sources and sunlight.",
      "Monitor iron levels and ferritin, especially for active premenopausal women."
    ],
    detailedContent:
      "Hormonal fluctuations affect everything from sleep architectures to cardiovascular risk and bone remodeling. Early discussions with a gynecologist or endocrinologist ensure tailored nutritional and screening strategies that evolve with each phase of adulthood.",
    disclaimer:
      "Not intended as medical advice. Always discuss individual health needs with a qualified gynecologist or healthcare professional."
  },
  {
    category: "Mental Health",
    title: "Evidence-Based Strategies for Chronic Stress and Cognitive Resilience",
    readTime: "4 min read",
    summary:
      "How neuroplasticity, autonomic nervous system regulation, and sleep hygiene protect against burnout and psychological fatigue.",
    keyTips: [
      "Practice diurnal sleep consistency: aim for 7-9 hours in a cool, dark room.",
      "Use physiological sighs (two quick inhales through the nose, long sigh out) to reset autonomic tone.",
      "Establish digital boundaries during the first and last hours of the day.",
      "Seek licensed clinical psychological support when symptoms impair daily function."
    ],
    detailedContent:
      "Chronic elevation of cortisol and sympathetic drive alters neurotransmitter balances and immune signaling. Establishing structured daily recovery periods and acknowledging emotional strain is fundamental to maintaining cognitive stamina and psychological well-being.",
    disclaimer:
      "For informational purposes only. If experiencing severe distress or crisis, immediately contact emergency psychological helplines or a licensed psychiatrist."
  },
  {
    category: "Nutrition",
    title: "Optimizing Metabolic Flexibility with Whole Food Nutrition",
    readTime: "4 min read",
    summary:
      "Demystifying macronutrient ratios, gut microbiome diversity, and glycemic control for sustained energy and metabolic health.",
    keyTips: [
      "Aim for 30 different plant varieties per week to diversify your gut microbiome.",
      "Pair simple carbohydrates with quality protein and healthy fats to blunt glycemic spikes.",
      "Stay hydrated: consume adequate fluids with balanced electrolytes.",
      "Avoid regular consumption of highly refined seed oils and added sugars."
    ],
    detailedContent:
      "Metabolic health is the engine that powers every bodily system. Eating minimally processed whole foods rich in dietary polyphenols and prebiotic fibers nourishes the intestinal barrier, enhances insulin sensitivity, and dampens systemic low-grade inflammation.",
    disclaimer:
      "Informational only. Individuals with metabolic or gastrointestinal conditions should consult a registered dietitian or clinical nutritionist."
  },
  {
    category: "Preventive Care",
    title: "Immunization Schedules and Environmental Toxicity Reduction",
    readTime: "3 min read",
    summary:
      "Proactive protection through adult booster immunizations, respiratory hygiene, and minimizing indoor environmental air pollutants.",
    keyTips: [
      "Stay current on adult immunizations including tetanus boosters and seasonal vaccines.",
      "Ensure adequate indoor ventilation and consider HEPA air filtration in urban centers.",
      "Filter drinking water to eliminate micro-particulates and heavy metals.",
      "Maintain active skin barrier protection with broad-spectrum mineral sunscreen."
    ],
    detailedContent:
      "Preventive healthcare extends beyond the clinic into daily environmental exposures. Mitigating particulate inhalation, filtering drinking water, and maintaining immune vigilance through evidence-backed immunizations dramatically reduce preventable pathogen burdens.",
    disclaimer:
      "Educational guidance only. Consult your local health authority or physician for personalized vaccination and prevention plans."
  }
];

// GET all articles or filter by category
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category && category.trim()) {
      query.category = category.trim();
    }

    let articles = await HealthArticle.find(query).lean();

    // If DB is empty, auto-seed with curated vetted default articles
    if (articles.length === 0) {
      await HealthArticle.insertMany(DEFAULT_ARTICLES);
      articles = await HealthArticle.find(query).lean();
    }

    res.json({
      success: true,
      count: articles.length,
      data: articles
    });
  } catch (error) {
    console.error("Health articles error:", error);
    // Return default articles if database query had issue
    res.json({
      success: true,
      count: DEFAULT_ARTICLES.length,
      data: DEFAULT_ARTICLES
    });
  }
});

module.exports = router;
