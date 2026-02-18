import type { GameRoom, GameChoice, GameResult, RoundResult } from '../types/game-types.ts';

export class GameRooms {
  private rooms: Map<string, GameRoom>;

  constructor() {
    this.rooms = new Map();
  }

  createRoom(player1Id: string, player1Name: string): string {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.rooms.set(roomId, {
      roomId,
      player1: { id: player1Id, name: player1Name, score: 0 },
      player2: null,
      roundNumber: 1,
      maxRounds: 10,
      waitingForChoices: new Set()
    });
    return roomId;
  }

  joinRoom(roomId: string, player2Id: string, player2Name: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (room && !room.player2) {
      room.player2 = { id: player2Id, name: player2Name, score: 0 };
      room.waitingForChoices.clear();
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

    const result = this.calculateWinner(room.player1.choice, room.player2.choice);
    
    if (result === 'player1') room.player1.score++;
    if (result === 'player2') room.player2!.score++;

    room.player1.choice = null;
    room.player2!.choice = null;
    room.waitingForChoices.clear();

    const isFinished = room.roundNumber >= room.maxRounds;
    
    if (!isFinished) {
      room.roundNumber++;
    }

    return {
      result,
      player1Score: room.player1.score,
      player2Score: room.player2!.score,
      roundNumber: room.roundNumber,
      isFinished
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

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  cleanupRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }
}