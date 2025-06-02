// src/ui/UIManager.ts - Enhanced with proper phase handling
import { GameEngine } from '../core/GameEngine';
import { GameBoardUI } from './components/GameBoardUI';
import { PlayerHandUI } from './components/PlayerHandUI';
import { PlayerStatsUI } from './components/PlayerStatsUI';
import { GameLogUI } from './components/GameLogUI';
import { CardHoverPreview } from './components/CardHoverPreview';
import { Logger } from '../utils/Logger';
import { Position, GamePhase } from '../types';
import { EventBus } from '../utils/EventBus';
import { VisualEffectsSystem } from './components/VisualEffectsSystem';
import { SoundManager, SoundType } from './components/SoundManager';

export class UIManager {
  private gameEngine: GameEngine;
  private logger: Logger;
  private container: HTMLElement;
  private components: Map<string, any> = new Map();
  private eventBus: EventBus;
  private cardHoverPreview: CardHoverPreview;
  private visualEffects: VisualEffectsSystem;
  private soundManager: SoundManager;
  
  private selectedCardIndex: number | null = null;
  private selectedUnitId: string | null = null;
  private isKriperPhase: boolean = false;
  private phaseIndicator: HTMLElement | null = null;
  private automaticPhaseActive: boolean = false;

  constructor(gameEngine: GameEngine) {
    this.gameEngine = gameEngine;
    this.logger = new Logger('UIManager');
    this.eventBus = new EventBus();
    this.visualEffects = new VisualEffectsSystem();
    this.soundManager = SoundManager.getInstance();
    
    const app = document.getElementById('app');
    if (!app) {
      throw new Error('App container not found');
    }
    
    this.container = app;
    this.cardHoverPreview = new CardHoverPreview();
    this.initializeLayout();
    this.initializeComponents();
    this.setupEventListeners();
  }

  private initializeLayout(): void {
    this.container.innerHTML = `
      <div class="game-container">
        <header class="game-header">
          <h1 class="game-title">CURVE GAME</h1>
          <button class="btn btn-menu" id="menu-btn">Menu</button>
        </header>
        
        <div class="game-content">
          <!-- Left Sidebar with both players' stats -->
          <div class="game-sidebar">
            <div id="player-2-stats"></div>
            <div id="player-1-stats"></div>
            <div id="game-log"></div>
          </div>
          
          <!-- Main Game Area -->
          <div class="game-main">
            <div class="turn-info" id="turn-info"></div>
            
            <!-- Phase Indicator Overlay -->
            <div id="phase-indicator" class="phase-indicator" style="display: none;">
              <div class="phase-content">
                <h3 class="phase-name"></h3>
                <p class="phase-description"></p>
              </div>
            </div>
            
            <div class="board-container">
              <div id="game-board"></div>
            </div>
            
            <div class="hand-container">
              <div id="player-hand"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Kriper Placement Overlay -->
      <div id="kriper-overlay" class="kriper-overlay" style="display: none;">
        <div class="kriper-content">
          <h2>Place Your Kriper</h2>
          <p>Choose any tile in your spawn row</p>
          <div class="kriper-hint">Click on a highlighted tile to place your starting unit</div>
        </div>
      </div>
    `;
    
    this.phaseIndicator = document.getElementById('phase-indicator');
  }

  private setupEventListeners(): void {
    // Game engine events
    this.gameEngine.on('phaseChanged', (event: any) => {
      console.log('[UIManager] Received phaseChanged event:', event.data.phase);
      this.handlePhaseChange(event.data.phase);
    });
    
    this.gameEngine.on('kriperPhase', (event: any) => {
      this.showKriperPhase(event.data);
    });
    
    this.gameEngine.on('kriperPlaced', () => {
      this.hideKriperPhase();
    });
    
    this.gameEngine.on('cardDrawn', (event: any) => {
      // Don't show phase indicator for draw, it's too quick
      this.soundManager.play(SoundType.CARD_DRAW);
    });
    
    this.gameEngine.on('unitAdvanced', (event: any) => {
      const boardComponent = this.components.get('board');
      if (boardComponent) {
        const unitElement = boardComponent.getUnitElementAt(event.data.from);
        if (unitElement) {
          this.animateUnitAdvance(unitElement, event.data.from, event.data.to);
        }
      }
    });
    
    this.gameEngine.on('unitPlayed', () => this.render());
    this.gameEngine.on('unitAttacked', (event: any) => {
      this.handleAttackAnimation(event.data);
    });
    this.gameEngine.on('spawnTileAttacked', (event: any) => {
      this.handleSpawnAttackAnimation(event.data);
    });
    this.gameEngine.on('turnEnded', () => this.render());
    this.gameEngine.on('gameEnded', (data: any) => this.showGameOver(data));
    
    this.gameEngine.on('unitPushed', (event: any) => {
      this.handlePushAnimation(event.data);
    });
    
    // UI events
    document.getElementById('menu-btn')?.addEventListener('click', () => {
      if (confirm('Return to main menu?')) {
        this.eventBus.emit('returnToMenu');
      }
    });
  }

