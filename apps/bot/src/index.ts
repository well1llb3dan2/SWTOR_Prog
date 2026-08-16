import { startBot } from "./bot.js";
import { loadConfig } from "./config.js";

void (async () => {
  const stop = await startBot(loadConfig());

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void stop().then(() => process.exit(0));
    });
  }
})();
