const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const fetchFn = globalThis.fetch
  ? globalThis.fetch.bind(globalThis)
  : (await import("node-fetch")).default;
const playerName = `smoke_${Date.now()}`;

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