  private handlePhaseChange(phase: GamePhase): void {
    console.log('[UIManager.handlePhaseChange] Phase changed to:', phase, {
      previousAutomaticPhaseActive: this.automaticPhaseActive
    });
    // Immediately update phase-specific flags BEFORE rendering
    switch (phase) {
      case GamePhase.DRAW:
        this.automaticPhaseActive = true;
        // Draw phase is usually too quick for an indicator
        break;
      case GamePhase.ADVANCE:
        this.automaticPhaseActive = true;
        this.showPhaseIndicator('Advance Phase', 'Units advancing...', 1000);
        break;
      case GamePhase.PLAY:
        // CRITICAL: Set this to false immediately
        this.automaticPhaseActive = false;
        this.showPhaseIndicator('Play Phase', 'Play cards from your hand', 1500);
        console.log('[UIManager] PLAY phase - automaticPhaseActive set to FALSE');
        break;
      case GamePhase.BATTLE:
        this.automaticPhaseActive = false;
        this.showPhaseIndicator('Battle Phase', 'Attack with your units', 1500);
        break;
      case GamePhase.END:
        this.automaticPhaseActive = false;
        // No indicator for end phase
        break;
      case GamePhase.SETUP:
        // Kriper placement phase
        this.automaticPhaseActive = false;
        break;
    }
    // Force render with new state
    this.render();
    this.updateTurnInfo();
    console.log('[UIManager.handlePhaseChange] Complete:', {
      phase,
      automaticPhaseActive: this.automaticPhaseActive,
      isKriperPhase: this.isKriperPhase
    });
  }

  private showPhaseIndicator(phaseName: string, description: string, duration: number): void {
    if (!this.phaseIndicator) return;
    const nameEl = this.phaseIndicator.querySelector('.phase-name');
    const descEl = this.phaseIndicator.querySelector('.phase-description');
    if (nameEl) {
      nameEl.textContent = phaseName;
    }
    if (descEl) {
      descEl.textContent = description;
    }
    this.phaseIndicator.style.display = 'flex';
    this.phaseIndicator.classList.add('fade-in');
    setTimeout(() => {
      if (this.phaseIndicator) {
        this.phaseIndicator.classList.remove('fade-in');
        this.phaseIndicator.classList.add('fade-out');
        setTimeout(() => {
          if (this.phaseIndicator) {
            this.phaseIndicator.style.display = 'none';
            this.phaseIndicator.classList.remove('fade-out');
          }
          // Refresh hand state after phase indicator is hidden
          if (phaseName === 'Play Phase') {
            this.refreshHandState();
          }
        }, 300);
      }
    }, duration);
  }

