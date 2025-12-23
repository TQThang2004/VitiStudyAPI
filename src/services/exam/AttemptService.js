import pool from "../../config/db.js";
import { checkShortAnswer } from "./GeminiService.js";

/**
 * Bắt đầu làm bài - Tạo một attempt mới
 */
const startAttempt = async (userId, examId) => {
  const client = await pool.connect();
  try {
    // Kiểm tra xem exam có tồn tại không
    const examCheck = await client.query(
      "SELECT id, title, duration_minutes, is_active FROM exams WHERE id = $1",
      [examId]
    );

    if (examCheck.rows.length === 0) {
      throw new Error("Exam not found");
    }

    // Tạo attempt mới
    const insertAttemptText = `
      INSERT INTO exam_attempts (user_id, exam_id, started_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      RETURNING id, user_id, exam_id, started_at, completed_at, total_score
    `;
    const attemptRes = await client.query(insertAttemptText, [userId, examId]);
    const attempt = attemptRes.rows[0];

    return {
      attempt,
      exam: examCheck.rows[0]
    };
  } finally {
    client.release();
  }
};

/**
 * Lưu câu trả lời (1 hoặc nhiều câu cùng lúc)
 */
const saveMultipleAnswers = async (attemptId, answers) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Kiểm tra attempt
    const attemptCheck = await client.query(
      "SELECT id, completed_at FROM exam_attempts WHERE id = $1",
      [attemptId]
    );
    if (attemptCheck.rows.length === 0) {
      throw new Error("Attempt not found");
    }
    if (attemptCheck.rows[0].completed_at) {
      throw new Error("Cannot modify a completed attempt");
    }
    const savedAnswers = [];
    for (const answer of answers) {
      const { question_id, selected_option_id, text_answer } = answer;
      // Kiểm tra xem đã có answer chưa
      const existingAnswer = await client.query(
        "SELECT id FROM student_answers WHERE attempt_id = $1 AND question_id = $2",
        [attemptId, question_id]
      );
      let result;
      if (existingAnswer.rows.length > 0) {
        // Update
        const updateText = `
          UPDATE student_answers
          SET selected_option_id = $1, text_answer = $2
          WHERE attempt_id = $3 AND question_id = $4
          RETURNING id, attempt_id, question_id, selected_option_id, text_answer
        `;
        result = await client.query(updateText, [
          selected_option_id || null,
          text_answer || null,
          attemptId,
          question_id
        ]);
      } else {
        // Insert
        const insertText = `
          INSERT INTO student_answers (attempt_id, question_id, selected_option_id, text_answer)
          VALUES ($1, $2, $3, $4)
          RETURNING id, attempt_id, question_id, selected_option_id, text_answer
        `;
        result = await client.query(insertText, [
          attemptId,
          question_id,
          selected_option_id || null,
          text_answer || null
        ]);
      }
      savedAnswers.push(result.rows[0]);
    }

    await client.query("COMMIT");
    return savedAnswers;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Nộp bài và tính điểm
 */
