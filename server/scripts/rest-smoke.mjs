const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const fetchFn = globalThis.fetch
  ? globalThis.fetch.bind(globalThis)
  : (await import("node-fetch")).default;
const playerName = `smoke_${Date.now()}`;

/*
  Smoke test REST del backend.

  Qué valida:
  - Disponibilidad del servidor (`GET /health`).
  - Escritura básica en ranking (`POST /api/ranking/update`).
  - Lectura del jugador recién actualizado (`GET /api/ranking/:playerName`).
  - Lectura del listado de ranking con límite (`GET /api/ranking?limit=5`).

  Cómo funciona:
  1) Genera un `playerName` único con timestamp para no colisionar datos.
  2) Ejecuta peticiones secuenciales y corta en cuanto una falle.
  3) `assertOk` centraliza validación HTTP: si status no es 2xx, devuelve error
    con status y cuerpo de respuesta para facilitar diagnóstico.
  4) Además del status, valida estructura mínima de JSON esperado en cada
    endpoint (por ejemplo, existencia de `player` o array de ranking).
  5) Si todo pasa, termina con código 0; si algo falla, imprime el error y sale
    con código 1.

  Criterio de éxito:
  - Todas las llamadas completan con respuestas válidas y coherentes.
*/

async function assertOk(res, label) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${label} failed: ${res.status} ${text}`);
  }
  return res;
}

async function main() {
  console.log("REST smoke test starting...");

  await assertOk(await fetchFn(`${baseUrl}/health`), "GET /health");
  console.log("- /health ok");

  const updateRes = await assertOk(
    await fetchFn(`${baseUrl}/api/ranking/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName, won: true }),
    }),
    "POST /api/ranking/update",
  );
  const updateJson = await updateRes.json();
  if (!updateJson || !updateJson.player) {
    throw new Error("/api/ranking/update unexpected response");
  }
  console.log("- /api/ranking/update ok");

  const playerRes = await assertOk(
    await fetchFn(`${baseUrl}/api/ranking/${encodeURIComponent(playerName)}`),
    "GET /api/ranking/:playerName",
  );
  const playerJson = await playerRes.json();
  if (!playerJson || playerJson.playerName !== playerName) {
    throw new Error("/api/ranking/:playerName unexpected response");
  }
  console.log("- /api/ranking/:playerName ok");

  const rankingRes = await assertOk(
    await fetchFn(`${baseUrl}/api/ranking?limit=5`),
    "GET /api/ranking?limit=5",
  );
  const rankingJson = await rankingRes.json();
  if (!Array.isArray(rankingJson)) {
    throw new Error("/api/ranking?limit=5 unexpected response");
  }
  console.log("- /api/ranking ok");

  console.log("REST smoke test passed.");
}

main().catch((err) => {
  console.error("REST smoke test failed:", err.message);
  process.exit(1);
});
