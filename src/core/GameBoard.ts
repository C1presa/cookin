import { IBoard, Position } from '../types';

export class GameBoard {
  private tiles: (string | null)[][];
  private rows: number;
  private cols: number;

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
    this.tiles = Array(rows).fill(null)
      .map(() => Array(cols).fill(null));
  }

  public serialize(): IBoard {
    return {
      tiles: this.tiles.map(row => [...row]),
      rows: this.rows,
      cols: this.cols
    };
  }

  public placeUnit(unitId: string, position: Position): boolean {
    if (!this.isValidPosition(position)) return false;
    if (this.tiles[position.row][position.col] !== null) return false;
    
    this.tiles[position.row][position.col] = unitId;
    return true;
  }

  public removeUnit(position: Position): boolean {
    if (!this.isValidPosition(position)) return false;
    
    this.tiles[position.row][position.col] = null;
    return true;
  }

  public moveUnit(from: Position, to: Position): boolean {
    if (!this.isValidPosition(from) || !this.isValidPosition(to)) return false;
    
    const unitId = this.tiles[from.row][from.col];
    if (!unitId) return false;
    if (this.tiles[to.row][to.col] !== null) return false;
    
    this.tiles[from.row][from.col] = null;
    this.tiles[to.row][to.col] = unitId;
    return true;
  }

  public getUnitAt(position: Position): string | null {
    if (!this.isValidPosition(position)) return null;
    return this.tiles[position.row][position.col];
  }

  public isEmpty(position: Position): boolean {
    return this.getUnitAt(position) === null;
  }

  private isValidPosition(position: Position): boolean {
    return position.row >= 0 && position.row < this.rows &&
           position.col >= 0 && position.col < this.cols;
  }
}