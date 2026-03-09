import { User } from "../models/User.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// import { handleGoogleAuth } from "../services/auth.service.js";

// Helper: generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { _id: user._id, id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// Helper: set auth cookie
const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  // ! use the below for safari
  //   res.cookie("token", token, {
  //   httpOnly: true,
  //   secure: true,
  //   sameSite: "lax", // or strict
  //   domain: ".slvai.tech",
  // });
};
// Signup
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Enforce @slvai.tech domain
    if (!email.endsWith("@slvai.tech")) {
      return res.status(400).json({ message: "Email must be a @slvai.tech address" });
    }

    const existed = await User.findOne({ email });
    if (existed) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashedPassword });

    const token = generateToken(newUser);

    // 🍪 Set cookie on signup too
    setAuthCookie(res, token);

    return res.status(201).json({
      message: "Signup successful ✅",
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
      token,
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
// but in the devtools in the cookies i can only see the https://mail.slvai.tech not my mail-server-backend.onrender.com
// Login
export const ssoLogin = async (req, res) => {
  try {
    console.log("sso-login route");
    
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password ❌" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Invalid email or password ❌" });

    const token = generateToken(user);

    // 🍪 Set cookie
    res.cookie("token", token, {
      httpOnly: true,          // JS cannot access cookie (XSS protection)
      // 🔐 What does secure mean in cookies?

      // secure: true

      // ➡️ The cookie will be sent ONLY over HTTPS
      // ➡️ The browser will NOT send it over HTTP
      // secure: process.env.NODE_ENV === "production", // HTTPS only in prod
      secure: true, // HTTPS only in prod

      // ❌ Why sameSite: "strict" breaks login

      // Your setup:

      // Frontend → Vercel

      // Backend → Render

      // Different domains = cross-site request

      sameSite: "none",      // CSRF protection
      // sameSite: "strict",      // CSRF protection
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      message: "Login successful ✅",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const me = async (req, res) => {
  try {
    // 🔐 User must be attached by protect middleware
    if (!req.user_from_cookies) {
      return res.status(401).json({
        message: "Not authenticated",
        user: null,
      });
    }

    const { _id, name, email } = req.user_from_cookies;

    // 🧠 Extra safety (should never fail, but defensive)
    if (!_id || !email) {
      return res.status(500).json({
        message: "User data incomplete",
        user: null,
      });
    }

    return res.status(200).json({
      user: {
        id: _id,
        name,
        email,
      },
    });
  } catch (error) {
    console.error("ME CONTROLLER ERROR:", error);

    return res.status(500).json({
      message: "Internal server error",
      user: null,
    });
  }
};


export const googleAuth = async (req, res) => {
  // const { code, dynamicRedirectUri } = req.body;

  // if (!code) {
  //   return res.status(400).json({ error: "Missing authorization code" });
  // }
  // if (!code || !dynamicRedirectUri) {
  //   return res.status(400).json({
  //     success: false,
  //     error: "Missing authorization code or redirect URI",
  //   });
  // }

  // try {
  //   // Get result from handleGoogleAuth (already includes user + token)
  //   const result = await handleGoogleAuth(code, dynamicRedirectUri);

  //   // Send that directly to frontend
  //   res.status(200).json(result);
  // } catch (error) {
  //   console.error("Google Auth Controller Error:", error.message);
  //   res.status(500).json({
  //     success: false,
  //     error: error.message || "Google authentication failed",
  //   });
  // }
};
