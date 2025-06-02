export class Validation {
    public static isValidPosition(row: number, col: number, maxRow: number, maxCol: number): boolean {
      return row >= 0 && row < maxRow && col >= 0 && col < maxCol;
    }
  
    public static isValidCardIndex(index: number, handSize: number): boolean {
      return index >= 0 && index < handSize;
    }
  
    public static isValidMana(cost: number, available: number): boolean {
      return cost <= available;
    }
  
    public static isValidTarget(sourcePlayerId: number, targetPlayerId: number, targetType: string): boolean {
      switch (targetType) {
        case 'SELF':
          return sourcePlayerId === targetPlayerId;
        case 'ALLY':
          return sourcePlayerId === targetPlayerId;
        case 'ENEMY':
          return sourcePlayerId !== targetPlayerId;
        case 'ANY':
          return true;
        default:
          return false;
      }
    }
  
    public static validateGameState(state: any): boolean {
      // Add comprehensive state validation
      if (!state) return false;
      if (!Array.isArray(state.players) || state.players.length !== 2) return false;
      if (!state.board || !Array.isArray(state.board.tiles)) return false;
      if (typeof state.currentPlayerIndex !== 'number') return false;
      if (!state.phase) return false;
      
      return true;
    }
  }