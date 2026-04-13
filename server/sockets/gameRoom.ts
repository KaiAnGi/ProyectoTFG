import type { GameRoom, GameChoice, GameResult, RoundResult } from '../types/game-types.ts';

export class GameRooms {
  private rooms: Map<string, GameRoom>;

  constructor() {
    this.rooms = new Map();
  }

  createRoom(player1Id: string, player1Name: string, maxRounds: number = 3): string {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.rooms.set(roomId, {
      roomId,
      player1: { id: player1Id, name: player1Name, roundsWon: 0, lives: 3 },
      player2: null,
      roundNumber: 1,
      maxRounds,
      waitingForChoices: new Set(),
      waitingForActions: new Set()
    });
    return roomId;
  }

  joinRoom(roomId: string, player2Id: string, player2Name: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (room && !room.player2) {
      room.player2 = { id: player2Id, name: player2Name, roundsWon: 0, lives: 3 };
      room.waitingForChoices.clear();
      room.waitingForActions.clear();
      return room;
    }
    return null;
  }

  setPlayerChoice(roomId: string, playerId: string, choice: GameChoice): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (room.player1.id === playerId) {
      room.player1.choice = choice;
    } else if (room.player2 && room.player2.id === playerId) {
      room.player2.choice = choice;
    }

    room.waitingForChoices.add(playerId);
    return room.waitingForChoices.size === 2;
  }

  resolveRound(roomId: string): RoundResult | null {
    const room = this.rooms.get(roomId);
    if (!room || !room.player1.choice || !room.player2?.choice) return null;

    const player1Choice = room.player1.choice;
    const player2Choice = room.player2.choice;
    const result = this.calculateWinner(player1Choice, player2Choice);

    // El que pierde el duelo pierde una vida
    if (result === 'player1') {
      room.player2!.lives = Math.max(0, room.player2!.lives - 1);
    } else if (result === 'player2') {
      room.player1.lives = Math.max(0, room.player1.lives - 1);
    }
    // En empate no se modifica ninguna vida

    const roundEnded = room.player1.lives === 0 || room.player2!.lives === 0;
    if (roundEnded) {
      if (room.player1.lives > room.player2!.lives) {
        room.player1.roundsWon += 1;
      } else if (room.player2!.lives > room.player1.lives) {
        room.player2!.roundsWon += 1;
      }

      // Solo preparar siguiente ronda si el match no ha terminado.
      if (room.roundNumber < room.maxRounds) {
        room.roundNumber += 1;
        room.player1.lives = 3;
        room.player2!.lives = 3;
      }
    }

    room.player1.choice = null;
    room.player2!.choice = null;
    room.waitingForChoices.clear();
    room.waitingForActions.clear();

    const isFinished = roundEnded && room.roundNumber >= room.maxRounds;

    return {
      result,
      player1Score: room.player1.roundsWon,
      player2Score: room.player2!.roundsWon,
      player1Lives: room.player1.lives,
      player2Lives: room.player2!.lives,
      roundEnded,
      roundNumber: room.roundNumber,
      isFinished,
      player1Choice,
      player2Choice
    };
  }

  private calculateWinner(player1Choice: GameChoice, player2Choice: GameChoice): GameResult {
    if (player1Choice === player2Choice) return 'tie';
    
    if (
      (player1Choice === 'rock' && player2Choice === 'scissors') ||
      (player1Choice === 'paper' && player2Choice === 'rock') ||
      (player1Choice === 'scissors' && player2Choice === 'paper')
    ) {
      return 'player1';
    }
    return 'player2';
  }

  setPlayerAction(roomId: string, playerId: string, action: 'rematch' | 'retire'): { bothReady: boolean; gameEnded: boolean; winner?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { bothReady: false, gameEnded: false };

    if (room.player1.id === playerId) {
      room.player1.action = action;
    } else if (room.player2 && room.player2.id === playerId) {
      room.player2.action = action;
    }

    room.waitingForActions.add(playerId);

    // If anyone retires, game ends
    if (room.player1.action === 'retire' || room.player2?.action === 'retire') {
      const winner = room.player1.action === 'retire' ? room.player2 : room.player1;
      return { bothReady: true, gameEnded: true, winner: winner?.name };
    }

    // If both rematch, continue
    if (room.waitingForActions.size === 2 && room.player1.action === 'rematch' && room.player2?.action === 'rematch') {
      room.player1.action = null;
      room.player2!.action = null;
      room.waitingForActions.clear();
      room.roundNumber++;
      return { bothReady: true, gameEnded: false };
    }

    return { bothReady: false, gameEnded: false };
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  cleanupRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }
}