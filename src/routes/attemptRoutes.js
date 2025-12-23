import express from "express";
import { body } from "express-validator";
import {
  startAttempt,
  saveMultipleAnswers,
  submitAttempt,
  getAttemptResult,
  getUserAttempts
} from "../controllers/AttemptController.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";

const attemptRouter = express.Router();

/**
 * POST /api/attempts/start
 * Bắt đầu làm bài - Tạo attempt mới
 * Body: { exam_id: number }
 */
attemptRouter.post(
  "/start",
  authMiddleware,
  [
    body("exam_id").isInt({ min: 1 }).withMessage("exam_id must be a positive integer")
  ],
  startAttempt
);

/**
 * POST /api/attempts/:attemptId/answers
 * Lưu câu trả lời (1 hoặc nhiều câu)
 * Body: {
 *   answers: [
 *     { question_id: number, selected_option_id?: number, text_answer?: string },
 *     ...
 *   ]
 * }
 * Example - 1 câu: { "answers": [{ "question_id": 1, "selected_option_id": 5 }] }
 * Example - nhiều câu: { "answers": [{ "question_id": 1, "selected_option_id": 5 }, { "question_id": 2, "text_answer": "Đáp án" }] }
 */
attemptRouter.post(
  "/:attemptId/answers",
  authMiddleware,
  [
    body("answers").isArray({ min: 1 }).withMessage("answers must be a non-empty array"),
    body("answers.*.question_id").isInt({ min: 1 }).withMessage("Each answer must have a valid question_id")
  ],
  saveMultipleAnswers
);

/**
 * POST /api/attempts/:attemptId/submit
 * Nộp bài và tính điểm
 */
attemptRouter.post(
  "/:attemptId/submit",
  authMiddleware,
  submitAttempt
);

/**
 * GET /api/attempts/:attemptId/result
 * Xem kết quả chi tiết của một lần làm bài
 */
attemptRouter.get(
  "/:attemptId/result",
  authMiddleware,
  getAttemptResult
);

/**
 * GET /api/attempts
 * Lấy danh sách tất cả các lần làm bài của user
 * Query params: exam_id (optional) - lọc theo exam
 */
attemptRouter.get(
  "/",
  authMiddleware,
  getUserAttempts
);

export default attemptRouter;
