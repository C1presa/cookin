// src/core/GameEngine.ts - Enhanced with effect action support
import { 
  IGameState, 
  IGameConfig, 
  GamePhase, 
  IPlayer,
  IUnit,
  Position,
  ICard,
  IGameEvent,
  IMove,
  ITargetingMode,
  CardType,
  IEffect,
  EffectType,
  EffectAction
} from '../types';
import { EventBus } from '../utils/EventBus';
import { Logger } from '../utils/Logger';
import { GameBoard } from './GameBoard';
import { Player } from './Player';
import { EffectSystem } from '../effects/EffectSystem';
import { CardDatabase } from './CardDatabase';
import { DEFAULT_CONFIG } from '../utils/Constants';

export class GameEngine {
  private state: IGameState;
  private config: IGameConfig;
  private eventBus: EventBus;
  private logger: Logger;
  private effectSystem: EffectSystem;
  private cardDatabase: CardDatabase;
  private history: IGameState[] = [];
  private historyLimit = 50;
  private firstTurnKriperPlaced: Set<number> = new Set();
  private phaseTransitionQueue: (() => void)[] = [];
  private deckNames: Map<number, string> = new Map();
  private deckIds: Map<number, string> = new Map();

  constructor(config: Partial<IGameConfig> = {}, gameConfig?: any) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = new EventBus();
    this.logger = new Logger('GameEngine');
    this.cardDatabase = new CardDatabase();
    this.effectSystem = new EffectSystem(this, this.eventBus);
    
