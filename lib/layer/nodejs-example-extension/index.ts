#!/usr/bin/env node
import { register, next } from "./extensions-api";
import { listen } from "./http-listener";
import * as telemetryApi from "./telemetry-api";

const EventType = {
  INVOKE: "INVOKE",
  SHUTDOWN: "SHUTDOWN",
};

function handleShutdown(event: any) {
  console.log("shutdown", { event });
  process.exit(0);
}

function handleInvoke(event: any) {
  console.log("invoke");
}

const LOCAL_DEBUGGING_IP = "0.0.0.0";
const RECEIVER_NAME = "sandbox";

async function receiverAddress() {
  return process.env.AWS_SAM_LOCAL === "true"
    ? LOCAL_DEBUGGING_IP
    : RECEIVER_NAME;
}

const LOG_RECEIVER_URL = process.env.LOG_RECEIVER_URL;
if (!LOG_RECEIVER_URL) {
  throw new Error("LOG_RECEIVER_URL env var is not set");
}

// Subscribe to platform logs and receive them on ${local_ip}:4243 via HTTP protocol.
const RECEIVER_PORT = 4243;

async function main() {
  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));

  console.log("register");
  const extensionId = await register();
  console.log("extensionId", extensionId);

  console.log("starting listener");
  // listen returns `logsQueue`, a mutable array that collects logs received from Logs API
  const { logsQueue, server } = listen(
    await receiverAddress(),
    RECEIVER_PORT.toString()
  );

  console.log("subscribing listener");
  // subscribing listener to the Telemetry API
  await telemetryApi.subscribe(
    extensionId,
    `http://${RECEIVER_NAME}:${RECEIVER_PORT}`
  );

  // function for processing collected logs
  async function uploadLogs() {
    console.log(`uploading logs (${logsQueue.length})`);
    while (logsQueue.length > 0) {
      console.log(`collected ${logsQueue.length} log objects`);
      console.log(JSON.stringify(logsQueue));

      if (!LOG_RECEIVER_URL) {
        throw new Error("LOG_RECEIVER_URL env var is not set");
      }
      console.log("sending logs to", LOG_RECEIVER_URL);
      await fetch(LOG_RECEIVER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ logs: logsQueue }),
      });

      logsQueue.length = 0; // clear log queue
    }
  }

  // execute extensions logic
  while (true) {
    // This is a blocking action
    const event = await next(extensionId);
    console.log("event", event);
    switch (event.eventType) {
      case EventType.SHUTDOWN:
        // Wait for 1 sec to receive remaining events
        await new Promise((resolve, reject) => {
          setTimeout(resolve, 1000);
        });

        await uploadLogs(); // upload remaining logs, during shutdown event
        handleShutdown(event);
        break;
      case EventType.INVOKE:
        handleInvoke(event);
        await uploadLogs(); // upload queued logs, during invoke event
        break;
      default:
        throw new Error("unknown event: " + event.eventType);
    }
  }
}

void main();
