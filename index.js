import express from "express";
import multer from "multer";
import os from "os";
import path from "path";
import { mkdir, unlink } from "fs/promises";
import { createJob, getJob, markCompleted, markFailed, cleanupOldJobs } from "./jobStore.js";
import { transcribeWithGemini } from "./geminiClient.js";

const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const PROMPT =
  process.env.GEMINI_TRANSCRIBE_PROMPT ||
  "请将这段会议音频转写为完整的中文文本";
const TMP_DIR =
  process.env.UPLOAD_TMP_DIR || path.join(os.tmpdir(), "gemini-audio-uploads");
const JOB_TTL_HOURS = Number(process.env.JOB_TTL_HOURS || 24);

const app = express();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TMP_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    cb(null, `${unique}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    files: 1,
  },
});

app.get("/ping", (req, res) => {
  res.status(200).json({ status: "alive" });
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Missing audio file" });
    return;
  }

  const { jobId } = createJob({
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    localPath: req.file.path,
  });

  res.status(200).json({
    jobId,
    status: "processing",
  });

  setImmediate(() => {
    processJob({
      jobId,
      filePath: req.file.path,
      mimeType: req.file.mimetype || "audio/m4a",
    });
  });
});

app.get("/api/status", (req, res) => {
  const jobId = req.query.jobId;
  if (typeof jobId !== "string" || !jobId) {
    res.status(400).json({ error: "jobId is required" });
    return;
  }

  const job = getJob(jobId);
  if (!job) {
    res.status(404).json({ error: "jobId not found" });
    return;
  }

  const payload = {
    jobId,
    status: job.status,
  };

  if (job.status === "completed") {
    payload.result = job.result;
  }
  if (job.status === "failed") {
    payload.error = job.error;
  }

  res.status(200).json(payload);
});

async function processJob({ jobId, filePath, mimeType }) {
  try {
    const { text } = await transcribeWithGemini({
      filePath,
      mimeType,
      prompt: PROMPT,
      model: MODEL,
    });
    markCompleted(jobId, text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    markFailed(jobId, message);
  } finally {
    try {
      await unlink(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("Failed to delete temp file", { filePath, message });
    }
  }
}

async function start() {
  await mkdir(TMP_DIR, { recursive: true });

  if (JOB_TTL_HOURS > 0) {
    const ttlMs = JOB_TTL_HOURS * 60 * 60 * 1000;
    setInterval(() => cleanupOldJobs({ maxAgeMs: ttlMs }), ttlMs);
  }

  app.listen(PORT, () => {
    console.log(`Gemini backend listening on :${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
