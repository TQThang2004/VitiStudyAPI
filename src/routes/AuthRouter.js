import express from "express";
import { body } from "express-validator";
import { register, login } from "../controllers/AuthController.js";

const authRouter = express.Router();

// Validation rules
const registerValidation = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Invalid email format"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Invalid email format"),
  body("password").notEmpty().withMessage("Password is required"),
];

authRouter.post("/register", registerValidation, register);
authRouter.post("/login", loginValidation, login);

export default authRouter;