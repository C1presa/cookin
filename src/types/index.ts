// src/types/index.ts - Enhanced with new effect actions
export interface Position {
  row: number;
  col: number;
}

export interface Size {
  width: number;
  height: number;
}

export enum GamePhase {
  SETUP = 'SETUP',    
  DRAW = 'DRAW',
  ADVANCE = 'ADVANCE', 
  PLAY = 'PLAY',
  BATTLE = 'BATTLE',
  END = 'END'
}

export enum CardType {
  UNIT = 'UNIT',
  SPELL = 'SPELL'
}

export enum EffectType {
  WARSHOUT = 'WARSHOUT',
  DEATHBLOW = 'DEATHBLOW',
  DEATHSTRIKE = 'DEATHSTRIKE',
  STRIKE = 'STRIKE',
  TAUNT = 'TAUNT',
  SACRIFICE = 'SACRIFICE',
  SUMMON = 'SUMMON',
  DRAW = 'DRAW',
  BUFF = 'BUFF',
  DAMAGE = 'DAMAGE',
  HEAL = 'HEAL'
}

export enum EffectAction {
  // Existing basic actions
  DAMAGE = 'DAMAGE',
  HEAL = 'HEAL',
  DRAW = 'DRAW',
  BUFF = 'BUFF',
  SUMMON = 'SUMMON',
  
  // New advanced actions
  ROOT = 'ROOT',
  REDUCE_COST = 'REDUCE_COST',
  PUSH = 'PUSH',
  PULL = 'PULL',
  TELEPORT = 'TELEPORT',
  DISCARD = 'DISCARD',
  RETURN_TO_HAND = 'RETURN_TO_HAND',
  RESURRECT = 'RESURRECT',
  STUN = 'STUN'
}

export enum TargetType {
  SELF = 'SELF',
  ALLY = 'ALLY',
  ENEMY = 'ENEMY',
  ANY = 'ANY',
  ALL = 'ALL'
}

export enum Rarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY'
}

export interface ITargetFilter {
  type?: string;
  archetype?: string;
  minCost?: number;
  maxCost?: number;
  minAttack?: number;
  maxAttack?: number;
  minHealth?: number;
  maxHealth?: number;
  hasEffect?: EffectType;
  location?: 'field' | 'hand' | 'graveyard';
  controller?: 'SELF' | 'ENEMY' | 'ANY';
  inYAR?: boolean;
  isRooted?: boolean;
}

export interface IEffect {
  type: EffectType;
  targetType: TargetType;
  value?: number;
  filter?: ITargetFilter;
  area?: 'single' | 'all' | 'adjacent' | 'row' | 'column';
  yar?: boolean; // Your Area Ruling - limit targeting to YAR (spawn to middle row)
  requiresTargeting?: boolean;
  subEffects?: IEffect[];
  
  // New advanced effect properties
  action?: EffectAction;
  actionValue?: any;
  targetLocation?: 'FIELD' | 'HAND' | 'GRAVEYARD' | 'DECK';
  selfDamage?: number; // For effects that hurt the caster
  
  // New properties for multi-target and custom effects
  targetCount?: number; // For multi-target selection
  customData?: Record<string, any>; // For storing custom effect options
}

export interface ICard {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  archetype: string;
  rarity: Rarity;
  attack?: number;
  health?: number;
  effects: IEffect[];
  description: string;
  icon: string;
  costReduction?: number; // Temporary cost reduction
  originalCost?: number; // Store original cost when modified
}

export interface IUnit {
  id: string;
  cardId: string;
  name: string;
  playerId: number;
  attack: number;
  health: number;
  maxHealth: number;
  position: Position;
  effects: IEffect[];
  icon: string;
  hasMoved: boolean;
  hasAttacked: boolean;
  buffs: IBuff[];
  
  // New status properties
  isRooted?: boolean;
  rootDuration?: number;
  advancesThisTurn?: number; // Track multi-advances
}

export interface IBuff {
  id: string;
  source: string;
  attack?: number;
  health?: number;
  duration?: number; // -1 for permanent
  type?: string; // 'ROOT', 'COST_REDUCTION', etc.
}

export interface IPlayer {
  id: number;
  name: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  deck: ICard[];
  hand: ICard[];
  units: IUnit[];
  graveyard: ICard[];
  turnCount: number;
  fatigueDamage: number;
  costReductions?: Map<string, number>;
  statusEffects?: Map<string, any>;
  drawCard?: () => ICard | null;
  startTurn?: () => void;
  addCostReduction?: (archetype: string, amount: number) => void;
  getCostReduction?: (archetype: string) => number;
  useCostReduction?: (archetype: string) => void;
  addStatusEffect?: (effectType: string, data: any) => void;
  hasStatusEffect?: (effectType: string) => boolean;
  getStatusEffect?: (effectType: string) => any;
  removeStatusEffect?: (effectType: string) => void;
}

export interface IGameState {
  players: [IPlayer, IPlayer];
  board: IBoard;
  currentPlayerIndex: 0 | 1;
  phase: GamePhase;
  turnNumber: number;
  gameOver: boolean;
  winner: number | null;
  pendingActions: IPendingAction[];
  targetingMode: ITargetingMode | null;
  
  // New properties for advanced effects
  effectStack?: IEffectExecution[];
}

export interface IBoard {
  tiles: (string | null)[][]; // unit IDs or null
  rows: number;
  cols: number;
}

export interface IPendingAction {
  type: string;
  playerId: number;
  unitId?: string;
  cardId?: string;
  message: string;
}

export interface ITargetingMode {
  active: boolean;
  sourceUnit: IUnit;
  effect: IEffect;
  validTargets: (IUnit | Position | ICard)[];
  message: string;
  callback: (target: IUnit | Position | ICard) => void;
}

export interface IGameEvent {
  type: string;
  playerId?: number;
  data: any;
  timestamp: number;
}

export interface IGameConfig {
  boardRows: number;
  boardCols: number;
  startingHealth: number;
  startingHandSize: number;
  maxHandSize: number;
  maxMana: number;
  startingMana: number;
  fatigueStartTurn: number;
  yarRange: number; // How many rows from spawn constitute YAR (default 3)
}

// New interfaces for effect execution
export interface IEffectExecution {
  effect: IEffect;
  source: IUnit | ICard;
  target?: IUnit | Position | ICard | IPlayer;
  timestamp: number;
}

export interface IEffectResult {
  success: boolean;
  message?: string;
  chainedEffects?: IEffect[];
}

// AI Types
export interface IAIConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  thinkTime: number;
  evaluationDepth: number;
}

export interface IMove {
  type: 'play' | 'move' | 'attack' | 'endTurn';
  cardIndex?: number;
  unitId?: string;
  target?: Position | string;
  score?: number;
  success?: boolean;
  error?: string;
}

// UI Types
export interface IUIState {
  selectedCard: number | null;
  selectedUnit: string | null;
  highlightedTiles: Position[];
  validTargets: Position[];
  animations: IAnimation[];
  message: string | null;
}

export interface IAnimation {
  id: string;
  type: string;
  source: Position;
  target: Position;
  duration: number;
  startTime: number;
}

// Effect Context for execution
export interface IEffectContext {
  gameState: IGameState;
  source: IUnit | ICard;
  target?: IUnit | IPlayer | Position | ICard;
  eventBus: IEventBus;
}

// Event Bus Interface
export interface IEventBus {
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  emit(event: string, data?: any): void;
  clear(): void;
}

// Component Interface
export interface IComponent {
  id: string;
  initialize(): void;
  update(deltaTime: number): void;
  render(): void;
  cleanup(): void;
}

// Logger Interface
export interface ILogger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}