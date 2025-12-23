import { validationResult } from "express-validator";
import attemptService from "../services/exam/AttemptService.js";
import { success, error } from "../utils/response.js";

/**
 * POST /api/attempts/start
 * Bắt đầu làm bài - Tạo một attempt mới
 */
export const startAttempt = async (req, res) => {
  try {
    const { exam_id } = req.body;
    const userId = req.user.id;

    if (!exam_id) {
      return error(res, "exam_id is required", 400);
    }

    const result = await attemptService.startAttempt(userId, exam_id);
    return success(res, result, "Attempt started successfully");
  } catch (err) {
    console.error("startAttempt error:", err);
    return error(res, err.message || "Internal Server Error", 500);
  }
};

/**
 * POST /api/attempts/:attemptId/answers
 * Lưu câu trả lời (1 hoặc nhiều câu)
 */
export const saveMultipleAnswers = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return error(res, "answers array is required and must not be empty", 400);
    }
    // Validate từng answer có question_id
    for (const answer of answers) {
      if (!answer.question_id) {
        return error(res, "Each answer must have question_id", 400);
      }
    }
    const result = await attemptService.saveMultipleAnswers(
      parseInt(attemptId),
      answers
    );
    return success(res, result, "Answers saved successfully");
  } catch (err) {
    console.error("saveMultipleAnswers error:", err);
    return error(res, err.message || "Internal Server Error", 500);
  }
};

/**
 * POST /api/attempts/:attemptId/submit
 * Nộp bài và tính điểm
 */
export const submitAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    const result = await attemptService.submitExam(parseInt(attemptId), userId);
    return success(res, result, "Exam submitted successfully");
  } catch (err) {
    console.error("submitAttempt error:", err);
    return error(res, err.message || "Internal Server Error", 500);
  }
};

/**
 * GET /api/attempts/:attemptId/result
 * Xem kết quả chi tiết của một lần làm bài
 */
export const getAttemptResult = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    const result = await attemptService.getAttemptResult(
      parseInt(attemptId),
      userId
    );

    return success(res, result, "Attempt result retrieved successfully");
  } catch (err) {
    console.error("getAttemptResult error:", err);
    return error(res, err.message || "Internal Server Error", 500);
  }
};

/**
 * GET /api/attempts
 * Lấy danh sách các lần làm bài của user hiện tại
 * Query params: exam_id (optional) - lọc theo exam
 */
export const getUserAttempts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { exam_id } = req.query;

    const result = await attemptService.getUserAttempts(
      userId,
      exam_id ? parseInt(exam_id) : null
    );

    return success(res, result, "User attempts retrieved successfully");
  } catch (err) {
    console.error("getUserAttempts error:", err);
    return error(res, err.message || "Internal Server Error", 500);
  }
};
