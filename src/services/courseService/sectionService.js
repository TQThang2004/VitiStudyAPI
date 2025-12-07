import db from "../../config/db.js";

const sectionService = {
  // Lấy tất cả section + lesson theo course_id
  async getByCourseId(courseId) {
    const sectionsQuery = `
      SELECT id, title 
      FROM sections
      WHERE course_id = $1
      ORDER BY id ASC
    `;
    const sectionsRes = await db.query(sectionsQuery, [courseId]);

    const lessonsQuery = `
      SELECT id, section_id, title, type, duration, video_url, document_url
      FROM lessons
      WHERE section_id IN (SELECT id FROM sections WHERE course_id = $1)
      ORDER BY id ASC
    `;
    const lessonsRes = await db.query(lessonsQuery, [courseId]);

    // Gộp section + lessons
    return sectionsRes.rows.map((sec) => ({
      ...sec,
      lessons: lessonsRes.rows.filter((l) => l.section_id === sec.id),
    }));
  },

  async createSection(courseId, title) {
    const query = `
      INSERT INTO sections (course_id, title)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await db.query(query, [courseId, title]);
    return result.rows[0];
  },

  async deleteSection(sectionId) {
    const query = `
      DELETE FROM sections
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [sectionId]);
    return result.rows[0];
  },
};

export default sectionService;
