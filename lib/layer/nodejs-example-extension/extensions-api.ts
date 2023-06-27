import { basename } from "path";

const baseUrl = `http://${process.env.AWS_LAMBDA_RUNTIME_API}/2020-01-01/extension`;

export async function register() {
  const res = await fetch(`${baseUrl}/register`, {
    method: "post",
    body: JSON.stringify({
      events: ["INVOKE", "SHUTDOWN"],
    }),
    headers: {
      "Content-Type": "application/json",
      "Lambda-Extension-Name": basename(__dirname),
    },
  });

  if (!res.ok) {
    console.error("register failed", await res.text());
  }

  const extensionId = res.headers.get("lambda-extension-identifier");
  if (!extensionId) {
    throw new Error("extensionId is undefined");
  }
  return extensionId;
}

export async function next(extensionId: string) {
  console.info("[extensions-api:next] Waiting for next event");
  const res = await fetch(`${baseUrl}/event/next`, {
    method: "get",
    headers: {
      "Content-Type": "application/json",
      "Lambda-Extension-Identifier": extensionId,
    },
  });

  if (!res.ok) {
    console.error("next failed", await res.text());
    return null;
  }

  const event = await res.json();
  console.info("[extensions-api:next] Next event received");
  return event;
}
