import Razorpay from "razorpay";
import crypto from "crypto";
import { Product } from "../models/Product.model.js";
import { Order } from "../models/Order.model.js";
import { User } from "../models/User.model.js";
import { Address } from "../models/Address.model.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Razorpay Order
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, addressId, quantity = 1 } = req.body;

    if (!productId)
      return res.status(400).json({ message: "Product ID is required" });

    // 🧩 Fetch product
    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    // 🧠 Determine which address to use
    let selectedAddressId = addressId;

    if (!selectedAddressId) {
      // 1️⃣ Try finding default address
      const defaultAddress = await Address.findOne({
        user: userId,
        isDefault: true,
      });

      if (defaultAddress) {
        selectedAddressId = defaultAddress._id;
      } else {
        // 2️⃣ No default address — check if any address exists
        const anyAddress = await Address.findOne({ user: userId });
        if (anyAddress) {
          // use the first one as fallback
          selectedAddressId = anyAddress._id;
        } else {
          // 3️⃣ No addresses at all — return error
          return res.status(400).json({
            success: false,
            errorCode: "NO_ADDRESS_FOUND",
            message: "No address provided and no default address found ❌",
          });
        }
      }
    }

    // ✅ Create Razorpay order
    const options = {
      amount: product.price * quantity * 100, // convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // ✅ Save order to DB
    const newOrder = await Order.create({
      user: userId,
      product: productId,
      quantity,
      price: product.price,
      shippingAddress: selectedAddressId,
      totalAmount: product.price * quantity,
      paymentMethod: "razorpay",
      razorpayOrderId: order.id,
      orderStatus: "pending",
    });

    // 🔗 Link order to user
    await User.findByIdAndUpdate(userId, {
      $push: { orders: newOrder._id },
    });

    res.status(201).json({
      message: "Razorpay order created successfully ✅",
      razorpayOrder: order,
      orderId: newOrder._id,
      productTitle: product.title,
      amount: order.amount,
      currency: order.currency,
      shippingAddress: selectedAddressId,
    });
  } catch (error) {
    console.error("❌ Create Order Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


// ✅ Verify Razorpay Payment
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId, // our DB order ID
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId)
      return res.status(400).json({ message: "Missing payment details" });

    // 🔐 Validate Razorpay signature
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature ❌" });
    }

    // ✅ Update the order after successful payment
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        isPaid: true,
        orderStatus: "processing",
        paymentInfo: {
          id: razorpay_payment_id,
          status: "paid",
          paidAt: new Date(),
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Payment verified successfully ✅",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("❌ Verify Payment Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
