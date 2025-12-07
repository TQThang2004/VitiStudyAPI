import { validationResult } from "express-validator";
import examService from "../services/ExamService.js";
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
