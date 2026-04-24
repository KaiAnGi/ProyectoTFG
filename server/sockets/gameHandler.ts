import type { Server, Socket } from "socket.io";
import { GameRooms } from "./gameRoom.ts";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "../types/socket-types.ts";
import { RankingService } from "../services/ranking-service.ts";

const gameRooms = new GameRooms();
const rankingService = new RankingService();
const ROUND_DURATION_SEC = 5;

type RoomTimer = {
  intervalId?: NodeJS.Timeout;
  timeoutId?: NodeJS.Timeout;
};

const roomTimers = new Map<string, RoomTimer>();

export function setupGameHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
) {
  const emitLeaderboardUpdate = async () => {
    try {
      const top = await rankingService.getTopRanking(50);
      io.emit("leaderboard:update", top);
    } catch (error) {
      console.error("Error emitiendo leaderboard:update:", error);
    }
  };

  const clearRoundTimer = (roomId: string) => {
    const timer = roomTimers.get(roomId);
    if (!timer) return;

    if (timer.intervalId) {
      clearInterval(timer.intervalId);
    }

    if (timer.timeoutId) {
      clearTimeout(timer.timeoutId);
    }

    roomTimers.delete(roomId);
  };

  const finishTimedRound = (roomId: string) => {
    clearRoundTimer(roomId);

    const roundResult = gameRooms.resolveRound(roomId);
    const room = gameRooms.getRoom(roomId);

    if (!roundResult || !room || !room.player2) {
      return;
    }

    io.to(roomId).emit("round_result", {
      playerChoice: roundResult.player1Choice,
      opponentChoice: roundResult.player2Choice,
      result: roundResult.result,
      roundWinner: roundResult.roundWinner,
      roundWinnerName: roundResult.roundWinnerName,
      playerScore: roundResult.player1Score,
      opponentScore: roundResult.player2Score,
      roundNumber: roundResult.roundNumber,
      isFinished: roundResult.isFinished,
    });

    if (roundResult.isFinished) {
      const player1Score = room.player1.roundsWon;
      const player2Score = room.player2.roundsWon;

      let winnerName = "Empate";
      if (player1Score > player2Score) {
        winnerName = room.player1.name;
      } else if (player2Score > player1Score) {
        winnerName = room.player2.name;
      }

      io.to(roomId).emit("match_finished", {
        winner: winnerName,
        finalScore: { player1: player1Score, player2: player2Score },
      });

      if (winnerName !== "Empate") {
        const winner =
          winnerName === room.player1.name ? room.player1 : room.player2;
        const loser =
          winner.id === room.player1.id ? room.player2 : room.player1;

        rankingService
          .updatePlayerStats(winner.name, true)
          .catch((err) =>
            console.error("Error al actualizar estadísticas del ganador:", err),
          );
        rankingService
          .updatePlayerStats(loser.name, false)
          .catch((err) =>
            console.error(
              "Error al actualizar estadísticas del perdedor:",
              err,
            ),
          );

        emitLeaderboardUpdate();
      }

      console.log(`Partida terminada en ${roomId}. Ganador: ${winnerName}`);
      gameRooms.cleanupRoom(roomId);
      clearRoundTimer(roomId);
      return;
    }

    gameRooms.prepareNextRound(roomId);
    setTimeout(() => startTimedRound(roomId), 2000);
  };

  const startTimedRound = (roomId: string) => {
    const room = gameRooms.getRoom(roomId);
    if (!room || !room.player2) {
      return;
    }

    clearRoundTimer(roomId);

    let timeLeftSec = ROUND_DURATION_SEC;

    io.to(roomId).emit("start_round", {
      roundNumber: room.roundNumber,
      timeLimitSec: ROUND_DURATION_SEC,
    });
    io.to(roomId).emit("round_timer", { timeLeftSec });

    const intervalId = setInterval(() => {
      timeLeftSec -= 1;
      if (timeLeftSec > 0) {
        io.to(roomId).emit("round_timer", { timeLeftSec });
      }
    }, 1000);

    const timeoutId = setTimeout(() => {
      finishTimedRound(roomId);
    }, ROUND_DURATION_SEC * 1000);

    roomTimers.set(roomId, { intervalId, timeoutId });
  };

  io.on(
    "connection",
    (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      console.log("Cliente conectado:", socket.id);

      // Crear sala
      socket.on("create_room", async ({ username, maxRounds = 3 }) => {
        // Validate maxRounds
        const validMaxRounds = [3, 5, 9].includes(maxRounds) ? maxRounds : 3;
        const roomId = gameRooms.createRoom(
          socket.id,
          username,
          validMaxRounds,
        );
        socket.join(roomId);
        socket.emit("room_created", {
          roomId,
          message: "Sala creada, esperando oponente",
          maxRounds: validMaxRounds,
          playerRole: "player1",
          playerName: username,
          opponentName: null,
        });
        console.log(
          `Sala creada: ${roomId} por ${username} con ${validMaxRounds} rondas`,
        );
      });

      // Unirse a sala
      const emitCameraReadyStatus = (roomId: string) => {
        const status = gameRooms.getCameraStatus(roomId);
        io.to(roomId).emit("camera_ready_status", status);
      };

      socket.on("join_room", async ({ roomId, username }) => {
        const room = gameRooms.joinRoom(roomId, socket.id, username);
        if (room && room.player2) {
          socket.join(roomId);
          socket.emit("room_joined", {
            roomId,
            maxRounds: room.maxRounds,
            playerRole: "player2",
            playerName: username,
            opponentName: room.player1.name,
          });
          socket.to(roomId).emit("room_joined", {
            roomId,
            maxRounds: room.maxRounds,
            playerRole: "player1",
            playerName: room.player1.name,
            opponentName: username,
          });
          emitCameraReadyStatus(roomId);
          console.log(`${username} se unió a sala ${roomId}`);
        } else {
          socket.emit("error", { message: "Sala llena o no existe" });
        }
      });

      // Elección del jugador
      socket.on("player_choice", ({ roomId, choice }) => {
        const room = gameRooms.getRoom(roomId);
        if (!room) {
          socket.emit("error", { message: "Sala no encontrada" });
          return;
        }

        if (!room.player2) {
          socket.emit("error", { message: "Aún no hay oponente en la sala" });
          return;
        }

        gameRooms.setPlayerChoice(roomId, socket.id, choice);
      });

      // Cámara lista
      socket.on("camera_ready", ({ roomId }) => {
        gameRooms.setCameraReady(roomId, socket.id);
        emitCameraReadyStatus(roomId);
      });

      socket.on("camera_not_ready", ({ roomId }) => {
        gameRooms.setCameraNotReady(roomId, socket.id);
        emitCameraReadyStatus(roomId);
      });

      socket.on("start_game", ({ roomId }) => {
        if (!gameRooms.isBothCamerasReady(roomId)) {
          socket.emit("error", {
            message: "Ambos jugadores deben estar ready para iniciar",
          });
          return;
        }
        startTimedRound(roomId);
      });

      socket.on("disconnect", () => {
        console.log("Cliente desconectado:", socket.id);
      });
    },
  );
}
