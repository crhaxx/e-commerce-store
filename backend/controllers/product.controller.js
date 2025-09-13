import { redis } from "../lib/redis.js";
import cloudinary from "cloudinary";
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

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image } = req.body;

    let cloudinaryResponse = null;

    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "products",
      });
    }

    const product = await Product.create({
      name,
      description,
      price,
      image: cloudinaryResponse?.secure_url
        ? cloudinaryResponse.secure_url
        : "",
      category,
    });

    res.status(201).json(product);
  } catch (error) {
    console.log("Error creating product:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.image) {
      const publicId = product.image.split("/").pop().split(".")[0]; // Extract public ID from URL

      try {
        await cloudinary.uploader.destroy(`products/${publicId}`); // Delete image from Cloudinary
        console.log("Image deleted from Cloudinary");
      } catch (error) {
        console.log("Error deleting image from Cloudinary:", error);
      }

      await Product.findByIdAndDelete(req.params.id);

      res.json({ message: "Product deleted successfully" });
    }
  } catch (error) {
    console.log("Error deleting product:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
