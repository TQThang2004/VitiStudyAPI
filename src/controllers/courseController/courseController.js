import { validationResult } from "express-validator";
import courseService from "../../services/courseService/courseService.js";
import { success, error } from "../../utils/response.js";
import { uploadToGCS } from "../../utils/uploadFile.js";

/* =====================================================
 🎓 HỌC SINH ĐĂNG KÝ / MUA KHÓA HỌC
===================================================== */
export const enrollCourse = async (req, res) => {
  try {
    const student_id = req.user.id; // lấy từ JWT middleware
    const course_id = req.params.id;

    if (!course_id) {
      return error(res, "course_id là bắt buộc", 400);
    }

    const result = await courseService.enrollCourse({
      student_id,
      course_id
    });

    return success(
      res,
      result.enrollment,
      "Enroll course successfully"
    );

  } catch (err) {
    console.error("Enroll course error:", err.message);
    return error(res, err.message, 400);
  }
};


/* =====================================================
 🤖 TẠO KHÓA HỌC BẰNG AI
===================================================== */
export const createCourseWithAI = async (req, res) => {
  try {
    const {
      teacher_id,
      subject,
      topic,
      level,
      numSections,
      lessonsPerSection
    } = req.body;

    // Validate tối thiểu
    if (!teacher_id || !subject || !topic) {
      return error(
        res,
        "teacher_id, subject và topic là bắt buộc",
        400
      );
    }

    const result = await courseService.createCourseWithAI({
      teacher_id,
      subject,
      topic,
      level,
      numSections,
      lessonsPerSection
    });

    return success(
      res,
      result.course,
      "Course created with AI successfully"
    );
  } catch (err) {
    console.error("Create course with AI error:", err);
    return error(res, err.message);
  }
};

/* =====================================================
 📌 LẤY DANH SÁCH KHÓA HỌC
===================================================== */
export const getCourses = async (req, res) => {
  try {
    const courses = await courseService.getAll();
    return success(res, courses, "Fetched courses successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

/* =====================================================
 📌 LẤY KHÓA HỌC THEO GIÁO VIÊN
===================================================== */
export const getCoursesByTeacher = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    const courses = await courseService.getByTeacherId(teacherId);
    return success(res, courses, "Fetched courses by teacher successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

/* =====================================================
 📌 LẤY CHI TIẾT KHÓA HỌC
===================================================== */
export const getCourseById = async (req, res) => {
  try {
    const course = await courseService.getById(req.params.id);
    if (!course) return error(res, "Course not found", 404);

    return success(res, course, "Fetched course successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

/* =====================================================
 📌 TẠO KHÓA HỌC THỦ CÔNG + UPLOAD THUMBNAIL
===================================================== */
export const createCourse = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, errors.array()[0].msg, 400);
  }

  try {
    let thumbnailUrl = null;

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

/* =====================================================
 📌 CẬP NHẬT GIÁ + THUMBNAIL (CHO KHÓA HỌC AI)
===================================================== */
export const updateCourseMetadata = async (req, res) => {
  try {
    const courseId = req.params.id;
    const { price } = req.body;

    let thumbnailUrl = null;

    if (req.file) {
      thumbnailUrl = await uploadToGCS(req.file, "thumbnails");
    }

    const updated = await courseService.updateCourseMetadata(
      courseId,
      {
        price,
        thumbnail: thumbnailUrl
      }
    );

    if (!updated) return error(res, "Course not found", 404);

    return success(
      res,
      updated,
      "Course metadata updated successfully"
    );
  } catch (err) {
    console.error("Update course metadata error:", err);
    return error(res, err.message);
  }
};


/* =====================================================
 📌 CẬP NHẬT KHÓA HỌC
===================================================== */
export const updateCourse = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, errors.array()[0].msg, 400);
  }

  try {
    const updated = await courseService.updateCourse(
      req.params.id,
      req.body
    );

    if (!updated) return error(res, "Course not found", 404);

    return success(res, updated, "Course updated successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

/* =====================================================
 📌 XÓA KHÓA HỌC
===================================================== */
export const deleteCourse = async (req, res) => {
  try {
    const deleted = await courseService.deleteCourse(req.params.id);
    if (!deleted) return error(res, "Course not found", 404);

    return success(res, deleted, "Course deleted successfully");
  } catch (err) {
    return error(res, err.message);
  }
};
