// src/utils/Constants.ts
import { IGameConfig } from '../types'; // Changed from '@types/index'

export const DEFAULT_CONFIG: IGameConfig = {
  boardRows: 5,
  boardCols: 7,
  startingHealth: 30,
  startingHandSize: 3,
  maxHandSize: 7,
  maxMana: 10,
  startingMana: 1,
  fatigueStartTurn: 15,
  yarRange: 2
};

export const ANIMATION_DURATIONS = {
  cardPlay: 500,
  unitMove: 300,
  unitAttack: 400,
  unitDeath: 600,
  effectTrigger: 350,
  damageNumber: 800
};

export const UI_CONSTANTS = {
  tileSize: 80,
  cardWidth: 100,
  cardHeight: 140,
  handSpacing: 10,
  boardPadding: 20
};

export const EFFECT_ICONS: Record<string, string> = {
  WARSHOUT: '📣',
  DEATHBLOW: '💥',
  DEATHSTRIKE: '☠️',
  STRIKE: '⚡',
  TAUNT: '🛡️',
  SACRIFICE: '🩸',
  SUMMON: '✨',
  DRAW: '📖',
  BUFF: '💪',
  DAMAGE: '🔥',
  HEAL: '💚'
};