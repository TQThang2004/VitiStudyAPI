import pool from "../../config/db.js";

const createExam = async (payload) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Insert exam (add teacher_id)
    const insertExamText = `
      INSERT INTO exams (teacher_id, title, subject, description, duration_minutes, is_active, course_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, teacher_id, title, subject, description, duration_minutes, is_active, course_id, created_at, updated_at
    `;
    const examValues = [
      payload.teacher_id, // new: teacher_id
      payload.title,
      payload.subject || null,
      payload.description || null,
      payload.duration_minutes || null,
      payload.is_active ? true : false,
      payload.course_id || null
    ];
    const examRes = await client.query(insertExamText, examValues);
    const exam = examRes.rows[0];

    // keep track of created sections/questions/options
    exam.sections = [];

    // 2) Insert sections -> questions -> options
    const insertSectionText = `
      INSERT INTO exam_sections (exam_id, title, description, order_index)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, description, order_index
    `;
    const insertQuestionText = `
      INSERT INTO questions (section_id, question_text, question_type, image_url, points, explanation, correct_text_answer, order_index)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, section_id, question_text, question_type, image_url, points, explanation, correct_text_answer, order_index
    `;
    const insertOptionText = `
      INSERT INTO question_options (question_id, option_text, is_correct, order_index)
      VALUES ($1, $2, $3, $4)
      RETURNING id, question_id, option_text, is_correct, order_index
    `;

    let sectionIndex = 0;
    for (const section of payload.sections) {
      const sectionVals = [exam.id, section.title, section.description || null, section.order_index ?? sectionIndex];
      const sectionRes = await client.query(insertSectionText, sectionVals);
      const createdSection = sectionRes.rows[0];
      createdSection.questions = [];

      // questions
      let questionIndex = 0;
      for (const q of section.questions) {
        // basic extra validation: if MC/TF must have options
        if ((q.question_type === "MULTIPLE_CHOICE" || q.question_type === "TRUE_FALSE") && (!Array.isArray(q.options) || q.options.length === 0)) {
          throw new Error(`Question "${q.question_text}" requires options for type ${q.question_type}`);
        }

        // If MULTIPLE_CHOICE, ensure at least one option marked correct
        if (q.question_type === "MULTIPLE_CHOICE") {
          const hasCorrect = Array.isArray(q.options) && q.options.some(o => o.is_correct === true);
          if (!hasCorrect) {
            throw new Error(`Question "${q.question_text}" (MULTIPLE_CHOICE) must have at least one option with is_correct=true`);
          }
        }

        const qVals = [
          createdSection.id,
          q.question_text,
          q.question_type,
          q.image_url || null,
          q.points ?? 1.0,
          q.explanation || null,
          q.correct_text_answer || null,
          q.order_index ?? questionIndex
        ];
        const qRes = await client.query(insertQuestionText, qVals);
        const createdQ = qRes.rows[0];
        createdQ.options = [];

        // insert options if any
        if (Array.isArray(q.options) && q.options.length > 0) {
          let optionIndex = 0;
          for (const opt of q.options) {
            const optVals = [createdQ.id, opt.option_text, opt.is_correct === true, opt.order_index ?? optionIndex];
            const optRes = await client.query(insertOptionText, optVals);
            createdQ.options.push(optRes.rows[0]);
            optionIndex++;
          }
        }

        createdSection.questions.push(createdQ);
        questionIndex++;
      }

      exam.sections.push(createdSection);
      sectionIndex++;
    }

    await client.query("COMMIT");

    // trả về cấu trúc exam vừa tạo (id + nested sections/questions/options)
    return exam;

  } catch (err) {
    await client.query("ROLLBACK").catch(e => console.error("rollback error", e));
    throw err;
  } finally {
    client.release();
  }
};

const getExamById = async (examId) => {
  const client = await pool.connect();
  try {
    // Get exam basic info
    const examQuery = `
      SELECT id, teacher_id, title, subject, description, duration_minutes, is_active, created_at, updated_at
      FROM exams
      WHERE id = $1
    `;
    const examRes = await client.query(examQuery, [examId]);
    
    if (examRes.rows.length === 0) {
      return null;
    }
    
    const exam = examRes.rows[0];
    
    // Get sections
    const sectionsQuery = `
      SELECT id, exam_id, title, description, order_index
      FROM exam_sections
      WHERE exam_id = $1
      ORDER BY order_index ASC
    `;
    const sectionsRes = await client.query(sectionsQuery, [examId]);
    exam.sections = sectionsRes.rows;
    
    // Get questions for each section
    for (const section of exam.sections) {
      const questionsQuery = `
        SELECT id, section_id, question_text, question_type, image_url, points, explanation, correct_text_answer, order_index
        FROM questions
        WHERE section_id = $1
        ORDER BY order_index ASC
      `;
      const questionsRes = await client.query(questionsQuery, [section.id]);
      section.questions = questionsRes.rows;
      
      // Get options for each question
      for (const question of section.questions) {
        const optionsQuery = `
          SELECT id, question_id, option_text, is_correct, order_index
          FROM question_options
          WHERE question_id = $1
          ORDER BY order_index ASC
        `;
        const optionsRes = await client.query(optionsQuery, [question.id]);
        question.options = optionsRes.rows;
      }
    }
    
    return exam;
  } finally {
    client.release();
  }
};

