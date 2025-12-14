import express from "express";
import { body } from "express-validator";
import upload from "../middlewares/upload.js";
import {
  getCourses,
  getCourseById,
  getCoursesByTeacher,
  createCourse,
  createCourseWithAI, // 🔥 THÊM
  updateCourse,
  deleteCourse
} from "../controllers/courseController/courseController.js";

const router = express.Router();

// =========================
// Validation cho tạo khóa học thủ công
// =========================
const courseValidation = [
  body("title").notEmpty().withMessage("Title is required"),
  body("description").notEmpty().withMessage("Description is required"),
  body("price").isInt({ min: 0 }).withMessage("Price must be >= 0"),
  body("level").notEmpty().withMessage("Level is required"),
];

// =========================
// ROUTES
// =========================

// 📌 Lấy tất cả khóa học
router.get("/", getCourses);

// 📌 Lấy khóa học theo giáo viên
router.get("/teacher/:teacherId", getCoursesByTeacher);

// 📌 Lấy chi tiết khóa học
router.get("/:id", getCourseById);

// 📌 Tạo khóa học THỦ CÔNG (có thumbnail)
router.post(
  "/create",
  upload.single("thumbnail"),
  courseValidation,
  createCourse
);

// 🤖 TẠO KHÓA HỌC BẰNG AI (KHÔNG upload, KHÔNG validation form cũ)
router.post(
  "/create-ai",
  createCourseWithAI
);

// 📌 Cập nhật khóa học
router.put("/:id", updateCourse);

// 📌 Xóa khóa học
router.delete("/:id", deleteCourse);

export default router;
