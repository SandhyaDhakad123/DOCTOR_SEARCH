const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in or sign up to access this feature."
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Invalid session token."
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET missing in backend environment!");
      return res.status(500).json({
        success: false,
        message: "Server configuration error."
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ensure role is present, look up user if needed
    if (!payload.role) {
      const user = await User.findById(payload.userId).select("role fullName email");
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User account no longer exists."
        });
      }
      payload.role = user.role || "user";
      payload.fullName = user.fullName;
      payload.email = user.email;
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid authentication token. Please log in again."
    });
  }
}

async function requireAdmin(req, res, next) {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    let role = req.user.role;
    if (!role) {
      const user = await User.findById(req.user.userId).select("role");
      role = user?.role;
    }

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Administrator privileges required."
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error verifying administrator authorization."
    });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      if (token && process.env.JWT_SECRET) {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
      }
    }
  } catch (e) {
    req.user = null;
  }
  next();
}

module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.requireAdmin = requireAdmin;
module.exports.optionalAuth = optionalAuth;
