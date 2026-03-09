// routes/webhook.routes.js
import express from "express";
import { saveMailFromWebhook_resend } from "../controllers/webhook.controller.js";

const router = express.Router();

// Resend Inbound Webhook
router.post(
  "/resend/inbound",
  express.json({ type: "*/*" }), // important for signature verification later
  saveMailFromWebhook_resend
);

export default router;