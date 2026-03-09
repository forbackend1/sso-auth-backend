import { Product } from "../models/Product.model.js";

// Get All Products
// export const getProducts = async (req, res) => {
//   try {
//     console.log("products ");

//     const products = await Product.find();
//     return res.json({ message: "Products fetched ✅", products });
//   } catch (error) {
//     console.error("Get Products Error:", error);
//     res.status(500).json({ message: "Server Error" });
//   }
// };

export const getProducts = async (req, res) => {
  try {
    const limit = Math.max(parseInt(req.query.limit) || 5, 1);
    const skip = Math.max(parseInt(req.query.skip) || 0, 0);
    const search = req.query.search || "";

    const filter = search
      ? {
        title: { $regex: search, $options: "i" } // case-insensitive
      }
      : {};

    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Product.countDocuments(filter)
    ]);

    res.json({
      totalProducts,
      limit,
      skip,
      products
    });
  } catch (error) {
    console.error("Get Products Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
