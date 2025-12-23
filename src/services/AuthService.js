import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_AVATAR = "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png";

const register = async ({ username, email, password, role }) => {
  const checkUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  if (checkUser.rows.length > 0) throw new Error("Email đã được sử dụng");

  const hashed = await bcrypt.hash(password, 10);
  const result = await pool.query(
    "INSERT INTO users (username, email, password, role, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, avatar",
    [username, email, hashed, role, DEFAULT_AVATAR]
  );

  return result.rows[0];
};

const login = async ({ email, password }) => {
  const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  if (user.rows.length === 0) throw new Error("Email không tồn tại");

  const isMatch = await bcrypt.compare(password, user.rows[0].password);
  if (!isMatch) throw new Error("Password không đúng");

  const token = jwt.sign(
    {
      id: user.rows[0].id,
      username: user.rows[0].username,
      email: user.rows[0].email,
      role: user.rows[0].role
    },
    process.env.JWT_SECRET,
    { expiresIn: "100d" }
  );

  return {
    token,
    user: {
      id: user.rows[0].id,
      username: user.rows[0].username,
      email: user.rows[0].email,
      role: user.rows[0].role,
    },
  };
};

const updateUser = async (userId, { username, email, avatar, phone_number }) => {
  // Check if user exists
  const checkUser = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
  if (checkUser.rows.length === 0) throw new Error("User không tồn tại");

  // Check if email is being changed and already exists
  if (email && email !== checkUser.rows[0].email) {
    const emailExists = await pool.query("SELECT * FROM users WHERE email = $1 AND id != $2", [email, userId]);
    if (emailExists.rows.length > 0) throw new Error("Email đã được sử dụng");
  }

  // Build dynamic update query
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (username) {
    updates.push(`username = $${paramIndex++}`);
    values.push(username);
  }

  if (email) {
    updates.push(`email = $${paramIndex++}`);
    values.push(email);
  }

  if (phone_number) {
    updates.push(`phone_number = $${paramIndex++}`);
    values.push(phone_number);
  }

  if (avatar) {
    updates.push(`avatar = $${paramIndex++}`);
    values.push(avatar);
  }

  if (updates.length === 0) {
    throw new Error("No fields to update");
  }

  values.push(userId);
  const query = `UPDATE users SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING id, username, email, phone_number, role, avatar, created_at, updated_at`;

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getUserById = async (userId) => {
  const result = await pool.query(
    "SELECT id, username, email, phone_number, role, avatar, created_at, updated_at FROM users WHERE id = $1",
    [userId]
  );
  
  if (result.rows.length === 0) throw new Error("User không tồn tại");
  return result.rows[0];
};

const getAllUsers = async () => {
  const result = await pool.query(
    "SELECT id, username, email, phone_number, role, avatar, created_at, updated_at FROM users WHERE role IN ('teacher', 'student') ORDER BY created_at DESC"
  );
  return result.rows;
};
                    
export default { register, login, updateUser, getUserById, getAllUsers };
