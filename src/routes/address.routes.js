import express from "express";
import {
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
} from "../controllers/address.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js"; // ✅ use your existing one

const router = express.Router();

// ✅ Add new address
router.post("/", verifyToken, addAddress);

// ✅ Get all addresses
router.get("/", verifyToken, getAddresses);

// ✅ Update address
// router.put("/:id", verifyToken, updateAddress);

// ✅ Delete address
// router.delete("/:id", verifyToken, deleteAddress);

export default router;
