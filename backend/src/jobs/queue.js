import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env.js";
import { processGenerationJob } from "../services/generationJob.js";

let queue = null;
let worker = null;

function redisConnection() {
  return new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
}

export function jobsEnabled() {
  return Boolean(env.redisUrl);
}

export function getQueue() {
  if (!jobsEnabled()) return null;
  if (!queue) {
    queue = new Queue("certificate-generation", { connection: redisConnection() });
  }
  return queue;
}

export function startWorker() {
  if (!jobsEnabled() || worker) return;
  worker = new Worker(
    "certificate-generation",
    async (job) => {
      await processGenerationJob(job.data.jobId);
    },
    { connection: redisConnection(), concurrency: 1 }
  );
  worker.on("failed", (job, err) => {
    console.error("Certificate job failed", job?.id, err);
  });
}

export async function enqueueGeneration(jobId) {
  const q = getQueue();
  if (q) {
    await q.add("generate", { jobId }, { removeOnComplete: 50, removeOnFail: 100 });
    return "queued";
  }
  setImmediate(() => {
    processGenerationJob(jobId).catch((err) => console.error(err));
  });
  return "inline";
}
