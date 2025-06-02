// src/ui/components/GameBoardUI.ts - Enhanced with attack visualization
import { IBoard, Position, IUnit, IGameState } from '../../types';

export class GameBoardUI {
  private container: HTMLElement;
  private board: IBoard;
  private onTileClick: (position: Position) => void;
  private onUnitClick: (unitId: string) => void;
  private selectedUnitId: string | null = null;
  private highlights: Map<string, string> = new Map();
  private unitElements: Map<string, HTMLElement> = new Map();
  private tileElements: HTMLElement[][] = [];

  constructor(
    container: HTMLElement,
    board: IBoard,
    onTileClick: (position: Position) => void,
    onUnitClick: (unitId: string) => void
  ) {
    this.container = container;
    this.board = board;
    this.onTileClick = onTileClick;
    this.onUnitClick = onUnitClick;
    this.render();
  }

  public update(state: IGameState): void {
    this.board = state.board;
    this.render();
    
    // Add phase-specific styling
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.setAttribute('data-phase', state.phase);
    }
  }

  public setSelectedUnit(unitId: string | null): void {
    this.selectedUnitId = unitId;
    this.updateUnitStates();
  }

  public highlightPositions(positions: Position[], type: 'spawn' | 'move' | 'attack'): void {
    positions.forEach(pos => {
      const key = `${pos.row}-${pos.col}`;
      this.highlights.set(key, type);
    });
    this.updateTileHighlights();
  }

  public highlightTargets(targets: any[], type: string): void {
    targets.forEach(target => {
      if ('position' in target && target.position) {
        const key = `${target.position.row}-${target.position.col}`;
        this.highlights.set(key, type);
      }
    });
    this.updateTileHighlights();
  }

  public clearHighlights(): void {
    this.highlights.clear();
    this.updateTileHighlights();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = 'game-board';
    this.unitElements.clear();
    this.tileElements = [];

    // Create tiles
    for (let row = 0; row < this.board.rows; row++) {
      this.tileElements[row] = [];
      for (let col = 0; col < this.board.cols; col++) {
        const tile = this.createTile(row, col);
        this.tileElements[row][col] = tile;
        this.container.appendChild(tile);
      }
    }
    
    this.updateTileHighlights();
    this.updateUnitStates();
  }

  private createTile(row: number, col: number): HTMLElement {
    const tile = document.createElement('div');
    tile.className = 'board-tile';
    tile.dataset.row = row.toString();
    tile.dataset.col = col.toString();
    
    // Add spawn zone classes
    if (row === 0) {
      tile.classList.add('spawn-p2');
    } else if (row === this.board.rows - 1) {
      tile.classList.add('spawn-p1');
    }

    // Add click handler
    tile.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onTileClick({ row, col });
    });

    // Add unit if present
    const unitId = this.board.tiles[row][col];
    if (unitId) {
      const unit = this.findUnit(unitId);
      if (unit) {
        const unitElement = this.createUnit(unit);
        this.unitElements.set(unitId, unitElement);
        tile.appendChild(unitElement);
      }
    }

    return tile;
  }

  private createUnit(unit: IUnit): HTMLElement {
    const unitEl = document.createElement('div');
    unitEl.className = 'unit';
    unitEl.classList.add(`player-${unit.playerId}`);
    unitEl.dataset.unitId = unit.id;
    
    // Add visual states
    if (!unit.hasAttacked) {
      unitEl.classList.add('can-attack');
    }

    unitEl.innerHTML = `
      <div class="unit-icon">${unit.icon}</div>
      <div class="unit-stats">
        <span class="attack">${unit.attack}</span>
        <span>/</span>
        <span class="health">${unit.health}</span>
      </div>
      ${unit.effects.some(e => e.type === 'TAUNT') ? 
        '<div class="unit-taunt-indicator">🛡️</div>' : ''}
    `;

    unitEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onUnitClick(unit.id);
    });

    return unitEl;
  }

  private updateTileHighlights(): void {
    // Clear all highlights first
    this.tileElements.forEach(row => {
      row.forEach(tile => {
        tile.classList.remove('highlight-spawn', 'highlight-move', 'highlight-attack');
      });
    });
    
    // Apply new highlights
    this.highlights.forEach((type, key) => {
      const [row, col] = key.split('-').map(Number);
      if (this.tileElements[row] && this.tileElements[row][col]) {
        this.tileElements[row][col].classList.add(`highlight-${type}`);
      }
    });
  }

  private updateUnitStates(): void {
    this.unitElements.forEach((element, unitId) => {
      if (unitId === this.selectedUnitId) {
        element.classList.add('selected');
      } else {
        element.classList.remove('selected');
      }
    });
  }

  private findUnit(unitId: string): IUnit | null {
    const gameState = (window as any).curveGame?.gameEngine?.getState();
    if (!gameState) return null;

    for (const player of gameState.players) {
      const unit = player.units.find((u: IUnit) => u.id === unitId);
      if (unit) return unit;
    }
    return null;
  }

  public getUnitElementAt(position: Position): HTMLElement | null {
    const tile = this.getTileElement(position);
    if (!tile) return null;
    
    return tile.querySelector('.unit') as HTMLElement;
  }

  public getUnitElementById(unitId: string): HTMLElement | null {
    return this.unitElements.get(unitId) || null;
  }

  public getTileElement(position: Position): HTMLElement | null {
    if (!this.tileElements[position.row]) return null;
    return this.tileElements[position.row][position.col] || null;
  }

  public animateAttack(attackerId: string, targetId: string): void {
    const attackerEl = this.unitElements.get(attackerId);
    const targetEl = this.unitElements.get(targetId);
    
    if (attackerEl && targetEl) {
      attackerEl.classList.add('attacking');
      setTimeout(() => {
        attackerEl.classList.remove('attacking');
        targetEl.classList.add('damaged');
        setTimeout(() => {
          targetEl.classList.remove('damaged');
        }, 300);
      }, 200);
    }
  }

  public showDamageNumber(position: Position, damage: number): void {
    const tile = this.getTileElement(position);
    if (!tile) return;
    
    const damageEl = document.createElement('div');
    damageEl.className = 'damage-number';
    damageEl.textContent = `-${damage}`;
    
    const rect = tile.getBoundingClientRect();
    damageEl.style.left = `${rect.left + rect.width / 2}px`;
    damageEl.style.top = `${rect.top}px`;
    
    document.body.appendChild(damageEl);
    
    setTimeout(() => {
      damageEl.remove();
    }, 1000);
  }
}