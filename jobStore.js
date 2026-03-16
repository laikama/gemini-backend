import crypto from "crypto";

const jobs = new Map();

function nowIso() {
  return new Date().toISOString();
}

export function createJob({ originalName, mimeType, size, localPath }) {
  const jobId = `task_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const job = {
    status: "processing",
    result: null,
    error: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    file: {
      originalName,
      mimeType,
      size,
      localPath,
    },
  };
  jobs.set(jobId, job);
  return { jobId, job };
}

export function getJob(jobId) {
  return jobs.get(jobId) || null;
}

export function markCompleted(jobId, result) {
  const job = jobs.get(jobId);
  if (!job) return null;
  job.status = "completed";
  job.result = result;
  job.updatedAt = nowIso();
  return job;
}

export function markFailed(jobId, errorMessage) {
  const job = jobs.get(jobId);
  if (!job) return null;
  job.status = "failed";
  job.error = errorMessage;
  job.updatedAt = nowIso();
  return job;
}

export function setProcessing(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;
  job.status = "processing";
  job.updatedAt = nowIso();
  return job;
}

export function cleanupOldJobs({ maxAgeMs }) {
  const cutoff = Date.now() - maxAgeMs;
  for (const [jobId, job] of jobs.entries()) {
    const createdAt = Date.parse(job.createdAt);
    if (!Number.isNaN(createdAt) && createdAt < cutoff) {
      jobs.delete(jobId);
    }
  }
}

export function jobStats() {
  return {
    total: jobs.size,
  };
}
