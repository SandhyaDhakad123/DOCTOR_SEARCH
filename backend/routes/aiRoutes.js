const express = require("express");
const Doctor = require("../models/Doctor");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

const SYSTEM_INSTRUCTION = `You are a medical specialization routing assistant for DoctorFinder, a healthcare discovery platform.
CRITICAL MEDICAL SAFETY RULES:
1. You DO NOT provide medical diagnoses.
2. You DO NOT prescribe medicines, dosages, or treatments.
3. You help users identify which medical SPECIALIZATION (e.g. Cardiologist, Dermatologist, Neurologist, Orthopedics, Pediatrics, General Physician / Internal Medicine, Gynecologist, ENT Specialist, Psychiatrist, Gastroenterologist, Nephrologist, Pulmonologist, Oncologist, Ophthalmologist) is appropriate to consult for their non-emergency concerns.
4. For red-flag / acute emergencies (severe chest pain, breathing difficulty, stroke signs, massive bleeding, loss of consciousness), advise immediate emergency hospital attention.
5. You must output strictly valid JSON with no markdown backticks, matching this exact format:
{
  "isEmergency": boolean,
  "emergencyNotice": string or null,
  "primarySpecialization": string,
  "recommendedSpecializations": [string],
  "explanation": string,
  "suggestedQuestions": [string]
}`;

const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash"
];

// Fallback rule-based clinical routing if Gemini API faces high demand / temporary outage
function fallbackClinicalRouting(symptoms) {
  const s = symptoms.toLowerCase();
  if (s.includes("chest") || s.includes("heart") || s.includes("palpitation")) {
    return {
      isEmergency: s.includes("severe") || s.includes("crushing"),
      emergencyNotice: s.includes("severe")
        ? "Severe chest pain requires immediate emergency room evaluation."
        : null,
      primarySpecialization: "Cardiology",
      recommendedSpecializations: ["Cardiology", "Internal Medicine"],
      explanation:
        "Symptoms relating to the cardiovascular system or chest discomfort are best evaluated by a Cardiologist or an Internal Medicine specialist.",
      suggestedQuestions: [
        "How long have you felt these sensations?",
        "Does discomfort increase with physical exertion?"
      ]
    };
  } else if (s.includes("skin") || s.includes("rash") || s.includes("itching") || s.includes("acne")) {
    return {
      isEmergency: false,
      emergencyNotice: null,
      primarySpecialization: "Dermatology",
      recommendedSpecializations: ["Dermatology", "General Medicine"],
      explanation:
        "Skin irritations, rashes, and cutaneous lesions fall under the clinical purview of Dermatology for comprehensive topical assessment.",
      suggestedQuestions: [
        "Has there been exposure to any new detergents, foods, or allergens?",
        "Are the lesions spreading or accompanied by fever?"
      ]
    };
  } else if (s.includes("joint") || s.includes("knee") || s.includes("bone") || s.includes("back pain") || s.includes("stiff")) {
    return {
      isEmergency: false,
      emergencyNotice: null,
      primarySpecialization: "Orthopedics",
      recommendedSpecializations: ["Orthopedics", "Rheumatology", "Internal Medicine"],
      explanation:
        "Musculoskeletal complaints such as joint stiffness, localized swelling, and mobility limitations are typically managed by an Orthopedic specialist or Rheumatologist.",
      suggestedQuestions: [
        "Does the joint pain worsen after rest or after activity?",
        "Has there been any prior trauma or sports injury?"
      ]
    };
  } else if (s.includes("headache") || s.includes("migraine") || s.includes("dizzy") || s.includes("numb")) {
    return {
      isEmergency: s.includes("sudden") && s.includes("severe"),
      emergencyNotice: null,
      primarySpecialization: "Neurology",
      recommendedSpecializations: ["Neurology", "Internal Medicine"],
      explanation:
        "Recurrent headaches, neural discomfort, or balance issues warrant evaluation by a Neurologist to assess neurological pathways.",
      suggestedQuestions: [
        "Are headaches accompanied by visual changes or nausea?",
        "What time of day do symptoms most frequently present?"
      ]
    };
  }

  return {
    isEmergency: false,
    emergencyNotice: null,
    primarySpecialization: "Internal Medicine",
    recommendedSpecializations: ["Internal Medicine", "General Medicine"],
    explanation:
      "For generalized constitutional symptoms or broad physiological concerns, consultation with a Specialist in Internal Medicine provides a comprehensive baseline diagnostic overview.",
    suggestedQuestions: [
      "What is the timeline and progression of your symptoms?",
      "Are you currently taking any prescription medications?"
    ]
  };
}

router.post("/recommend", requireAuth, async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || !symptoms.trim() || symptoms.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Please describe your symptoms or health query (minimum 5 characters)."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let parsedResult = null;

    if (apiKey) {
      const userPrompt = `User description: "${symptoms.trim()}". Analyze this non-emergency inquiry and recommend appropriate medical specializations. Respond only in the specified JSON schema.`;
      const requestBody = {
        contents: [{ parts: [{ text: `${SYSTEM_INSTRUCTION}\n\n${userPrompt}` }] }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      };

      // Try active models in sequence with demand fallback
      for (const model of GEMINI_MODELS) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(5000)
          });

          if (response.ok) {
            const data = await response.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const cleanedJson = rawText
              .replace(/^```json\s*/i, "")
              .replace(/^```\s*/i, "")
              .replace(/```$/i, "")
              .trim();
            const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsedResult = JSON.parse(jsonMatch[0]);
              console.log(`✓ Gemini model ${model} answered recommendation query.`);
              break;
            }
          } else {
            console.warn(`Gemini model ${model} status ${response.status}, trying next fallback...`);
          }
        } catch (modelErr) {
          console.warn(`Gemini model ${model} error:`, modelErr.message);
        }
      }
    }

    // If Gemini was unreachable due to upstream rate limits / demand spikes, use clinical safety fallback
    if (!parsedResult) {
      console.log("Using clinical heuristics safety fallback for specialization recommendation.");
      parsedResult = fallbackClinicalRouting(symptoms);
    }

    // Find verified matching doctors in DB
    const searchSpecs = [
      parsedResult.primarySpecialization,
      ...(parsedResult.recommendedSpecializations || [])
    ].filter(Boolean);

    const regexQueries = searchSpecs.map(
      (spec) => new RegExp(spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    );

    const matchingDoctors = await Doctor.find({
      verificationStatus: "verified",
      $or: [
        { specialization: { $in: regexQueries } },
        { subSpecialization: { $in: regexQueries } }
      ]
    })
      .select("-__v")
      .limit(10)
      .lean();

    res.json({
      success: true,
      recommendation: parsedResult,
      matchingDoctors,
      disclaimer:
        "DoctorFinder AI is designed solely for specialization discovery based on user-provided descriptions. It does not provide medical diagnoses, treatment plans, or emergency care advice. Always consult an authorized and registered medical professional."
    });
  } catch (error) {
    console.error("AI recommendation route error:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred during AI recommendation.",
      error: error.message
    });
  }
});

module.exports = router;
