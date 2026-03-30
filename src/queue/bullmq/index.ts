import { Queue } from "bullmq";
import type { QueueDriver } from "../../core/index.js";

export class BullMqQueueDriver implements QueueDriver {
  private readonly queue: Queue;

  constructor(name = "dropp", connection = { host: "127.0.0.1", port: 6379 }) {
    this.queue = new Queue(name, { connection });
  }

  async add(job: string, payload: unknown): Promise<void> {
    await this.queue.add(job, payload);
  }
}
