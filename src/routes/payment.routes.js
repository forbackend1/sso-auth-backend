import express from "express";
import { createOrder, verifyPayment } from "../controllers/payment.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Protected routes
router.post("/create-order", verifyToken, createOrder);
router.post("/verify-payment", verifyToken, verifyPayment);

export default router;
