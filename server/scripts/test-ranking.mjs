import fetch from "node-fetch";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

/*
  Test para verificar que las victorias se guardan correctamente en la BD.
  
  Qué valida:
  - Las victorias de partida se incrementan en la BD cuando un jugador gana.
  - Las derrotas no eliminan las victorias previas (a diferencia del sistema anterior).
  - El ranking se ordena correctamente por matchVictories.
*/

async function testRankingEndpoint() {
  console.log("\n=== TEST RANKING ENDPOINT ===\n");

  try {
    // Obtener ranking inicial
    console.log("Obteniendo ranking inicial...");
    const initialRanking = await fetch(
      `${baseUrl}/api/ranking?limit=10`
    ).then((res) => res.json());
    console.log("Ranking inicial:", initialRanking);

    // Simular actualización de jugador ganador
    console.log("\nActualizando jugador 'TestWinner' con victoria...");
    const winUpdate = await fetch(`${baseUrl}/api/ranking/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "TestWinner",
        won: true,
      }),
    }).then((res) => res.json());
    console.log("Winner update result:", winUpdate);

    if (!winUpdate.success || !winUpdate.player) {
      console.error("FALLA: No se pudo actualizar al ganador", winUpdate);
      process.exit(1);
    }

    // Verificar que matchVictories se incrementó
    const expectedVictories = Math.max(1, (initialRanking.find((p) => p.playerName === "TestWinner")?.matchVictories || 0) + 1);
    if (winUpdate.player.matchVictories !== expectedVictories) {
      console.error(
        `FALLA: matchVictories esperado ${expectedVictories}, obtuvo ${winUpdate.player.matchVictories}`
      );
      process.exit(1);
    }
    console.log("✓ Victoria registrada correctamente");

    // Simular derrota del mismo jugador
    console.log("\nActualizando mismo jugador con derrota...");
    const loseUpdate = await fetch(`${baseUrl}/api/ranking/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "TestWinner",
        won: false,
      }),
    }).then((res) => res.json());
    console.log("Lose update result:", loseUpdate);

    // Verificar que matchVictories NO se resetea (a diferencia del sistema anterior)
    if (loseUpdate.player.matchVictories !== expectedVictories) {
      console.error(
        `FALLA: matchVictories debería mantenerse en ${expectedVictories}, pero obtuvo ${loseUpdate.player.matchVictories}`
      );
      process.exit(1);
    }
    console.log("✓ Derrota procesada sin resetear victorias");

    // Obtener ranking final
    console.log("\nObteniendo ranking final...");
    const finalRanking = await fetch(
      `${baseUrl}/api/ranking?limit=10`
    ).then((res) => res.json());
    console.log("Ranking final:", finalRanking);

    // Verificar que el ranking está ordenado por matchVictories (descendente)
    for (let i = 0; i < finalRanking.length - 1; i++) {
      if (finalRanking[i].matchVictories < finalRanking[i + 1].matchVictories) {
        console.error(
          `FALLA: Ranking no está ordenado correctamente en posiciones ${i} y ${i + 1}`
        );
        process.exit(1);
      }
    }
    console.log("✓ Ranking ordenado correctamente por matchVictories");

    // Obtener estadísticas de un jugador específico
    console.log("\nObteniendo estadísticas de TestWinner...");
    const playerStats = await fetch(
      `${baseUrl}/api/ranking/player/TestWinner`
    ).then((res) => res.json());
    console.log("Player stats:", playerStats);

    if (!playerStats.playerName || playerStats.playerName !== "TestWinner") {
      console.error("FALLA: No se encontraron estadísticas del jugador", playerStats);
      process.exit(1);
    }
    console.log("✓ Estadísticas del jugador recuperadas correctamente");

    console.log("\n=== ✓ TODOS LOS TESTS PASARON ===\n");
    process.exit(0);
  } catch (error) {
    console.error("ERROR:", error);
    process.exit(1);
  }
}

// Esperar un poco para asegurar que el servidor está listo
setTimeout(testRankingEndpoint, 1000);
