import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/AuthRouter.js";
import examRoutes from "./src/routes/ExamRouter.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);

app.get("/", (req, res) => res.send("E-learning API with PostgreSQL"));

export default app;