    this.state = this.initializeGameState(gameConfig);
  }

  private initializeGameState(gameConfig?: any): IGameState {
    const board = new GameBoard(this.config.boardRows, this.config.boardCols);
    
    let player1Deck: ICard[];
    let player2Deck: ICard[];
    let player1DeckName = 'Starter Deck';
    let player2DeckName = 'Starter Deck';
    
    this.logger.info('Initializing game state with config:', gameConfig);
    
    if (gameConfig) {
      if (gameConfig.player1) {
        player1Deck = this.loadDeck(gameConfig.player1.deckId, gameConfig.player1.deckType);
        player1DeckName = gameConfig.player1.deckName || this.getDeckDisplayName(gameConfig.player1.deckId, gameConfig.player1.deckType);
        this.deckNames.set(1, player1DeckName);
        this.deckIds.set(1, gameConfig.player1.deckId);
      } else if (gameConfig.deckId) {
        player1Deck = this.loadDeck(gameConfig.deckId, gameConfig.deckType || 'preset');
        player1DeckName = this.getDeckDisplayName(gameConfig.deckId, gameConfig.deckType);
        this.deckNames.set(1, player1DeckName);
        this.deckIds.set(1, gameConfig.deckId);
      } else {
        player1Deck = this.createStarterDeck();
      }
      
      if (gameConfig.player2) {
        player2Deck = this.loadDeck(gameConfig.player2.deckId, gameConfig.player2.deckType);
        player2DeckName = gameConfig.player2.deckName || this.getDeckDisplayName(gameConfig.player2.deckId, gameConfig.player2.deckType);
        this.deckNames.set(2, player2DeckName);
        this.deckIds.set(2, gameConfig.player2.deckId);
      } else {
        player2Deck = this.createStarterDeck();
      }
    } else {
      player1Deck = this.createStarterDeck();
      player2Deck = this.createStarterDeck();
    }
    
    this.logger.info(`Player 1 deck size: ${player1Deck.length}, Player 2 deck size: ${player2Deck.length}`);
    
    // Create players with their decks
    const players: [Player, Player] = [
      new Player(1, 'Player 1', player1Deck),
      new Player(2, 'Player 2', player2Deck)
    ];
    
    // Draw starting hands
    players.forEach(player => {
      for (let i = 0; i < this.config.startingHandSize; i++) {
        player.drawCard();
      }
    });

    return {
      players: players as [IPlayer, IPlayer],
      board: board.serialize(),
      currentPlayerIndex: 0,
      phase: GamePhase.DRAW,
      turnNumber: 1,
      gameOver: false,
      winner: null,
      pendingActions: [],
      targetingMode: null,
      effectStack: []
    };
  }

  private loadDeck(deckId: string, deckType: string): ICard[] {
    if (deckType === 'custom') {
      return this.loadCustomDeck(deckId);
    } else {
      return this.createPresetDeck(deckId);
    }
  }

  private loadCustomDeck(deckId: string): ICard[] {
    this.logger.info(`Loading custom deck: ${deckId}`);
    
    const savedDecks = JSON.parse(localStorage.getItem('savedDecks') || '[]');
    const customDeck = savedDecks.find((d: any) => d.id === deckId);
    
    if (!customDeck) {
      this.logger.warn(`Custom deck ${deckId} not found, using starter deck`);
      return this.createStarterDeck();
    }
    
    this.logger.info(`Found custom deck: ${customDeck.name} with ${customDeck.cards.length} unique cards`);
    
    const deck: ICard[] = [];
    
    // Load all available cards including custom ones
    const baseCards = this.cardDatabase.getAllCards();
    const customCards = JSON.parse(localStorage.getItem('customCards') || '[]');
    const allCards = [...baseCards, ...customCards];
    
    // Build the deck from saved deck data
    customDeck.cards.forEach((deckCard: any) => {
      // Try to find the card in all available cards
      let card = allCards.find(c => c.id === deckCard.card.id);
      
      if (!card && deckCard.card) {
        // If not found, use the card data stored in the deck
        // This handles custom cards that might have been deleted
        card = {
          ...deckCard.card,
          // Ensure all required properties exist
          effects: deckCard.card.effects || [],
          description: deckCard.card.description || '',
          icon: deckCard.card.icon || '🃏'
        };
        
        this.logger.info(`Using stored card data for: ${card.name}`);
      }
      
      if (card) {
        // Add the specified quantity of this card
        for (let i = 0; i < (deckCard.quantity || 1); i++) {
          // Create a fresh copy of the card
          deck.push({
            ...card,
            id: card.id,
            name: card.name,
            cost: card.cost,
            type: card.type,
            archetype: card.archetype || 'Neutral',
            rarity: card.rarity,
            attack: card.attack,
            health: card.health,
            effects: [...(card.effects || [])],
            description: card.description,
            icon: card.icon
          });
        }
        this.logger.debug(`Added ${deckCard.quantity}x ${card.name} to deck`);
      } else {
        this.logger.error(`Could not find or reconstruct card: ${deckCard.card?.name || 'Unknown'}`);
      }
    });
    
    // Validate deck size
    if (deck.length < 20) {
      this.logger.warn(`Deck has only ${deck.length} cards, padding with Kripers`);
      const kriper = this.cardDatabase.getCard('kriper');
      if (kriper) {
        while (deck.length < 20) {
          deck.push({ ...kriper });
        }
      }
    }
    
    this.logger.info(`Loaded custom deck "${customDeck.name}" with ${deck.length} total cards`);
    return deck;
  }

  private getAllAvailableCards(): ICard[] {
    const baseCards = this.cardDatabase.getAllCards();
    const customCards = JSON.parse(localStorage.getItem('customCards') || '[]');
    return [...baseCards, ...customCards];
  }

  private createPresetDeck(deckId: string): ICard[] {
    // Create preset decks based on archetype
    switch (deckId) {
      case 'aggro-rush':
        return this.createAggroDeck();
      case 'control-defense':
        return this.createControlDeck();
      case 'balanced-starter':
      default:
        return this.createStarterDeck();
    }
  }

  private createAggroDeck(): ICard[] {
    const deck: ICard[] = [];
    const cards = this.cardDatabase.getAllCards();
    
    // Focus on low-cost units
    const lowCostCards = cards.filter(c => c.cost <= 3);
    lowCostCards.forEach(card => {
      const count = card.cost === 1 ? 4 : 3;
      for (let i = 0; i < count; i++) {
        deck.push({ ...card });
      }
    });
    
    // Add some mid-cost cards
    const midCostCards = cards.filter(c => c.cost === 4 || c.cost === 5);
    midCostCards.forEach(card => {
      for (let i = 0; i < 2; i++) {
        deck.push({ ...card });
      }
    });
    
    return deck;
  }

  private createControlDeck(): ICard[] {
    const deck: ICard[] = [];
    const cards = this.cardDatabase.getAllCards();
    
    // Focus on defensive and high-cost units
    cards.forEach(card => {
      let count = 2;
      if (card.effects.some(e => e.type === EffectType.TAUNT)) {
        count = 3; // More taunts
      } else if (card.cost >= 5) {
        count = 3; // More high-cost units
      }
      
      for (let i = 0; i < count; i++) {
        deck.push({ ...card });
      }
    });
    
    return deck;
  }

  private createStarterDeck(): ICard[] {
    const deck: ICard[] = [];
    const cards = this.cardDatabase.getAllCards();
    
    cards.forEach(card => {
      const count = card.rarity === 'COMMON' ? 3 : 
                   card.rarity === 'RARE' ? 2 : 1;
      
      for (let i = 0; i < count; i++) {
        deck.push({ ...card });
      }
    });

    return deck;
  }

  private createAIDeck(difficulty: string): ICard[] {
    switch (difficulty) {
      case 'easy':
        // Simple curve, basic cards only
        return this.createBalancedDeck(0.7); // 70% basic cards
        
      case 'medium':
        // Better curve, some synergies
        return this.createSynergyDeck(['WARSHOUT', 'BUFF']);
        
      case 'hard':
        // Optimized deck with strong synergies
        return this.createOptimizedDeck();
        
      default:
        return this.createStarterDeck();
    }
  }

  private createBalancedDeck(basicCardRatio: number): ICard[] {
    // Implementation for creating a balanced deck with basic cards
    return []; // TODO: Implement
  }

  private createSynergyDeck(synergies: string[]): ICard[] {
    // Implementation for creating a deck with specific synergies
    return []; // TODO: Implement
  }

  private createOptimizedDeck(): ICard[] {
    // Implementation for creating an optimized deck
    return []; // TODO: Implement
  }

  // Game Flow Methods
  public startGame(): void {
    this.logger.info('Starting new game');
    
    // Reset first turn tracking
    this.firstTurnKriperPlaced.clear();
    
    // Start with Player 1's first turn
    this.state.currentPlayerIndex = 0;
    this.state.turnNumber = 1;
    
    // Ensure Player 1 gets correct mana on first turn
    (this.state.players[0] as Player).startTurn();
    
    // Check if current player needs Kriper placement
    this.checkKriperPhase();
    
    // Debug deck contents
    this.debugDeckContents();
    
    this.emit('gameStarted', this.state);
  }

  private checkKriperPhase(): void {
    const currentPlayer = this.getCurrentPlayer();
    
    // Check if this player hasn't placed their Kriper yet
    if (!this.firstTurnKriperPlaced.has(currentPlayer.id)) {
      this.state.phase = GamePhase.SETUP;
      this.state.pendingActions = [{
        type: 'placeKriper',
        playerId: currentPlayer.id,
        message: `${currentPlayer.name}: Place your starting Kriper on any spawn tile`
      }];
      
      this.emit('kriperPhase', { 
        playerId: currentPlayer.id,
        spawnPositions: this.getValidSpawnPositions(currentPlayer.id)
      });
    } else {
      // Normal turn flow
      this.state.phase = GamePhase.DRAW;
      this.handleAutomaticPhases();
    }
  }

  public placeStartingKriper(playerId: number, position: Position): boolean {
    // Validate it's the correct player's turn
    if (this.getCurrentPlayer().id !== playerId) return false;
    
    // Validate position is in spawn row
    const spawnRow = this.getSpawnRow(playerId);
    if (position.row !== spawnRow) return false;
    if (!this.isEmpty(position)) return false;
  
    // Get the kriper card
    const kriperCard = this.cardDatabase.getCard('kriper');
    if (!kriperCard) return false;
  
    // Create and place the unit
    const unit = this.createUnit(kriperCard, playerId, position);
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;
  
    player.units.push(unit);
    this.state.board.tiles[position.row][position.col] = unit.id;
  
    // Mark this player as having placed their Kriper
    this.firstTurnKriperPlaced.add(playerId);
    
    // Clear pending actions
    this.state.pendingActions = [];
  
    this.emit('kriperPlaced', { playerId, unit, position });
    
    // Continue with normal turn
    this.state.phase = GamePhase.DRAW;
    this.handleAutomaticPhases();
  
    return true;
  }

  private handleAutomaticPhases(): void {
    // Queue automatic phase transitions
    this.phaseTransitionQueue = [];
    
    // Execute Draw phase automatically
    if (this.state.phase === GamePhase.DRAW) {
      setTimeout(() => {
        this.handleDrawPhase();
        
        // Then advance phase
        setTimeout(() => {
          this.handleAdvancePhase();
          
          // Finally, enter Play phase (manual)
          this.state.phase = GamePhase.PLAY;
          this.emit('phaseChanged', { phase: this.state.phase });
          
        }, 500); // Short delay for advance animation
      }, 300); // Short delay for draw animation
    }
  }

  public nextPhase(): void {
    if (this.state.gameOver) return;

    this.saveHistory();

    switch (this.state.phase) {
      case GamePhase.PLAY:
        this.state.phase = GamePhase.BATTLE;
        break;
      case GamePhase.BATTLE:
        this.state.phase = GamePhase.END;
        break;
      case GamePhase.END:
        this.endTurn();
        return; // endTurn handles the phase change
      default:
        // Draw and Advance are automatic, shouldn't reach here
        this.logger.warn(`Unexpected manual phase transition from ${this.state.phase}`);
        return;
    }

    this.emit('phaseChanged', { phase: this.state.phase });
    this.checkWinConditions();
  }

  private handleDrawPhase(): void {
    const player = this.getCurrentPlayer() as Player;
    const card = player.drawCard();
    
    if (card) {
      this.emit('cardDrawn', { playerId: player.id, card });
    } else if (player.deck.length === 0) {
      this.emit('fatigueDamage', { playerId: player.id, damage: player.fatigueDamage });
    }
    
    this.state.phase = GamePhase.ADVANCE;
    this.emit('phaseChanged', { phase: this.state.phase });
  }

  private handleAdvancePhase(): void {
    // Let effect system handle advance phase effects (like ROOT)
    this.effectSystem.handleAdvancePhase();
    
    const player = this.getCurrentPlayer();
    const direction = player.id === 1 ? -1 : 1;
    const units = [...player.units];
    
    // Sort units to avoid collision issues
    units.sort((a, b) => {
      return player.id === 1 ? a.position.row - b.position.row : b.position.row - a.position.row;
    });

    // Auto-advance all units that aren't rooted
    for (const unit of units) {
      if (unit.isRooted) {
        this.logger.debug(`Unit ${unit.name} is rooted and cannot advance`);
        continue;
      }
      
      const newRow = unit.position.row + direction;
      const newCol = unit.position.col;
      
      if (this.isValidPosition({ row: newRow, col: newCol }) && 
          this.isEmpty({ row: newRow, col: newCol })) {
        // Update board
        this.state.board.tiles[unit.position.row][unit.position.col] = null;
        this.state.board.tiles[newRow][newCol] = unit.id;
        
        // Update unit position
        const oldPos = { ...unit.position };
        unit.position = { row: newRow, col: newCol };
        
        this.emit('unitAdvanced', { unit, from: oldPos, to: unit.position });
        
        // Check if unit reached enemy spawn
        const enemySpawnRow = this.getEnemySpawnRow(unit.playerId);
        if (newRow === enemySpawnRow) {
          this.handleUnitReachedSpawn(unit);
          return;
        }
      }
    }
    
    // Phase will be changed by handleAutomaticPhases
  }

  // Updated movement validation - NO movement in battle phase!
  public moveUnit(unitId: string, newPosition: Position): boolean {
    // Units CANNOT move manually - movement only happens in Advance phase
    this.logger.warn('Manual unit movement is not allowed. Units only advance automatically.');
    return false;
  }

  // Force movement for effects (Push/Pull/Teleport)
  public moveUnitForced(unit: IUnit, newPosition: Position): boolean {
    if (!this.isValidPosition(newPosition) || !this.isEmpty(newPosition)) {
      return false;
    }
    
    // Update board
    this.state.board.tiles[unit.position.row][unit.position.col] = null;
    this.state.board.tiles[newPosition.row][newPosition.col] = unit.id;
    
    // Update unit position
    const oldPos = { ...unit.position };
    unit.position = newPosition;
    
    this.emit('unitMoved', { unit, from: oldPos, to: newPosition, forced: true });
    
    return true;
  }

  // Enhanced attack validation with proper range checking
  public attack(attackerId: string, targetId: string): boolean {
    const attacker = this.getUnitById(attackerId);
    const target = this.getUnitById(targetId);

    if (!attacker || !target || !this.canAttack(attacker, target)) {
      return false;
    }

    this.saveHistory();

    // Perform attack
    attacker.hasAttacked = true;
    const damage = attacker.attack;
    target.health -= damage;

    this.emit('unitAttacked', { attacker, target, damage });

    // Handle death
    if (target.health <= 0) {
      this.handleUnitDeath(target, attacker);
    }

    // Handle attack effects
    this.effectSystem.handleAttack(attacker, target);

    return true;
  }

  public attackSpawnTile(attackerId: string, position: Position): boolean {
    const attacker = this.getUnitById(attackerId);
    if (!attacker || !this.canAttackSpawnTile(attacker, position)) {
      return false;
    }

    this.saveHistory();

    // Determine which player owns the spawn tile
    const targetPlayerId = position.row === 0 ? 2 : 1;
    const targetPlayer = this.state.players.find(p => p.id === targetPlayerId);
    
    if (!targetPlayer) return false;

    attacker.hasAttacked = true;
    targetPlayer.health -= attacker.attack;

    this.emit('spawnTileAttacked', { 
      attacker, 
      position, 
      targetPlayerId, 
      damage: attacker.attack 
    });

    if (targetPlayer.health <= 0) {
      this.endGame(attacker.playerId, `${targetPlayer.name} was defeated!`);
    }

    return true;
  }

  private canAttack(attacker: IUnit, target: IUnit): boolean {
    if (attacker.playerId === target.playerId) return false;
    if (!this.canUnitAttack(attacker)) return false;
    if (this.state.phase !== GamePhase.BATTLE) return false;

    // Check if target is in valid attack range
    if (!this.isInAttackRange(attacker.position, target.position, attacker.playerId)) {
      return false;
    }

    // Check for taunt
    return this.checkTauntRules(attacker, target);
  }

  private canAttackSpawnTile(attacker: IUnit, position: Position): boolean {
    if (!this.canUnitAttack(attacker)) return false;
    if (this.state.phase !== GamePhase.BATTLE) return false;

    // Check if it's an enemy spawn tile
    const enemySpawnRow = this.getEnemySpawnRow(attacker.playerId);
    if (position.row !== enemySpawnRow) return false;

    // Check if attacker is in range to attack spawn tile
    if (!this.isInAttackRange(attacker.position, position, attacker.playerId)) {
      return false;
    }

    // Check if tile is empty (can only attack empty spawn tiles)
    if (!this.isEmpty(position)) return false;

    // Check for taunt units
    const enemyPlayerId = attacker.playerId === 1 ? 2 : 1;
    const enemyPlayer = this.state.players.find(p => p.id === enemyPlayerId);
    const hasTaunt = enemyPlayer?.units.some(u => u.effects.some(e => e.type === 'TAUNT'));
    
    return !hasTaunt;
  }

  private isInAttackRange(attackerPos: Position, targetPos: Position, attackerPlayerId: number): boolean {
    const direction = attackerPlayerId === 1 ? -1 : 1;
    
    // Can attack:
    // 1. Directly in front (same column, next row in attack direction)
    // 2. Diagonally in front (adjacent column, next row in attack direction)
    
    const rowDiff = targetPos.row - attackerPos.row;
    const colDiff = Math.abs(targetPos.col - attackerPos.col);
    
    // Must be in the next row in the attack direction
    if (rowDiff !== direction) return false;
    
    // Must be in same column or adjacent column
    if (colDiff > 1) return false;
    
    return true;
  }

  private canUnitAttack(unit: IUnit): boolean {
    return !unit.hasAttacked && this.state.phase === GamePhase.BATTLE;
  }

  // Targeting mode for effects that require player selection
  public enterTargetingMode(source: IUnit, effect: IEffect): void {
    const validTargets = this.effectSystem.getValidTargets(effect, source);
    
    if (validTargets.length === 0) {
      this.logger.warn('No valid targets for effect');
      return;
    }
    
    this.state.targetingMode = {
      active: true,
      sourceUnit: source,
      effect: effect,
      validTargets: validTargets,
      message: this.getTargetingMessage(effect),
      callback: (target: any) => {
        this.effectSystem.executeEffectAction(source, effect, target);
        this.exitTargetingMode();
      }
    };
    
    this.emit('targetingModeEntered', this.state.targetingMode);
  }

  public exitTargetingMode(): void {
    this.state.targetingMode = null;
    this.emit('targetingModeExited');
  }

  private getTargetingMessage(effect: IEffect): string {
    switch (effect.action) {
      case EffectAction.ROOT:
        return 'Select a unit to root';
      case EffectAction.PUSH:
        return 'Select a unit to push forward';
      case EffectAction.PULL:
        return 'Select a unit to pull back';
      case EffectAction.TELEPORT:
        return 'Select a unit to teleport';
      case EffectAction.DISCARD:
        return 'Select a card to discard';
      case EffectAction.RETURN_TO_HAND:
        return 'Select cards to return to hand';
      case EffectAction.RESURRECT:
        return 'Select a unit to resurrect';
      default:
        return 'Select a target';
    }
  }

  public getValidAttackTargets(unitId: string): any[] {
    const unit = this.getUnitById(unitId);
    if (!unit || !this.canUnitAttack(unit)) return [];
    
    const targets: any[] = [];
    const direction = unit.playerId === 1 ? -1 : 1;
    const targetRow = unit.position.row + direction;
    
    // Check positions in attack range
    for (let colOffset = -1; colOffset <= 1; colOffset++) {
      const targetCol = unit.position.col + colOffset;
      const targetPos = { row: targetRow, col: targetCol };
      
      if (!this.isValidPosition(targetPos)) continue;
      
      // Check for enemy unit
      const targetUnitId = this.state.board.tiles[targetRow][targetCol];
      if (targetUnitId) {
        const targetUnit = this.getUnitById(targetUnitId);
        if (targetUnit && targetUnit.playerId !== unit.playerId) {
          if (this.checkTauntRules(unit, targetUnit)) {
            targets.push(targetUnit);
          }
        }
      } else {
        // Check if it's an enemy spawn tile
        const enemySpawnRow = this.getEnemySpawnRow(unit.playerId);
        if (targetRow === enemySpawnRow) {
          // Can attack empty spawn tiles if no taunts
          const enemyPlayerId = unit.playerId === 1 ? 2 : 1;
          const enemyPlayer = this.state.players.find(p => p.id === enemyPlayerId);
          const hasTaunt = enemyPlayer?.units.some(u => u.effects.some(e => e.type === 'TAUNT'));
          
          if (!hasTaunt) {
            targets.push({ 
              isSpawnTile: true, 
              position: targetPos,
              playerId: enemyPlayerId 
            });
          }
        }
      }
    }
    
    return targets;
  }

  private endTurn(): void {
    // Reset current player's units
    const currentPlayer = this.getCurrentPlayer();
    currentPlayer.units.forEach(unit => {
      unit.hasAttacked = false;
    });

    // Switch to next player
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % 2 as 0 | 1;
    
    // Only increment turn number when going back to player 1
    if (this.state.currentPlayerIndex === 0) {
      this.state.turnNumber++;
    }
    
    const newPlayer = this.getCurrentPlayer() as Player;
    newPlayer.startTurn(); // Let Player handle personal turn count and mana
    
    this.emit('turnEnded', { playerId: newPlayer.id, turnNumber: this.state.turnNumber });
    
    // Check if new player needs to place Kriper
    this.checkKriperPhase();
  }

  private createUnit(card: ICard, playerId: number, position: Position): IUnit {
    return {
      id: this.generateId(),
      cardId: card.id,
      name: card.name,
      playerId,
      attack: card.attack || 0,
      health: card.health || 1,
      maxHealth: card.health || 1,
      position,
      effects: [...card.effects],
      icon: card.icon,
      hasMoved: false,
      hasAttacked: false,
      buffs: [],
      isRooted: false,
      advancesThisTurn: 0
    };
  }

  // Public method for effect system
  public createUnitFromCard(card: ICard, playerId: number, position: Position): IUnit {
    const unit = this.createUnit(card, playerId, position);
    const player = this.state.players.find(p => p.id === playerId);
    
    if (player) {
      player.units.push(unit);
      this.state.board.tiles[position.row][position.col] = unit.id;
      this.emit('unitCreated', { unit, playerId });
    }
    
    return unit;
  }

  private checkTauntRules(attacker: IUnit, target: IUnit): boolean {
    const enemyUnits = this.state.players
      .find(p => p.id !== attacker.playerId)?.units || [];
    
    const tauntUnits = enemyUnits.filter(u => 
      u.effects.some(e => e.type === 'TAUNT')
    );

    if (tauntUnits.length === 0) return true;
    
    return target.effects.some(e => e.type === 'TAUNT');
  }

  private handleUnitDeath(unit: IUnit, killer?: IUnit): void {
    this.state.board.tiles[unit.position.row][unit.position.col] = null;
    
    const player = this.state.players.find(p => p.id === unit.playerId);
    if (player) {
      const index = player.units.findIndex(u => u.id === unit.id);
      if (index !== -1) {
        player.units.splice(index, 1);
        
        const card = this.cardDatabase.getCard(unit.cardId);
        if (card) {
          player.graveyard.push(card);
        }
      }
    }

    this.emit('unitDied', { unit, killer });
    this.effectSystem.handleUnitDeath(unit, killer);
  }

  public handleUnitReachedSpawn(unit: IUnit): void {
    this.endGame(unit.playerId, `${unit.name} reached enemy spawn!`);
  }

  private checkWinConditions(): void {
    for (const player of this.state.players) {
      const enemySpawnRow = this.getEnemySpawnRow(player.id);
      const hasUnitOnEnemySpawn = player.units.some(u => u.position.row === enemySpawnRow);
      
      if (hasUnitOnEnemySpawn) {
        this.endGame(player.id, 'Unit reached enemy spawn!');
        return;
      }
    }

    for (const player of this.state.players) {
      if (player.health <= 0) {
        const winnerId = player.id === 1 ? 2 : 1;
        this.endGame(winnerId, 'Opponent defeated!');
        return;
      }
    }
  }

  private endGame(winnerId: number, reason: string): void {
    this.state.gameOver = true;
    this.state.winner = winnerId;
    this.emit('gameEnded', { winner: winnerId, reason });
    this.logger.info(`Game ended - Player ${winnerId} wins! ${reason}`);
  }

  private saveHistory(): void {
    if (this.history.length >= this.historyLimit) {
      this.history.shift();
    }
    this.history.push(this.deepClone(this.state));
  }

  private deepClone<T>(obj: T): T {
    // Handle Map serialization
    const replacer = (key: string, value: any) => {
      if (value instanceof Map) {
        return {
          _type: 'Map',
          entries: Array.from(value.entries())
        };
      }
      return value;
    };
    
    const reviver = (key: string, value: any) => {
      if (value && value._type === 'Map') {
        return new Map(value.entries);
      }
      return value;
    };
    
    return JSON.parse(JSON.stringify(obj, replacer), reviver);
  }

  private emit(event: string, data?: any): void {
    const gameEvent: IGameEvent = {
      type: event,
      playerId: this.getCurrentPlayer().id,
      data,
      timestamp: Date.now()
    };
    
    this.eventBus.emit(event, gameEvent);
    this.logger.debug(`Event: ${event}`, data);
  }

  public on(event: string, handler: Function): void {
    this.eventBus.on(event, handler);
  }

  public getState(): Readonly<IGameState> {
    return this.state;
  }

  public getConfig(): Readonly<IGameConfig> {
    return this.config;
  }

  public getCurrentPlayer(): IPlayer {
    return this.state.players[this.state.currentPlayerIndex];
  }

  public getPlayerById(playerId: number): IPlayer | undefined {
    return this.state.players.find(p => p.id === playerId);
  }

  public getSpawnRow(playerId: number): number {
    return playerId === 1 ? this.config.boardRows - 1 : 0;
  }

  public getEnemySpawnRow(playerId: number): number {
    return playerId === 1 ? 0 : this.config.boardRows - 1;
  }

  public getValidSpawnPositions(playerId: number): Position[] {
    const positions: Position[] = [];
    const spawnRow = this.getSpawnRow(playerId);
    
    for (let col = 0; col < this.config.boardCols; col++) {
      if (this.isEmpty({ row: spawnRow, col })) {
        positions.push({ row: spawnRow, col });
      }
    }
    
    return positions;
  }

  public isValidPosition(pos: Position): boolean {
    return pos.row >= 0 && pos.row < this.config.boardRows &&
           pos.col >= 0 && pos.col < this.config.boardCols;
  }

  public isEmpty(pos: Position): boolean {
    return this.state.board.tiles[pos.row][pos.col] === null;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public destroy(): void {
    this.eventBus.clear();
    this.effectSystem.destroy();
    this.logger.info('Game engine destroyed');
  }

  private getUnitById(unitId: string): IUnit | undefined {
    for (const player of this.state.players) {
      const unit = player.units.find(u => u.id === unitId);
      if (unit) return unit;
    }
    return undefined;
  }

  public playCard(cardIndex: number, position: Position): IMove {
    const currentPlayer = this.getCurrentPlayer();
    
    // Validate card index
    if (cardIndex < 0 || cardIndex >= currentPlayer.hand.length) {
      return { 
        type: 'play', 
        cardIndex, 
        target: position, 
        success: false, 
        error: 'Invalid card index' 
      };
    }
    
    // Validate phase
    if (this.state.phase !== GamePhase.PLAY) {
      return { 
        type: 'play', 
        cardIndex, 
        target: position, 
        success: false, 
        error: 'Can only play cards during Play phase' 
      };
    }
    
    const card = currentPlayer.hand[cardIndex];
    
    // Calculate effective cost with reductions
    let effectiveCost = card.cost;
    if (currentPlayer.costReductions && currentPlayer.costReductions.has(card.archetype)) {
      const reduction = currentPlayer.costReductions.get(card.archetype)!;
      effectiveCost = Math.max(0, card.cost - reduction);
      
      // Apply reduction and remove it (one-time use)
      currentPlayer.costReductions.delete(card.archetype);
    }
    
    // Validate mana
    if (effectiveCost > currentPlayer.mana) {
      return { 
        type: 'play', 
        cardIndex, 
        target: position, 
        success: false, 
        error: 'Not enough mana' 
      };
    }
    
    // Validate position
    const spawnRow = this.getSpawnRow(currentPlayer.id);
    if (position.row !== spawnRow) {
      return { 
        type: 'play', 
        cardIndex, 
        target: position, 
        success: false, 
        error: 'Units must be played on spawn row' 
      };
    }
    
    if (!this.isEmpty(position)) {
      return { 
        type: 'play', 
        cardIndex, 
        target: position, 
        success: false, 
        error: 'Position is occupied' 
      };
    }
    
    // Execute card play
    this.saveHistory();
    
    // Remove card from hand
    currentPlayer.hand.splice(cardIndex, 1);
    
    // Deduct mana (use effective cost)
    currentPlayer.mana -= effectiveCost;
    
    // Handle different card types
    if (card.type === CardType.UNIT) {
      const unit = this.createUnit(card, currentPlayer.id, position);
      currentPlayer.units.push(unit);
      this.state.board.tiles[position.row][position.col] = unit.id;
      
      this.emit('unitPlayed', { playerId: currentPlayer.id, unit, card });
      
      // Handle play effects
      this.effectSystem.handleUnitPlayed(unit);
    } else if (card.type === CardType.SPELL) {
      // Handle spell cards (to be implemented)
      this.emit('spellPlayed', { playerId: currentPlayer.id, card });
    }
    
    return { 
      type: 'play', 
      cardIndex, 
      target: position, 
      success: true 
    };
  }

  public debugDeckContents(): void {
    this.state.players.forEach((player, index) => {
      console.group(`Player ${index + 1} - ${player.name}`);
      console.log('Hand:', player.hand.map(c => `${c.cost}💎 ${c.name}`));
      console.log('Deck size:', player.deck.length);
      console.log('First 5 deck cards:', player.deck.slice(0, 5).map(c => `${c.cost}💎 ${c.name}`));
      console.groupEnd();
    });
  }

  private getDeckDisplayName(deckId: string, deckType: string): string {
    if (deckType === 'custom') {
      const savedDecks = JSON.parse(localStorage.getItem('savedDecks') || '[]');
      const deck = savedDecks.find((d: any) => d.id === deckId);
      return deck?.name || 'Custom Deck';
    } else {
      // Preset deck names
      switch (deckId) {
        case 'aggro-rush': return 'Aggro Rush';
        case 'control-defense': return 'Control Defense';
        case 'balanced-starter': return 'Balanced Starter';
        default: return 'Starter Deck';
      }
    }
  }

  public getDeckName(playerId: number): string {
    return this.deckNames.get(playerId) || 'Unknown Deck';
  }
}