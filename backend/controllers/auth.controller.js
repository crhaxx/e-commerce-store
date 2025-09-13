import { redis } from "../lib/redis.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
  await redis.set(
    `refresh_token:${userId}`,
    refreshToken,
    "EX",
    7 * 24 * 60 * 60
  ); // 7 days expiration
};

const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true, // prevent xss attacks (cross site scripting attacks)
    sameSite: "strict", // prevent csrf attacks (crpss site request forgery attacks)
    maxAge: 15 * 60 * 1000, // expire in 15 minutes
    secure: process.env.NODE_ENV === "production", // set to true in production
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, // prevent xss attacks (cross site scripting attacks)
    sameSite: "strict", // prevent csrf attacks (crpss site request forgery attacks)
    maxAge: 7 * 24 * 60 * 60 * 1000, // expire in 7 days
    secure: process.env.NODE_ENV === "production", // set to true in production
  });
};

export const signup = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password });

    // Authenticate user
    const { accessToken, refreshToken } = generateTokens(user._id);
    await storeRefreshToken(user._id, refreshToken);

    setCookies(res, accessToken, refreshToken);

    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "User created successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const login = async (req, res) => {
  res.send("Login route");
};

export const logout = async (req, res) => {
  res.send("Logout route");
};
