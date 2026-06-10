import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.js";
import { agentsRouter } from "./routes/agents.js";
import { faqsRouter } from "./routes/faqs.js";
import { widgetsRouter } from "./routes/widgets.js";
import { chatRouter } from "./routes/chat.js";
import { crawlRouter } from "./routes/crawl.js";

const app = express();

// Global middleware
app.use(helmet());
app.use(
  cors({
    origin: [env.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "own-lovi-backend", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/agents", agentsRouter);
app.use("/api", faqsRouter);
app.use("/api", widgetsRouter);
app.use("/api/widget", chatRouter);
app.use("/api", crawlRouter);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(env.PORT, () => {
  console.log(`Own Lovi Backend running on port ${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

export default app;