const submitExam = async (attemptId, userId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Kiểm tra attempt thuộc về user và chưa completed
    const attemptCheck = await client.query(
      "SELECT id, user_id, exam_id, completed_at FROM exam_attempts WHERE id = $1",
      [attemptId]
    );
    if (attemptCheck.rows.length === 0) {
      throw new Error("Attempt not found");
    }
    const attempt = attemptCheck.rows[0];
    if (attempt.user_id !== userId) {
      throw new Error("Unauthorized: This attempt does not belong to you");
    }
    if (attempt.completed_at) {
      throw new Error("Attempt already submitted");
    }

    // Lấy TẤT CẢ câu hỏi của exam
    const allQuestionsRes = await client.query(
      `SELECT q.id, q.question_type, q.points, q.correct_text_answer, q.question_text
       FROM questions q
       JOIN exam_sections es ON q.section_id = es.id
       WHERE es.exam_id = $1
       ORDER BY q.order_index`,
      [attempt.exam_id]
    );

    const allQuestions = allQuestionsRes.rows;
    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    // Chấm điểm từng câu
    for (const question of allQuestions) {
      // Lấy câu trả lời của student (nếu có)
      const studentAnswerRes = await client.query(
        `SELECT id, selected_option_id, text_answer
         FROM student_answers
         WHERE attempt_id = $1 AND question_id = $2`,
        [attemptId, question.id]
      );

      let isCorrect = false;
      let scoreObtained = 0;
      let studentAnswerId = null;

      if (studentAnswerRes.rows.length > 0) {
        // Có câu trả lời
        const studentAnswer = studentAnswerRes.rows[0];
        studentAnswerId = studentAnswer.id;

        if (question.question_type === "MULTIPLE_CHOICE" || question.question_type === "TRUE_FALSE") {
          // Kiểm tra option có đúng không
          if (studentAnswer.selected_option_id) {
            const optionCheck = await client.query(
              "SELECT is_correct FROM question_options WHERE id = $1",
              [studentAnswer.selected_option_id]
            );
            
            if (optionCheck.rows.length > 0 && optionCheck.rows[0].is_correct) {
              isCorrect = true;
              scoreObtained = question.points;
            }
          }
          
          // Lưu kết quả vào database
          await client.query(
            `UPDATE student_answers 
             SET is_correct = $1, score_obtained = $2
             WHERE id = $3`,
            [isCorrect, scoreObtained, studentAnswerId]
          );
        } else if (question.question_type === "SHORT_ANSWER") {
          // Sử dụng AI để kiểm tra câu trả lời tự luận
          if (studentAnswer.text_answer && question.correct_text_answer) {
            try {
              const aiResult = await checkShortAnswer({
                question: question.question_text,
                userAnswer: studentAnswer.text_answer,
                correctAnswer: question.correct_text_answer
              });

              if (aiResult.success && aiResult.data) {
                isCorrect = aiResult.data.isCorrect;
                // Nếu đúng (accuracy >= 70%) thì được full điểm, sai thì 0 điểm
                scoreObtained = isCorrect ? question.points : 0;
                
                // Lưu feedback và accuracy từ AI
                await client.query(
                  `UPDATE student_answers 
                   SET is_correct = $1, score_obtained = $2, ai_feedback_detail = $3
                   WHERE id = $4`,
                  [
                    isCorrect, 
                    scoreObtained, 
                    JSON.stringify({
                      accuracy: aiResult.data.accuracy,
                      feedback: aiResult.data.feedback
                    }),
                    studentAnswerId
                  ]
                );
              } else {
                // Nếu AI không hoạt động, fallback về so sánh chuỗi
                const userAnswer = studentAnswer.text_answer.trim().toLowerCase();
                const correctAnswer = question.correct_text_answer.trim().toLowerCase();
                isCorrect = userAnswer === correctAnswer;
                scoreObtained = isCorrect ? question.points : 0;
                
                await client.query(
                  `UPDATE student_answers 
                   SET is_correct = $1, score_obtained = $2
                   WHERE id = $3`,
                  [isCorrect, scoreObtained, studentAnswerId]
                );
              }
            } catch (aiError) {
              console.error("AI grading error, using fallback:", aiError);
              // Fallback: so sánh chuỗi đơn giản
              const userAnswer = studentAnswer.text_answer.trim().toLowerCase();
              const correctAnswer = question.correct_text_answer.trim().toLowerCase();
              isCorrect = userAnswer === correctAnswer;
              scoreObtained = isCorrect ? question.points : 0;
              
              await client.query(
                `UPDATE student_answers 
                 SET is_correct = $1, score_obtained = $2
                 WHERE id = $3`,
                [isCorrect, scoreObtained, studentAnswerId]
              );
            }
          } else {
            // Không có câu trả lời text hoặc không có đáp án chuẩn
            await client.query(
              `UPDATE student_answers 
               SET is_correct = $1, score_obtained = $2
               WHERE id = $3`,
              [false, 0, studentAnswerId]
            );
          }
        }
      } else {
        // KHÔNG có câu trả lời - Insert record với điểm 0
        await client.query(
          `INSERT INTO student_answers (attempt_id, question_id, is_correct, score_obtained)
           VALUES ($1, $2, $3, $4)`,
          [attemptId, question.id, false, 0]
        );
        unansweredCount++;
      }

      totalScore += scoreObtained;
      
      if (isCorrect) {
        correctCount++;
      } else if (studentAnswerId !== null) {
        wrongCount++;
      }
    }
    // Update attempt với total_score và completed_at
    const updateAttemptText = `
      UPDATE exam_attempts
      SET completed_at = CURRENT_TIMESTAMP, total_score = $1
      WHERE id = $2
      RETURNING id, user_id, exam_id, started_at, completed_at, total_score
    `;
    const updatedAttemptRes = await client.query(updateAttemptText, [totalScore, attemptId]);
    await client.query("COMMIT");
    return {
      attempt: updatedAttemptRes.rows[0],
      total_questions: allQuestions.length,
      correct_answers: correctCount,
      wrong_answers: wrongCount,
      unanswered: unansweredCount,
      total_score: totalScore
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Lấy kết quả chi tiết của một lần làm bài
 */
const getAttemptResult = async (attemptId, userId) => {
  const client = await pool.connect();
  try {
    // Lấy thông tin attempt
    const attemptRes = await client.query(
      `SELECT ea.id, ea.user_id, ea.exam_id, ea.started_at, ea.completed_at, ea.total_score,
              e.title as exam_title, e.duration_minutes
       FROM exam_attempts ea
       JOIN exams e ON ea.exam_id = e.id
       WHERE ea.id = $1`,
      [attemptId]
    );

    if (attemptRes.rows.length === 0) {
      throw new Error("Attempt not found");
    }

    const attempt = attemptRes.rows[0];

    // Kiểm tra quyền truy cập
    if (attempt.user_id !== userId) {
      throw new Error("Unauthorized: Cannot view this attempt");
    }

    // Lấy tất cả câu trả lời với thông tin chi tiết
    const answersRes = await client.query(
      `SELECT sa.id as answer_id, sa.question_id, sa.selected_option_id, sa.text_answer,
              sa.is_correct, sa.score_obtained, sa.ai_feedback_detail,
              q.question_text, q.question_type, q.points, q.image_url, q.explanation,
              qo.option_text as selected_option_text,
              (SELECT json_agg(json_build_object(
                'id', qo2.id,
                'option_text', qo2.option_text,
                'is_correct', qo2.is_correct
              ) ORDER BY qo2.order_index)
              FROM question_options qo2
              WHERE qo2.question_id = q.id) as all_options
       FROM student_answers sa
       JOIN questions q ON sa.question_id = q.id
       LEFT JOIN question_options qo ON sa.selected_option_id = qo.id
       WHERE sa.attempt_id = $1
       ORDER BY q.order_index`,
      [attemptId]
    );

    return {
      attempt: {
        id: attempt.id,
        exam_id: attempt.exam_id,
        exam_title: attempt.exam_title,
        started_at: attempt.started_at,
        completed_at: attempt.completed_at,
        total_score: attempt.total_score,
        duration_minutes: attempt.duration_minutes
      },
      answers: answersRes.rows
    };
  } finally {
    client.release();
  }
};

/**
 * Lấy danh sách các lần làm bài của user
 */
const getUserAttempts = async (userId, examId = null) => {
  const client = await pool.connect();
  try {
    let query = `
      SELECT ea.id, ea.exam_id, ea.started_at, ea.completed_at, ea.total_score,
             e.title as exam_title, e.duration_minutes
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      WHERE ea.user_id = $1
    `;
    const params = [userId];

    if (examId) {
      query += " AND ea.exam_id = $2";
      params.push(examId);
    }

    query += " ORDER BY ea.started_at DESC";

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

export default {
  startAttempt,
  saveMultipleAnswers,
  submitExam,
  getAttemptResult,
  getUserAttempts
};
