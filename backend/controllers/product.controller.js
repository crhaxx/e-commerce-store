import { redis } from "../lib/redis.js";
import Product from "../models/product.model.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}); // Fetch all products from the database
    res.status(200).json(products); // Send the products as a JSON response
  } catch (error) {
    console.log("Error fetching products:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getFeaturedProducts = async (req, res) => {
  try {
    let featuredProducts = await redis.get("featuredProducts");

    if (featuredProducts) {
      return res.json(JSON.parse(featuredProducts));
    }

    // if is not in redis, fetch from MongoDB
    featuredProducts = await Product.find({ isFeatured: true }).lean(); // .lean() to get plain JS objects - better performance

    if (!featuredProducts) {
      return res.status(404).json({ message: "No featured products found" });
    }

    // store in redis for next time
    await redis.set("featuredProducts", JSON.stringify(featuredProducts));

    res.json(featuredProducts);
  } catch (error) {
    console.log("Error fetching featured products:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
