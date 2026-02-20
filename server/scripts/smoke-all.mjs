import { spawn } from "node:child_process";

const baseUrl = process.env.BASE_URL;

function runNodeScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    if (baseUrl) {
      env.BASE_URL = baseUrl;
    }

    const child = spawn(process.execPath, [scriptPath], {
      stdio: "inherit",
      env,
    });

    child.on("error", (err) => reject(err));
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptPath} failed with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log("Smoke test (REST + sockets) starting...");
  await runNodeScript("scripts/rest-smoke.mjs");
  await runNodeScript("scripts/socket-smoke.mjs");
  console.log("Smoke test (REST + sockets) passed.");
}

main().catch((err) => {
  console.error("Smoke test (REST + sockets) failed:", err.message);
  process.exit(1);
});
