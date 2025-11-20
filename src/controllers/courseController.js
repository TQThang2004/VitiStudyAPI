import { validationResult } from "express-validator";
import courseService from "../services/courseService.js";
import { success, error } from "../utils/response.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js"; // 🔥 Quan trọng

// =========================
// 📌 Lấy danh sách khóa học
// =========================
export const getCourses = async (req, res) => {
  try {
    const courses = await courseService.getAll();
    return success(res, courses, "Fetched courses successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

// =========================
// 📌 Lấy chi tiết 1 khóa học
// =========================
export const getCourseById = async (req, res) => {
  try {
    const course = await courseService.getById(req.params.id);
    if (!course) return error(res, "Course not found", 404);

    return success(res, course, "Fetched course successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

export const createCourse = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, errors.array()[0].msg, 400);

  try {
    let thumbnailUrl = null;

    // Nếu có file upload thì push lên Cloudinary
    if (req.file) {
      thumbnailUrl = await uploadToCloudinary(req.file.buffer); // 🔥 dùng buffer
    }

    const course = await courseService.createCourse({
      ...req.body,
      thumbnail: thumbnailUrl,
    });

    return success(res, course, "Course created successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

// =========================
// 📌 Cập nhật khóa học
// =========================
export const updateCourse = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, errors.array()[0].msg, 400);

  try {
    const updated = await courseService.updateCourse(req.params.id, req.body);
    if (!updated) return error(res, "Course not found", 404);

    return success(res, updated, "Course updated successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

// =========================
// 📌 Xóa khóa học
// =========================
export const deleteCourse = async (req, res) => {
  try {
    const deleted = await courseService.deleteCourse(req.params.id);
    if (!deleted) return error(res, "Course not found", 404);

    return success(res, deleted, "Course deleted successfully");
  } catch (err) {
    return error(res, err.message);
  }
};
