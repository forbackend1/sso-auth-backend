import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";

// Helper: generate JWT token (same as your signup/login)
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

export const handleGoogleAuth = async (code, dynamicRedirectUri) => {
  try {
    // 1️⃣ Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        // redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        redirect_uri: dynamicRedirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) throw new Error("Failed to exchange code for tokens");

    const { access_token, id_token } = await tokenRes.json();

    // 2️⃣ Fetch Google user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) throw new Error("Failed to fetch Google user info");

    const userInfo = await userRes.json();

    // 3️⃣ Upsert (create or update) user in MongoDB
    const user = await User.findOneAndUpdate(
      { email: userInfo.email },
      {
        $set: {
          name: userInfo.name,
          picture: userInfo.picture,
          googleId: userInfo.sub,
          provider: "google",
        },
      },
      { new: true, upsert: true }
    );

    // 4️⃣ Generate JWT token for this user
    const token = generateToken(user);

    // 5️⃣ Return user and token (consistent with signup/login)
    return {
      success: true,
      message: "Google authentication successful ✅",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
      token,
    };

    // res.cookie("access_token", token, {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: "none",
    // });

    // return { success: true, user };

  } catch (error) {
    console.error("Google Auth Error:", error.message);
    throw new Error("Authentication failed. Please try again.");
  }
};
