import { validationResult } from "express-validator";
import authService from "../services/AuthService.js";
import { success, error } from "../utils/response.js";
import { uploadToGCS } from "../utils/uploadFile.js";

export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, errors.array()[0].msg);

  try {
    const user = await authService.register(req.body);
    return success(res, user, "User registered successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, errors.array()[0].msg);

  try {
    const result = await authService.login(req.body);
    return success(res, result, "Login successful");
  } catch (err) {
    return error(res, err.message, 401);
  }
};

export const updateUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, errors.array()[0].msg, 400);
  }

  try {
    const userId = req.user.id; // Lấy từ token đã decode trong middleware
    let avatarUrl = null;

    // Nếu có file avatar được upload
    if (req.file) {
      avatarUrl = await uploadToGCS(req.file, "avatars");
    }

    const updatedUser = await authService.updateUser(userId, {
      ...req.body,
      avatar: avatarUrl,
    });

    return success(res, updatedUser, "User updated successfully");
  } catch (err) {
    console.error("Update user error:", err);
    return error(res, err.message);
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await authService.getUserById(req.params.id);
    return success(res, user, "User fetched successfully");
  } catch (err) {
    return error(res, err.message, 404);
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await authService.getAllUsers();
    return success(res, users, "Users fetched successfully");
  } catch (err) {
    return error(res, err.message);
  }
};
