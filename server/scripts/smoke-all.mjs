import { spawn } from "node:child_process";

const baseUrl = process.env.BASE_URL;

/*
  Orquestador de smoke tests (REST + sockets).

  Qué hace:
  - Lanza en secuencia `scripts/rest-smoke.mjs` y `scripts/socket-smoke.mjs`.
  - Propaga `BASE_URL` al entorno de los procesos hijos si está definida.
  - Unifica resultado final del pipeline de comprobación rápida.

  Cómo funciona:
  1) `runNodeScript` crea un proceso hijo con `spawn` usando el mismo binario de
    Node (`process.execPath`) y hereda `stdio` para ver logs en tiempo real.
  2) Si un script hijo sale con código distinto de 0, se rechaza la promesa y
    se detiene la ejecución del resto.
  3) `main` ejecuta primero REST (precondiciones API) y después sockets
    (flujo de juego en tiempo real).
  4) Si ambos finalizan bien, devuelve código 0; ante cualquier error, código 1.

  Criterio de éxito:
  - Ambos smoke tests individuales pasan sin fallos.
*/

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
  await runNodeScript("server/scripts/rest-smoke.mjs");
  await runNodeScript("server/scripts/socket-smoke.mjs");
  console.log("Smoke test (REST + sockets) passed.");
}

main().catch((err) => {
  console.error("Smoke test (REST + sockets) failed:", err.message);
  process.exit(1);
});
