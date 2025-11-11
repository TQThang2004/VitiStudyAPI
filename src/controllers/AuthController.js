import { validationResult } from "express-validator";
import authService from "../services/AuthService.js";
import { success, error } from "../utils/response.js";

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