  private showKriperPhase(data: any): void {
    this.isKriperPhase = true;
    const overlay = document.getElementById('kriper-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.classList.remove('fade-out');
      const content = overlay.querySelector('.kriper-content');
      if (content) {
        // Remove any previous listeners
        const newContent = content.cloneNode(true) as HTMLElement;
        content.parentNode?.replaceChild(newContent, content);
        // Click to dismiss
        const clickHandler = () => {
          overlay.classList.add('fade-out');
          setTimeout(() => {
            overlay.style.display = 'none';
            overlay.classList.remove('fade-out');
            newContent.removeEventListener('click', clickHandler);
            document.removeEventListener('keydown', escHandler);
          }, 300);
        };
        newContent.addEventListener('click', clickHandler);
        // ESC to dismiss
        const escHandler = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            clickHandler();
          }
        };
        document.addEventListener('keydown', escHandler);
        // Auto-hide after 3 seconds
        setTimeout(() => {
          if (overlay.style.display !== 'none') {
            clickHandler();
          }
        }, 3000);
      }
    }
    // Highlight spawn positions
    const board = this.components.get('board');
    if (board) {
      board.clearHighlights();
      board.highlightPositions(data.spawnPositions, 'spawn');
    }
    this.render();
  }

  private hideKriperPhase(): void {
    this.isKriperPhase = false;
    const overlay = document.getElementById('kriper-overlay');
    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.style.display = 'none';
        overlay.classList.remove('fade-out');
      }, 300);
    }
    
    // Clear highlights
    const board = this.components.get('board');
    if (board) {
      board.clearHighlights();
    }
  }

  private animateUnitAdvance(element: HTMLElement, from: Position, to: Position): void {
    // Calculate pixel movement
    const tileSize = 80; // From CSS
    const deltaRow = to.row - from.row;
    const deltaCol = to.col - from.col;
    
    element.style.transition = 'transform 0.3s ease-out';
    element.style.transform = `translate(${deltaCol * tileSize}px, ${deltaRow * tileSize}px)`;
    
    setTimeout(() => {
      element.style.transition = '';
      element.style.transform = '';
      this.render(); // Re-render to update positions
    }, 300);
  }

  private handleAttackAnimation(data: any): void {
    const board = this.components.get('board');
    if (!board) return;
    
    const attackerEl = board.getUnitElementById(data.attacker.id);
    const targetEl = board.getUnitElementById(data.target.id);
    
    if (attackerEl && targetEl) {
      this.visualEffects.attackEffect(attackerEl, targetEl);
      this.soundManager.play(SoundType.UNIT_ATTACK);
      
      setTimeout(() => {
        this.visualEffects.damageEffect(targetEl, data.damage);
        this.render();
      }, 400);
    }
  }

  private handleSpawnAttackAnimation(data: any): void {
    const board = this.components.get('board');
    if (!board) return;
    
    const attackerEl = board.getUnitElementById(data.attacker.id);
    const tileEl = board.getTileElement(data.position);
    
    if (attackerEl && tileEl) {
      this.visualEffects.attackEffect(attackerEl, tileEl);
      this.soundManager.play(SoundType.UNIT_ATTACK);
      
      // Show damage on player stats
      setTimeout(() => {
        const statsComponent = this.components.get(`player${data.targetPlayerId}Stats`);
        if (statsComponent) {
          statsComponent.showDamageAnimation(data.damage);
        }
      }, 400);
    }
  }

  private handlePushAnimation(data: any): void {
    const { target, distance, newPosition } = data;
    const unitElement = document.querySelector(`[data-unit-id="${target.id}"]`) as HTMLElement;
    
    if (!unitElement) {
      this.logger.warn(`Could not find unit element for push animation: ${target.id}`);
      return;
    }
    
    // Add push animation class
    unitElement.classList.add('pushed');
    
    // Show push effect
    this.visualEffects.pushEffect(unitElement, distance);
    
    // Remove animation class after animation completes
    setTimeout(() => {
      unitElement.classList.remove('pushed');
      this.render(); // Re-render to ensure proper positioning
    }, 300);
  }

  public render(): void {
    const state = this.gameEngine.getState();
    
    // Update turn info
    this.updateTurnInfo();
    
    // Update components
    this.components.get('board')?.update(state);
    this.components.get('player1Stats')?.update(state.players[0]);
    this.components.get('player2Stats')?.update(state.players[1]);
    
    // Update current player's hand with mana info
    const currentPlayer = state.players[state.currentPlayerIndex];
    const handComponent = this.components.get('playerHand');
    
    if (handComponent) {
      // Update hand with current mana
      handComponent.update(currentPlayer.hand, currentPlayer.mana);
      
      // Determine if hand should be interactive
      const canPlayCards = !this.automaticPhaseActive && 
                          state.phase === GamePhase.PLAY &&
                          !this.isKriperPhase;
      
      // Pass both interactive state AND current phase
      handComponent.setInteractive(canPlayCards, state.phase);
      
      // Debug logging
      console.log('[UIManager.render] Hand state:', {
        phase: state.phase,
        automaticPhaseActive: this.automaticPhaseActive,
        isKriperPhase: this.isKriperPhase,
        canPlayCards,
        playerMana: currentPlayer.mana
      });
    }
    
    // Clear selections when phase changes
    if (this.automaticPhaseActive) {
      this.selectedCardIndex = null;
      this.selectedUnitId = null;
    }
  }

  private updateTurnInfo(): void {
    const state = this.gameEngine.getState();
    const turnInfo = document.getElementById('turn-info');
    if (!turnInfo) return;
    
    const player = state.players[state.currentPlayerIndex];
    const deckName = this.gameEngine.getDeckName?.(player.id) || 'Custom Deck';
    
    const canInteract = !this.automaticPhaseActive &&
      (state.phase === GamePhase.PLAY ||
        state.phase === GamePhase.BATTLE ||
        state.phase === GamePhase.END);

    // DEBUG LOGGING
    console.log('[updateTurnInfo]', {
      phase: state.phase,
      automaticPhaseActive: this.automaticPhaseActive,
      canInteract
    });

    if (this.isKriperPhase) {
      turnInfo.innerHTML = `
        <div class="turn-player">${player.name}'s Turn</div>
        <div class="turn-phase">Kriper Placement</div>
        <div class="turn-number">Turn ${Math.ceil(state.turnNumber / 2)}</div>
      `;
    } else {
      let buttonLabel = '';
      let buttonClass = 'btn-primary';
      if (state.phase === GamePhase.PLAY) {
        buttonLabel = 'End Play Phase';
        buttonClass = 'btn-primary';
      } else if (state.phase === GamePhase.BATTLE) {
        buttonLabel = 'End Battle Phase';
        buttonClass = 'btn-primary';
      } else if (state.phase === GamePhase.END) {
        buttonLabel = 'End Turn';
        buttonClass = 'btn-warning';
      }
      turnInfo.innerHTML = `
        <div class="turn-info-content">
          <div class="turn-info-main">
            <div class="turn-player">${player.name}'s Turn</div>
            <div class="turn-deck">Deck: ${deckName}</div>
            <div class="turn-phase">Phase: ${state.phase}</div>
            <div class="turn-number">Turn ${Math.ceil(state.turnNumber / 2)}</div>
          </div>
          ${canInteract ? `
            <div class="turn-info-actions">
              <button class="btn ${buttonClass}" id="phase-btn">
                ${buttonLabel}
              </button>
            </div>
          ` : ''}
        </div>
      `;
      const phaseBtn = document.getElementById('phase-btn');
      if (phaseBtn) {
        const newPhaseBtn = phaseBtn.cloneNode(true);
        phaseBtn.parentNode?.replaceChild(newPhaseBtn, phaseBtn);
        newPhaseBtn.addEventListener('click', () => {
          this.gameEngine.nextPhase();
          this.soundManager.play(SoundType.PHASE_CHANGE);
        });
      }
    }
  }

  private handleCardClick(index: number): void {
    const state = this.gameEngine.getState();
    
    if (state.phase !== GamePhase.PLAY || this.automaticPhaseActive) return;
    
    if (this.selectedCardIndex === index) {
      this.selectedCardIndex = null;
    } else {
      this.selectedCardIndex = index;
      this.selectedUnitId = null;
      
      this.soundManager.play(SoundType.CARD_PLAY);
      
      const cardElement = this.components.get('playerHand')?.getCardElement(index);
      if (cardElement) {
        this.visualEffects.playCardEffect(cardElement);
      }
    }
    
    this.updateSelections();
  }

  private handleUnitClick(unitId: string): void {
    const state = this.gameEngine.getState();
    
    if (state.phase !== GamePhase.BATTLE || this.automaticPhaseActive) return;
    
    const unit = this.findUnit(unitId);
    if (!unit) return;
    
    // If it's current player's unit, select it for attacking
    if (unit.playerId === state.players[state.currentPlayerIndex].id) {
      if (this.selectedUnitId === unitId) {
        this.selectedUnitId = null;
      } else {
        this.selectedUnitId = unitId;
        this.selectedCardIndex = null;
      }
    }
    // If enemy unit is selected and we have a selected unit, try to attack
    else if (this.selectedUnitId) {
      this.gameEngine.attack(this.selectedUnitId, unitId);
      this.selectedUnitId = null;
    }
    
    this.updateSelections();
  }

  private handleBoardClick(position: Position): void {
    const state = this.gameEngine.getState();
    
    // Handle Kriper placement
    if (this.isKriperPhase) {
      const currentPlayerId = state.players[state.currentPlayerIndex].id;
      const result = this.gameEngine.placeStartingKriper(currentPlayerId, position);
      
      if (result) {
        setTimeout(() => {
          const boardComponent = this.components.get('board');
          if (boardComponent) {
            const unitElement = boardComponent.getUnitElementAt(position);
            if (unitElement) {
              this.visualEffects.unitSpawnEffect(unitElement);
              this.soundManager.play(SoundType.UNIT_SPAWN);
            }
          }
        }, 100);
      }
      return;
    }
    
    // Handle card placement
    if (this.selectedCardIndex !== null && state.phase === GamePhase.PLAY && !this.automaticPhaseActive) {
      const result = this.gameEngine.playCard(this.selectedCardIndex, position);
      if (result && !result.error) {
        setTimeout(() => {
          const boardComponent = this.components.get('board');
          if (boardComponent) {
            const unitElement = boardComponent.getUnitElementAt(position);
            if (unitElement) {
              this.visualEffects.unitSpawnEffect(unitElement);
              this.soundManager.play(SoundType.UNIT_SPAWN);
            }
          }
        }, 100);
        
        this.selectedCardIndex = null;
      }
    }
    // Handle spawn tile attack
    else if (this.selectedUnitId && state.phase === GamePhase.BATTLE && !this.automaticPhaseActive) {
      // Check if this is a valid spawn tile attack
      const enemySpawnRow = state.players[state.currentPlayerIndex].id === 1 ? 0 : state.board.rows - 1;
      if (position.row === enemySpawnRow) {
        this.gameEngine.attackSpawnTile(this.selectedUnitId, position);
        this.selectedUnitId = null;
      }
    }
    
    this.updateSelections();
  }

  private updateSelections(): void {
    const state = this.gameEngine.getState();
    const board = this.components.get('board');
    
    if (board) {
      board.clearHighlights();
      
      if (this.selectedCardIndex !== null) {
        // Highlight spawn positions
        const playerId = state.players[state.currentPlayerIndex].id;
        const spawnPositions = this.gameEngine.getValidSpawnPositions(playerId);
        board.highlightPositions(spawnPositions, 'spawn');
      } else if (this.selectedUnitId) {
        // Get valid attack targets
        const targets = this.gameEngine.getValidAttackTargets(this.selectedUnitId);
        
        targets.forEach(target => {
          if ('isSpawnTile' in target) {
            board.highlightPositions([target.position], 'attack');
          } else {
            board.highlightTargets([target], 'attack');
          }
        });
      }
      
      board.setSelectedUnit(this.selectedUnitId);
    }
    
    // Update hand selection
    const hand = this.components.get('playerHand');
    if (hand) {
      hand.setSelectedCard(this.selectedCardIndex);
    }
  }

  private findUnit(unitId: string): any {
    const state = this.gameEngine.getState();
    for (const player of state.players) {
      const unit = player.units.find(u => u.id === unitId);
      if (unit) return unit;
    }
    return null;
  }

  private showGameOver(data: any): void {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Game Over!</h2>
        <p>Player ${data.data.winner} wins!</p>
        <p>${data.data.reason}</p>
        <button class="btn btn-primary" onclick="location.reload()">
          Play Again
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  private initializeComponents(): void {
    const state = this.gameEngine.getState();
    
    // Initialize board
    this.components.set('board', new GameBoardUI(
      document.getElementById('game-board')!,
      state.board,
      (pos) => this.handleBoardClick(pos),
      (unitId) => this.handleUnitClick(unitId)
    ));
    
    // Initialize player stats
    const player1StatsEl = document.getElementById('player-1-stats')!;
    player1StatsEl.classList.add('player-1');
    
    const player2StatsEl = document.getElementById('player-2-stats')!;
    player2StatsEl.classList.add('player-2');
    
    this.components.set('player1Stats', new PlayerStatsUI(
      player1StatsEl,
      state.players[0]
    ));
    
    this.components.set('player2Stats', new PlayerStatsUI(
      player2StatsEl,
      state.players[1]
    ));
    
    // Initialize current player's hand
    const playerHandComponent = new PlayerHandUI(
      document.getElementById('player-hand')!,
      state.players[state.currentPlayerIndex].hand,
      (index) => this.handleCardClick(index),
      this.cardHoverPreview
    );
    // Set initial state based on current phase
    const currentPlayer = state.players[state.currentPlayerIndex];
    playerHandComponent.update(currentPlayer.hand, currentPlayer.mana);
    // Set interactive state based on phase
    const canPlayCards = state.phase === GamePhase.PLAY && !this.automaticPhaseActive;
    playerHandComponent.setInteractive(canPlayCards, state.phase);
    this.components.set('playerHand', playerHandComponent);
    
    // Initialize game log
    this.components.set('log', new GameLogUI(
      document.getElementById('game-log')!
    ));
    console.log('[UIManager.initializeComponents] Initialized with phase:', state.phase, {
      canPlayCards,
      automaticPhaseActive: this.automaticPhaseActive,
      playerMana: currentPlayer.mana
    });
  }

  public on(event: string, handler: Function): void {
    this.eventBus.on(event, handler);
  }

  public destroy(): void {
    this.components.forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });
    
    this.components.clear();
    this.container.innerHTML = '';
    this.cardHoverPreview.destroy();
    this.visualEffects.destroy();
  }

  public refreshHandState(): void {
    const state = this.gameEngine.getState();
    const handComponent = this.components.get('playerHand');
    if (handComponent && state.phase === GamePhase.PLAY) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      handComponent.update(currentPlayer.hand, currentPlayer.mana);
      handComponent.setInteractive(true, state.phase);
      console.log('[UIManager.refreshHandState] Hand refreshed for PLAY phase');
    }
  }
}