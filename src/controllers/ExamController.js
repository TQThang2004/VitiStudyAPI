import { validationResult } from "express-validator";
import examService from "../services/exam/ExamService.js";
import { success, error } from "../utils/response.js";

export const createExam = async (req, res) => {
  // validate body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // trả lỗi đầu tiên để đơn giản
    return error(res, errors.array()[0].msg, 400);
  }

  try {
    const payload = req.body;
    payload.teacher_id = req.user.id; // set teacher_id from authenticated user
    const created = await examService.createExam(payload);
    return success(res, created, "Exam created successfully");
  } catch (err) {
    console.error("createExam error:", err);
    return error(res, err.message || "Internal Server Error", 500);
  }
};

export const getExam = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return error(res, "Invalid exam ID", 400);
    }

    const exam = await examService.getExamById(parseInt(id));

    if (!exam) {
      return error(res, "Exam not found", 404);
    }

    return success(res, exam, "Exam retrieved successfully");
  } catch (err) {
    console.error("getExam error:", err);
    return error(res, err.message || "Internal Server Error", 500);
  }
};

export const getAllExams = async (req, res) => {
  try {
    const result = await examService.getAllExams();
    
    return success(res, result, "Exams retrieved successfully");
  } catch (err) {
    console.error("getAllExams error:", err);
    return error(res, err.message || "Internal Server Error", 500);
  }
};

export const getExamsByCourseId = async (req, res) => {
  try {
    const { course_id } = req.params;

    if (!course_id || isNaN(course_id)) {
      return error(res, "Invalid course ID", 400);
    }

    const result = await examService.getExamsByCourseId(parseInt(course_id));
    
    return success(res, result, "Exams retrieved successfully");
  } catch (err) {
    console.error("getExamsByCourseId error:", err);
    return error(res, err.message || "Internal Server Error", 500);
  }
};

export const getExamAttempts = async (req, res) => {
  try {
    const { id: exam_id } = req.params;
    const teacher_id = req.user.id;

    if (!exam_id || isNaN(exam_id)) {
      return error(res, "Invalid exam ID", 400);
    }

    // Kiểm tra role
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return error(res, "Chỉ giáo viên mới có quyền xem kết quả bài kiểm tra", 403);
    }

    const result = await examService.getExamAttemptsByTeacher(parseInt(exam_id), teacher_id);
    
    return success(res, result, "Exam attempts retrieved successfully");
  } catch (err) {
    console.error("getExamAttempts error:", err);
    return error(res, err.message || "Internal Server Error", 500);
  }
};

export const getTeacherCoursesWithExams = async (req, res) => {
  try {
    const { teacherId } = req.params;

    if (!teacherId || isNaN(teacherId)) {
      return error(res, "Invalid teacher ID", 400);
    }

    const result = await examService.getTeacherCoursesWithExams(parseInt(teacherId));
    
    return success(res, result, "Teacher courses with exams retrieved successfully");
  } catch (err) {
    console.error("getTeacherCoursesWithExams error:", err);
    return error(res, err.message || "Internal Server Error", 500);
  }
};
