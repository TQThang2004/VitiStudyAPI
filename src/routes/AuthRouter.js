import express from "express";
import { body } from "express-validator";
import { register, login, updateUser, getUserById, getAllUsers } from "../controllers/AuthController.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";
import upload from "../middlewares/upload.js";

const authRouter = express.Router();

// Validation rules
const registerValidation = [
  body("username").notEmpty().withMessage("Username is required"),
  body("email").isEmail().withMessage("Invalid email format"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("role").notEmpty().withMessage("Role is required"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Invalid email format"),
  body("password").notEmpty().withMessage("Password is required"),
];

const updateUserValidation = [
  body("username").optional().notEmpty().withMessage("Username cannot be empty"),
  body("email").optional().isEmail().withMessage("Invalid email format"),
];

authRouter.post("/register", registerValidation, register);
authRouter.post("/login", loginValidation, login);
authRouter.put("/update", authMiddleware, upload.single("avatar"), updateUserValidation, updateUser);
authRouter.get("/users", authMiddleware, getAllUsers);
authRouter.get("/users/:id", authMiddleware, getUserById);

export default authRouter;