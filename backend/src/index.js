import dns from "node:dns";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { startWorker } from "./jobs/queue.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = createApp();

await connectDb();
startWorker();

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  console.log(`QR codes will point to ${env.frontendBaseUrl}/verify/<studentId>`);
});
