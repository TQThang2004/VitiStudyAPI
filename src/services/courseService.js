import db from "../config/db.js";

const courseService = {
  // 📌 Lấy danh sách khóa học
  async getAll() {
    const query = `
      SELECT c.*, u.username AS teacher_name, u.avatar AS teacher_avatar
      FROM courses c
      LEFT JOIN users u ON c.teacher_id = u.id
      ORDER BY c.id DESC
    `;
    const result = await db.query(query);
    return result.rows;
  },

  // 📌 Lấy 1 khóa học theo ID
  async getById(id) {
    const query = `
      SELECT c.*, u.username AS teacher_name, u.avatar AS teacher_avatar
      FROM courses c
      LEFT JOIN users u ON c.teacher_id = u.id
      WHERE c.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // 📌 Tạo khóa học mới
  async createCourse(data) {
    const {
      title,
      description,
      price,
      duration,
      level,
      total_lessons,
      thumbnail,
      teacher_id
    } = data;

    const query = `
      INSERT INTO courses 
      (title, description, price, duration, level, total_lessons, thumbnail, teacher_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `;

    const result = await db.query(query, [
      title,
      description,
      price,
      duration,
      level,
      total_lessons,
      thumbnail,
      teacher_id,
    ]);

    return result.rows[0];
  },

  // 📌 Cập nhật khóa học
  async updateCourse(id, data) {
    const {
      title,
      description,
      price,
      duration,
      level,
      total_lessons,
      thumbnail,
      teacher_id
    } = data;

    const query = `
      UPDATE courses 
      SET title=$1, description=$2, price=$3, duration=$4, level=$5, 
          total_lessons=$6, thumbnail=$7, teacher_id=$8
      WHERE id=$9 
      RETURNING *
    `;

    const result = await db.query(query, [
      title,
      description,
      price,
      duration,
      level,
      total_lessons,
      thumbnail,
      teacher_id,
      id
    ]);

    return result.rows[0];
  },

  // 📌 Xóa khóa học
  async deleteCourse(id) {
    const query = `DELETE FROM courses WHERE id=$1 RETURNING *`;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
};

export default courseService;