const getAllExams = async () => {
  const client = await pool.connect();
  try {
    const examsQuery = `
      SELECT id, teacher_id, title, subject, description, 
             duration_minutes, is_active, created_at, updated_at
      FROM exams
      ORDER BY created_at DESC
    `;
    
    const examsRes = await client.query(examsQuery);
    
    return examsRes.rows;
  } finally {
    client.release();
  }
};

const getExamsByCourseId = async (courseId) => {
  const client = await pool.connect();
  try {
    const examsQuery = `
      SELECT id, teacher_id, title, subject, description, 
             duration_minutes, is_active, course_id, created_at, updated_at
      FROM exams
      WHERE course_id = $1
      ORDER BY created_at DESC
    `;
    
    const examsRes = await client.query(examsQuery, [courseId]);
    
    return examsRes.rows;
  } finally {
    client.release();
  }
};

const getExamAttemptsByTeacher = async (examId, teacherId) => {
  const client = await pool.connect();
  try {
    // 1️⃣ Kiểm tra exam tồn tại và thuộc về giáo viên này
    const examCheck = await client.query(
      `SELECT id, title, teacher_id, subject, description, duration_minutes, course_id FROM exams WHERE id = $1`,
      [examId]
    );

    if (examCheck.rowCount === 0) {
      throw new Error("Bài kiểm tra không tồn tại");
    }

    if (examCheck.rows[0].teacher_id !== teacherId) {
      throw new Error("Bạn không có quyền truy cập bài kiểm tra này");
    }

    const examInfo = examCheck.rows[0];

    // 2️⃣ Lấy danh sách học viên đã làm bài
    const attemptsQuery = `
      SELECT 
        ea.id AS attempt_id,
        ea.user_id AS student_id,
        u.username AS student_name,
        u.email AS student_email,
        u.avatar AS student_avatar,
        ea.started_at,
        ea.completed_at,
        ea.total_score,
        ea.ai_feedback_summary
      FROM exam_attempts ea
      INNER JOIN users u ON ea.user_id = u.id
      WHERE ea.exam_id = $1
      ORDER BY ea.completed_at DESC NULLS LAST, ea.started_at DESC
    `;

    const attemptsRes = await client.query(attemptsQuery, [examId]);

    // 3️⃣ Đếm số học viên đã hoàn thành
    const completedCount = attemptsRes.rows.filter(a => a.completed_at !== null).length;

    return {
      exam: examInfo,
      attempts: attemptsRes.rows,
      total_attempts: attemptsRes.rows.length,
      completed_attempts: completedCount,
      in_progress_attempts: attemptsRes.rows.length - completedCount
    };

  } catch (error) {
    console.error("Get exam attempts error:", error);
    throw error;
  } finally {
    client.release();
  }
};

const getTeacherCoursesWithExams = async (teacherId) => {
  const client = await pool.connect();
  try {
    // 1️⃣ Kiểm tra giáo viên tồn tại
    const teacherCheck = await client.query(
      `SELECT id, username, role FROM users WHERE id = $1`,
      [teacherId]
    );

    if (teacherCheck.rowCount === 0) {
      throw new Error("Giáo viên không tồn tại");
    }

    if (teacherCheck.rows[0].role !== 'teacher') {
      throw new Error("User này không phải là giáo viên");
    }

    // 2️⃣ Lấy tất cả khóa học của giáo viên
    const coursesQuery = `
      SELECT 
        c.id AS course_id,
        c.title AS course_title
      FROM courses c
      WHERE c.teacher_id = $1
      ORDER BY c.created_at DESC
    `;

    const coursesRes = await client.query(coursesQuery, [teacherId]);
    const courses = coursesRes.rows;

    // 3️⃣ Lấy tất cả bài kiểm tra cho từng khóa học
    for (const course of courses) {
      const examsQuery = `
        SELECT 
          e.id AS exam_id,
          e.title AS exam_title,
          e.subject,
          e.description,
          e.duration_minutes,
          e.is_active,
          e.created_at,
          e.updated_at,
          COUNT(DISTINCT ea.id) AS total_attempts
        FROM exams e
        LEFT JOIN exam_attempts ea ON e.id = ea.exam_id
        WHERE e.course_id = $1
        GROUP BY e.id
        ORDER BY e.created_at DESC
      `;

      const examsRes = await client.query(examsQuery, [course.course_id]);
      course.exams = examsRes.rows;
    }

    return {
      teacher: {
        id: teacherCheck.rows[0].id,
        username: teacherCheck.rows[0].username
      },
      courses: courses,
      total_courses: courses.length
    };

  } catch (error) {
    console.error("Get teacher courses with exams error:", error);
    throw error;
  } finally {
    client.release();
  }
};

export default { createExam, getExamById, getAllExams, getExamsByCourseId, getExamAttemptsByTeacher, getTeacherCoursesWithExams };
