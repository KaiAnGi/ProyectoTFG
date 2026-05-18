import type {
  GameRoom,
  GameChoice,
  GameResult,
  RoundResult,
} from "../types/game-types.ts";

export class GameRooms {
  private rooms: Map<string, GameRoom>;

  constructor() {
    this.rooms = new Map();
  }

  createRoom(
    player1Id: string,
    player1Name: string,
    maxRounds: number = 3,
  ): string {
    const roomId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    this.rooms.set(roomId, {
      roomId,
      player1: {
        id: player1Id,
        name: player1Name,
        roundsWon: 0,
        choice: null,
        cameraReady: false,
      },
      player2: null,
      roundNumber: 1,
      maxRounds,
    });
    return roomId;
  }

  joinRoom(
    roomId: string,
    player2Id: string,
    player2Name: string,
  ): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (room && !room.player2) {
      room.player2 = {
        id: player2Id,
        name: player2Name,
        roundsWon: 0,
        choice: null,
        cameraReady: false,
      };
      return room;
    }
    return null;
  }

  setPlayerChoice(
    roomId: string,
    playerId: string,
    choice: GameChoice,
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (room.player1.id === playerId) {
      room.player1.choice = choice;
    } else if (room.player2 && room.player2.id === playerId) {
      room.player2.choice = choice;
    }

    return true;
  }

  resolveRound(roomId: string): RoundResult | null {
    const room = this.rooms.get(roomId);
    if (!room || !room.player2) return null;

    const player1Choice = room.player1.choice ?? null;
    const player2Choice = room.player2.choice ?? null;
    const result = this.calculateWinner(player1Choice, player2Choice);

    if (result === "player1") {
      room.player1.roundsWon += 1;
    } else if (result === "player2") {
      room.player2.roundsWon += 1;
    }

    const isFinished = room.roundNumber >= room.maxRounds;

    const roundWinnerName =
      result === "player1"
        ? room.player1.name
        : result === "player2"
          ? room.player2.name
          : null;

    return {
      result,
      player1Score: room.player1.roundsWon,
      player2Score: room.player2.roundsWon,
      roundWinner: result,
      roundWinnerName,
      roundNumber: room.roundNumber,
      isFinished,
      player1Choice,
      player2Choice,
    };
  }

  prepareNextRound(roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room || !room.player2) return null;

    room.roundNumber += 1;
    room.player1.choice = null;
    room.player2.choice = null;
    room.player1.cameraReady = false;
    room.player2.cameraReady = false;
    return room;
  }

  private calculateWinner(
    player1Choice: GameChoice | null,
    player2Choice: GameChoice | null,
  ): GameResult {
    if (!player1Choice && !player2Choice) return "tie";
    if (!player1Choice && player2Choice) return "player2";
    if (player1Choice && !player2Choice) return "player1";
    if (!player1Choice || !player2Choice) return "tie";

    if (player1Choice === player2Choice) return "tie";

    if (
      (player1Choice === "rock" && player2Choice === "scissors") ||
      (player1Choice === "paper" && player2Choice === "rock") ||
      (player1Choice === "scissors" && player2Choice === "paper")
    ) {
      return "player1";
    }
    return "player2";
  }

  setCameraReady(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (room.player1.id === playerId) {
      room.player1.cameraReady = true;
    } else if (room.player2 && room.player2.id === playerId) {
      room.player2.cameraReady = true;
    }

    return true;
  }

  setCameraNotReady(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (room.player1.id === playerId) {
      room.player1.cameraReady = false;
    } else if (room.player2 && room.player2.id === playerId) {
      room.player2.cameraReady = false;
    }

    return true;
  }

  isBothCamerasReady(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    return room
      ? room.player1.cameraReady &&
          (room.player2 ? room.player2.cameraReady : false)
      : false;
  }

  getCameraStatus(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return {
        player1CameraReady: false,
        player2CameraReady: false,
        bothReady: false,
      };
    }

    return {
      player1CameraReady: room.player1.cameraReady,
      player2CameraReady: room.player2?.cameraReady ?? false,
      bothReady:
        room.player1.cameraReady && (room.player2?.cameraReady ?? false),
    };
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  findRoomByPlayerSocket(socketId: string): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.player1.id === socketId || room.player2?.id === socketId) {
        return room;
      }
    }
    return undefined;
  }

  getPlayerBetAmount(
    room: GameRoom,
    socketId: string,
  ): { bet: number; playerName: string } | null {
    if (room.player1.id === socketId) {
      return { bet: room.player1BetAmount || 0, playerName: room.player1.name };
    }
    if (room.player2?.id === socketId) {
      return { bet: room.player2BetAmount || 0, playerName: room.player2.name };
    }
    return null;
  }

  cleanupRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }
}
