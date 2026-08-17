import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export interface DesktopAuthResult {
  token: string;
  discordId: string;
}

export interface DesktopAuthListener {
  redirectUri: string;
  waitForCallback(timeoutMs?: number): Promise<DesktopAuthResult>;
}

export async function startDesktopAuthListener(): Promise<DesktopAuthListener> {
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    if (requestUrl.pathname !== "/auth/callback") {
      response.statusCode = 404;
      response.end("not found");
      return;
    }

    const token = requestUrl.searchParams.get("token");
    const discordId = requestUrl.searchParams.get("discordId");

    response.statusCode = 200;
    response.setHeader("content-type", "text/plain; charset=utf-8");
    response.end("Discord sign-in complete. You can close this tab.");

    if (token !== null && discordId !== null) {
      void server.emit("auth:success", { token, discordId });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Could not allocate a loopback callback port for Discord sign-in");
  }

  const redirectUri = `http://127.0.0.1:${(address as AddressInfo).port}/auth/callback`;

  const waitForCallback = (timeoutMs = 300_000): Promise<DesktopAuthResult> =>
    new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        server.removeListener("auth:success", onSuccess);
        server.removeListener("error", onError);
        server.close(() => undefined);
      };

      const onSuccess = (result: DesktopAuthResult) => {
        cleanup();
        resolve(result);
      };

      const onError = (error: unknown) => {
        cleanup();
        reject(error);
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Timed out waiting for Discord sign-in"));
      }, timeoutMs);

      server.once("auth:success", onSuccess);
      server.once("error", onError);
    });

  return { redirectUri, waitForCallback };
}
