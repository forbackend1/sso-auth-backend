import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { getAllOrders } from "../controllers/order.controller.js";

const router = express.Router();

// ✅ Get all orders for logged-in user
router.get("/", verifyToken, getAllOrders);

export default router;
