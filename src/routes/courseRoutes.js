import express from "express";
import { body } from "express-validator";
import upload from "../middlewares/upload.js";
import authenticate from "../middlewares/AuthMiddleware.js";

import {
  getCourses,
  getCourseById,
  getCoursesByTeacher,
  createCourse,
  createCourseWithAI,
  updateCourse,
  updateCourseMetadata,
  deleteCourse,
  enrollCourse,
  getEnrolledCourses,
  getStudentsInCourse,
  getTeacherCoursesWithStudents
} from "../controllers/courseController/courseController.js";

const router = express.Router();

/* =====================================================
   VALIDATION – TẠO KHÓA HỌC THỦ CÔNG
===================================================== */
const courseValidation = [
  body("title").notEmpty().withMessage("Title is required"),
  body("description").notEmpty().withMessage("Description is required"),
  body("price")
    .isInt({ min: 0 })
    .withMessage("Price must be a number >= 0"),
  body("level").notEmpty().withMessage("Level is required"),
];


/* ---------- ENROLL (STUDENT) ---------- */

// 🎓 Học sinh đăng ký / mua khóa học
router.post(
  "/:id/enroll",
  authenticate,   // bắt buộc đăng nhập
  enrollCourse
);

// 📚 Lấy danh sách khóa học đã mua của người dùng
router.get(
  "/enrolled/my-courses",
  authenticate,   // bắt buộc đăng nhập
  getEnrolledCourses
);

/* ---------- TEACHER MANAGEMENT ---------- */

// 👨‍🏫 Giáo viên xem danh sách học viên trong khóa học
router.get(
  "/:id/students",
  authenticate,   // bắt buộc đăng nhập
  getStudentsInCourse
);

// � Lấy tất cả khóa học của giáo viên và học viên trong mỗi khóa
router.get(
  "/teacher/:teacherId/courses-with-students",
  getTeacherCoursesWithStudents
);

// �📌 Lấy tất cả khóa học
router.get("/", getCourses);

// 📌 Lấy khóa học theo giáo viên
router.get("/teacher/:teacherId", getCoursesByTeacher);

// 📌 Lấy chi tiết khóa học
router.get("/:id", getCourseById);

/* ---------- CREATE ---------- */

// 📌 Tạo khóa học THỦ CÔNG (có upload thumbnail)
router.post(
  "/create",
  upload.single("thumbnail"),
  courseValidation,
  createCourse
);

// 🤖 Tạo khóa học bằng AI
router.post(
  "/create-ai",
  createCourseWithAI
);

/* ---------- UPDATE ---------- */

// ✏️ Cập nhật metadata (GIÁ + THUMBNAIL)
// 👉 dùng riêng cho khóa học AI sau khi tạo
router.put(
  "/:id/metadata",
  upload.single("thumbnail"),
  updateCourseMetadata
);

// ✏️ Cập nhật toàn bộ khóa học (manual / admin)
router.put(
  "/:id",
  updateCourse
);

/* ---------- DELETE ---------- */

// 🗑 Xóa khóa học
router.delete("/:id", deleteCourse);

export default router;
