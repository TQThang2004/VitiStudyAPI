import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/AuthRouter.js";
import courseRoutes from "./src/routes/courseRoutes.js";
import sectionsRouter from "./src/routes/sectionRoutes.js";
import lessonsRouter from "./src/routes/lessonRoutes.js";
import examRoutes from "./src/routes/ExamRouter.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/sections", sectionsRouter);
app.use("/api/lessons", lessonsRouter);
app.use("/api/exams", examRoutes);

app.get("/", (req, res) => res.send("E-learning API with PostgreSQL"));

export default app;
