import { Order } from "../models/Order.model.js";

export const getAllOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({ user: userId })
      .populate("product", "title price image") // populate product info
      .populate("shippingAddress", "fullName street city state postalCode phone addressType") // populate address
      .sort({ createdAt: -1 }); // newest first

    if (!orders.length) {
      return res.status(200).json({ message: "No orders found", orders: [] });
    }

    res.status(200).json({ orders });
  } catch (error) {
    console.error("❌ Get Orders Error:", error);
    res.status(500).json({ message: "Server Error while fetching orders" });
  }
};
