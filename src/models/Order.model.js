import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    price: {
      type: Number,
      required: true, // snapshot of product price at order time
    },

    shippingAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["razorpay", "stripe", "paypal", "cod"],
      required: true,
      default: "cod",
    },

    paymentInfo: {
      id: { type: String }, // e.g. Razorpay payment ID
      status: { type: String }, // 'paid', 'failed', 'pending'
      paidAt: { type: Date },
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    shippingCharge: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    orderStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },

    deliveredAt: { type: Date },

    isPaid: { type: Boolean, default: false },

    razorpayOrderId: { type: String },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
