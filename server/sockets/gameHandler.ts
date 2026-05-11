import type { Server, Socket } from "socket.io";
import { GameRooms } from "./gameRoom.ts";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "../types/socket-types.ts";
import { RankingService } from "../services/ranking-service.ts";
import User from "../models/User.ts";

const gameRooms = new GameRooms();
const rankingService = new RankingService();
const INITIAL_ROUND_DURATION_SEC = 15;

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
    if (timer.intervalId) clearInterval(timer.intervalId);
    if (timer.timeoutId) clearTimeout(timer.timeoutId);
    roomTimers.delete(roomId);
  };

  const finishTimedRound = async (roomId: string) => {
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
            console.error("Error al actualizar estadísticas del perdedor:", err),
          );

        emitLeaderboardUpdate();
      }

      if (room.betAmount && room.betAmount > 0) {
        try {
          if (winnerName !== "Empate") {
            const loserName =
              winnerName === room.player1.name
                ? room.player2.name
                : room.player1.name;

            await Promise.all([
              User.findOneAndUpdate(
                { username: winnerName },
                { $inc: { bones: room.betAmount } },
              ),
              User.findOneAndUpdate(
                { username: loserName },
                { $inc: { bones: -room.betAmount } },
              ),
            ]);
          }

          io.to(roomId).emit("bet_resolved", {
            winner: winnerName,
            amount: room.betAmount,
          });
        } catch (err) {
          console.error("Error liquidando apuesta:", err);
          io.to(roomId).emit("bet_error", {
            message: "No se pudo resolver la apuesta",
          });
        }
      }

      console.log(`Partida terminada en ${roomId}. Ganador: ${winnerName}`);
      gameRooms.cleanupRoom(roomId);
      clearRoundTimer(roomId);
      return;
    }

    gameRooms.prepareNextRound(roomId);
    setTimeout(() => startTimedRound(roomId), 2000);
  };

  const getRoundDuration = (maxRounds: number, roundNumber: number): number => {
    if (maxRounds === 3) {
      return Math.max(INITIAL_ROUND_DURATION_SEC - (roundNumber - 1) * 5, 5);
    }
    if (maxRounds === 5) {
      return Math.max(INITIAL_ROUND_DURATION_SEC - (roundNumber - 1) * 4, 4);
    }
    if (maxRounds === 9) {
      return Math.max(INITIAL_ROUND_DURATION_SEC - (roundNumber - 1) * 3, 3);
    }
    return INITIAL_ROUND_DURATION_SEC;
  };

  const startTimedRound = (roomId: string) => {
    const room = gameRooms.getRoom(roomId);
    if (!room || !room.player2) return;

    clearRoundTimer(roomId);

    const roundDuration = getRoundDuration(room.maxRounds, room.roundNumber);
    let timeLeftSec = roundDuration;

    io.to(roomId).emit("start_round", {
      roundNumber: room.roundNumber,
      timeLimitSec: roundDuration,
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
    }, roundDuration * 1000);

    roomTimers.set(roomId, { intervalId, timeoutId });
  };

  io.on(
    "connection",
    (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      console.log("Cliente conectado:", socket.id);

      socket.on("create_room", async ({ username, maxRounds = 3 }) => {
        const validMaxRounds = [3, 5, 9].includes(maxRounds) ? maxRounds : 3;
        const roomId = gameRooms.createRoom(socket.id, username, validMaxRounds);
        socket.join(roomId);
        socket.emit("room_created", {
          roomId,
          message: "Sala creada, esperando oponente",
          maxRounds: validMaxRounds,
          playerRole: "player1",
          playerName: username,
          opponentName: null,
        });
        console.log(`Sala creada: ${roomId} por ${username} con ${validMaxRounds} rondas`);
      });

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

      socket.on("camera_ready", ({ roomId }) => {
        gameRooms.setCameraReady(roomId, socket.id);
        emitCameraReadyStatus(roomId);
      });

      socket.on("camera_not_ready", ({ roomId }) => {
        gameRooms.setCameraNotReady(roomId, socket.id);
        emitCameraReadyStatus(roomId);
      });

      socket.on("start_game", ({ roomId }) => {
        const room = gameRooms.getRoom(roomId);
        if (!room || !room.player2) {
          socket.emit("error", { message: "La sala no está completa" });
          return;
        }

        if (!gameRooms.isBothCamerasReady(roomId)) {
          socket.emit("error", {
            message: "Ambos jugadores deben estar ready para iniciar",
          });
          return;
        }

        if (!room.betAmount || !room.player1BetConfirmed || !room.player2BetConfirmed) {
          socket.emit("bet_error", {
            message: "Ambos jugadores deben confirmar la apuesta antes de iniciar",
          });
          return;
        }

        startTimedRound(roomId);
      });

      socket.on("set_bet", async ({ roomId, amount }) => {
        const room = gameRooms.getRoom(roomId);
        if (!room) {
          socket.emit("bet_error", { message: "Sala no encontrada" });
          return;
        }

        if (!room.player2) {
          socket.emit("bet_error", { message: "Aún no hay oponente en la sala" });
          return;
        }

        const normalizedAmount = Math.floor(Number(amount));
        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
          socket.emit("bet_error", { message: "La apuesta debe ser mayor que 0" });
          return;
        }

        const isPlayer1 = socket.id === room.player1.id;
        const isPlayer2 = socket.id === room.player2.id;

        if (!isPlayer1 && !isPlayer2) {
          socket.emit("bet_error", { message: "Jugador no válido en la sala" });
          return;
        }

        const playerName = isPlayer1 ? room.player1.name : room.player2.name;

        const user = await User.findOne({ username: playerName });
        if (!user || (user.bones ?? 0) < normalizedAmount) {
          socket.emit("bet_error", { message: "No tienes suficientes bones" });
          return;
        }

        if (!room.betAmount) {
          room.betAmount = normalizedAmount;
        } else if (room.betAmount !== normalizedAmount) {
          socket.emit("bet_error", {
            message: `La apuesta debe ser ${room.betAmount} bones (igual a la del oponente)`,
          });
          return;
        }

        if (isPlayer1) {
          if (room.player1BetConfirmed) {
            socket.emit("bet_error", { message: "Ya confirmaste tu apuesta" });
            return;
          }
          room.player1BetConfirmed = true;
        } else {
          if (room.player2BetConfirmed) {
            socket.emit("bet_error", { message: "Ya confirmaste tu apuesta" });
            return;
          }
          room.player2BetConfirmed = true;
        }

        io.to(roomId).emit("bet_updated", {
          betAmount: room.betAmount,
          player1Confirmed: !!room.player1BetConfirmed,
          player2Confirmed: !!room.player2BetConfirmed,
        });
      });

      socket.on("disconnect", () => {
        console.log("Cliente desconectado:", socket.id);

        const roomId = gameRooms.getRoomIdBySocketId(socket.id);
        if (roomId) {
          io.to(roomId).emit("opponent_left", {
            message: "Tu oponente ha abandonado la partida",
          });
          clearRoundTimer(roomId);
          gameRooms.cleanupRoom(roomId);
        }
      });
    },
  );
}