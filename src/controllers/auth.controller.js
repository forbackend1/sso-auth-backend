import fs from "fs";
import path from "path";
import { User } from "../models/User.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { neonQuery } from "../db/neonPostgresDB.js"
// import { handleGoogleAuth } from "../services/auth.service.js";
// const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
// ✅ Load private key (Render secret file OR local fallback)
const privateKey = fs.existsSync("/etc/secrets/private.key")
  ? fs.readFileSync("/etc/secrets/private.key", "utf8") // Render
  : fs.readFileSync(
      path.join(process.cwd(), "keys", "private.key"),
      "utf8"
    ); // Local
const publicKey = fs.readFileSync(
  path.join(process.cwd(), "keys", "public.key"),
  "utf8"
);
// Helper: generate JWT token
export const generateToken = (user) => {
  const { password, ...safeUser } = user;

  return jwt.sign(
    { ...safeUser, _id: user?._id, id: user?._id, email: user?.email },
    // process.env.JWT_SECRET,
    privateKey,
    {
      algorithm: "RS256",              // 🔥 MUST for SSO
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
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
export const ssoSignup_mongodb = async (req, res) => {
  try {
    const { name, email, password, redirect, sourceUrl } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists ⚠️",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,

      // 👇 store URL
      signupSource: sourceUrl
    });

    const token = generateToken(user);

    res.cookie("sso_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    if (redirect) {
      const redirectUrl = redirect.includes("?")
        ? `${redirect}&token=${token}`
        : `${redirect}?token=${token}`;

      return res.redirect(redirectUrl);
    }

    return res.status(201).json({
      message: "Signup successful ✅",
      token,
    });

  } catch (error) {
    console.error("❌ SSO Signup Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const ssoSignup = async (req, res) => {
  try {
    console.log("🆕 SSO signup route hit");

    const { name, email, password, redirect, sourceUrl } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // ✅ 1. Check if user exists
    const existingUser = await neonQuery(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "User already exists ⚠️",
      });
    }

    // ✅ 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ 3. Insert user
    const insertUser = await neonQuery(
      `INSERT INTO users (name, email, password, signup_source)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email`,
      [name, email, hashedPassword, sourceUrl]
    );

    const user = insertUser.rows[0];

    // ✅ 4. Generate JWT
    const token = generateToken(user);

    // ✅ 5. Set cookie
    res.cookie("sso_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // ✅ 6. Redirect (SSO flow)
    if (redirect) {
      const redirectUrl = redirect.includes("?")
        ? `${redirect}&token=${token}`
        : `${redirect}?token=${token}`;

      console.log("➡️ Redirecting to:", redirectUrl);

      return res.redirect(redirectUrl);
    }

    // ✅ 7. Normal response
    return res.status(201).json({
      message: "Signup successful ✅",
      token,
      user,
    });

  } catch (error) {
    console.error("❌ SSO Signup Error:", error.message);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};
// but in the devtools in the cookies i can only see the https://mail.slvai.tech not my mail-server-backend.onrender.com
// Login
export const ssoLogin = async (req, res) => {
  try {
    console.log("🔐 SSO login route hit");

    let { email, password, redirect } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // ✅ Normalize email (IMPORTANT)
    email = email.toLowerCase();

    // ✅ 1. Fetch user from PostgreSQL
    const result = await neonQuery(
      "SELECT id, name, email, password FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password ❌",
      });
    }

    const user = result.rows[0];

    // ✅ 2. Compare password
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        message: "Invalid email or password ❌",
      });
    }

    // ✅ 3. Generate JWT
    const token = generateToken(user);

    // ✅ 4. Set SSO cookie
    res.cookie("sso_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userData = {
      id: user.id, // 👈 changed from _id
      name: user.name,
      email: user.email,
    };

    // ✅ 5. Redirect (SSO flow)
    if (redirect) {
      const redirectUrl = redirect.includes("?")
        ? `${redirect}&token=${token}`
        : `${redirect}?token=${token}`;

      console.log("➡️ Redirecting to:", redirectUrl);

      return res.redirect(redirectUrl);
    }

    // ✅ 6. Normal API response
    return res.status(200).json({
      message: "SSO Login successful ✅",
      token,
      user: userData,
    });

  } catch (error) {
    console.error("❌ SSO Login Error:", error.message);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};
export const ssoLogin_mongodb = async (req, res) => {
  try {
    console.log("🔐 SSO login route hit");

    const { email, password, redirect } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password ❌",
      });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        message: "Invalid email or password ❌",
      });
    }

    // Generate JWT
    const token = generateToken(user);

    // 🍪 Set SSO cookie
    // res.cookie("sso_token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production", // HTTPS in production
    //   sameSite: "none", // required for cross-site SSO
    //   path: "/",
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    // });
    res.cookie("sso_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
    };

    // 🔁 If redirect URL provided → SSO flow
    if (redirect) {
      const redirectUrl = `${redirect}?token=${token}`;

      console.log("➡️ Redirecting to:", redirectUrl);

      return res.redirect(redirectUrl);
    }

    // Normal API response
    return res.status(200).json({
      message: "SSO Login successful ✅",
      token,
      user: userData,
    });

  } catch (error) {
    console.error("❌ SSO Login Error:", error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};
export const checkSession = async (req, res) => {
  try {
    console.log("check session ", req.cookies);

    // const token = req.cookies.token;
    const token = req.cookies.sso_token;

    if (!token) {
      return res.status(401).json({ authenticated: false });
    }

    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ["RS256"], // 🔥 IMPORTANT
    });
    console.log("decoded ", decoded);

    return res.json({
      authenticated: true,
      user: decoded,
      token
    });
  } catch (error) {
    return res.status(401).json({ authenticated: false });
  }
};
export const logout = async (req, res) => {
  try {
    // res.clearCookie("sso_token", {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: "none",
    //   path: "/",
    // });
    console.log("coolies for logout", req.cookies);

    // res.clearCookie("sso_token", {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "none",
    //   path: "/",
    // });

    console.log("cookies before logout:", req.cookies);

    res.clearCookie("sso_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });
    return res.json({ message: "Logout successful ✅" });
  } catch (error) {
    console.error("Logout Error:", error);
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
