import { validationResult } from "express-validator";
import courseService from "../../services/courseService/courseService.js";
import { success, error } from "../../utils/response.js";
import { uploadToGCS } from "../../utils/uploadFile.js";

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
// 📌 Lấy khóa học theo giáo viên
// =========================
export const getCoursesByTeacher = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;

    const courses = await courseService.getByTeacherId(teacherId);

    return success(res, courses, "Fetched courses by teacher successfully");
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

// =========================
// 📌 Tạo khóa học — Upload ảnh thumbnail lên Google Cloud
// =========================
export const createCourse = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, errors.array()[0].msg, 400);

  try {
    let thumbnailUrl = null;

    // 🔥 Upload thumbnail lên Google Cloud Storage
    if (req.file) {
      thumbnailUrl = await uploadToGCS(req.file, "thumbnails");
    }

    const course = await courseService.createCourse({
      ...req.body,
      thumbnail: thumbnailUrl,
    });

    return success(res, course, "Course created successfully");
  } catch (err) {
    console.error("Create course error:", err);
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