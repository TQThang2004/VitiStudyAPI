import express from "express";
import { body } from "express-validator";
import upload from "../middlewares/upload.js";
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
} from "../controllers/courseController.js";

const router = express.Router();

// Validation cho tạo khóa học
const courseValidation = [
  body("title").notEmpty().withMessage("Title is required"),
  body("description").notEmpty().withMessage("Description is required"),
  body("price").isInt({ min: 0 }).withMessage("Price must be >= 0"),
  body("level").notEmpty().withMessage("Level is required"),
];

router.get("/", getCourses);
router.get("/:id", getCourseById);

// Upload ảnh thumbnail
router.post(
  "/create",
  upload.single("thumbnail"),
  courseValidation,
  createCourse
);

router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);

export default router;
