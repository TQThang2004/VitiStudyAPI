import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const register = async ({ username, email, password, role }) => {
  const checkUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  if (checkUser.rows.length > 0) throw new Error("Email already exists");

  const hashed = await bcrypt.hash(password, 10);
  const result = await pool.query(
    "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role",
    [username, email, hashed, role]
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
                    
export default { register, login };
