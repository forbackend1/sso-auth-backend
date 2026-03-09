import express from "express";
console.log("🚀 ROUTER LOADED from:", import.meta.url);
console.log("🚀 Express version:", express?.name || "unknown");

const router = express.Router();
console.log("🚀 Router created. Type:", typeof router, "Constructor:", router.constructor.name);

import { signup, ssoLogin, googleAuth, me } from "../controllers/auth.controller.js";
// import { protect } from "../middlewares/auth.middleware.js";

router.get("/test", (req, res) => res.json({ ok: true }));
// router.post("/signup", signup);
router.post("/login", ssoLogin);
// router.post("/google", googleAuth);

// 🔐 Check logged-in user
// router.get("/me", protect, me);


export default router;
