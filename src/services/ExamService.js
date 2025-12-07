import pool from "../config/db.js";

const createExam = async (payload) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Insert exam (add teacher_id)
    const insertExamText = `
      INSERT INTO exams (teacher_id, title, subject, description, duration_minutes, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, teacher_id, title, subject, description, duration_minutes, is_active, created_at, updated_at
    `;
    const examValues = [
      payload.teacher_id, // new: teacher_id
      payload.title,
      payload.subject || null,
      payload.description || null,
      payload.duration_minutes || null,
      payload.is_active ? true : false
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

export default { createExam, getExamById };
