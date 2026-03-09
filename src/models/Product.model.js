import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true }, // URL of product image
    price: { type: Number, required: true },
    weight: { type: String, required: true }, // e.g., "500g", "1kg"
    stock: { type: Number, required: true, default: 0 },
    category: { type: String, default: "Peanut Butter" }
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
