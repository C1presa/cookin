// src/effects/EffectSystem.ts - Enhanced with new effect actions
import { GameEngine } from '../core/GameEngine';
import { 
  IUnit, 
  IEffect, 
  EffectType, 
  EffectAction,
  ICard, 
  IPlayer,
  Position,
  IEffectResult,
  ITargetFilter,
  IBuff,
  TargetType
} from '../types';
import { Logger } from '../utils/Logger';
import { EventBus } from '../utils/EventBus';
import { Player } from '../core/Player';
import { VisualEffectsSystem } from '../ui/components/VisualEffectsSystem';

export class EffectSystem {
  private gameEngine: GameEngine;
  private logger: Logger;
  private eventBus: EventBus;
  private effectStack: string[] = [];
  private maxStackDepth = 10;
  private visualEffects: VisualEffectsSystem;

  constructor(gameEngine: GameEngine, eventBus: EventBus) {
    this.gameEngine = gameEngine;
    this.eventBus = eventBus;
    this.logger = new Logger('EffectSystem');
    this.visualEffects = new VisualEffectsSystem();
  }

  public handleUnitPlayed(unit: IUnit): void {
    this.logger.info(`Unit played: ${unit.name}, effects:`, unit.effects);
    
    // Handle Warshout effects
    const warshoutEffects = unit.effects.filter(e => e.type === EffectType.WARSHOUT);
    
    warshoutEffects.forEach(effect => {
      this.logger.info(`Processing warshout effect:`, effect);
      this.executeWarshout(unit, effect);
    });
  }

  public handleAttack(attacker: IUnit, target: IUnit): void {
    // Handle Strike effects
    const strikeEffects = attacker.effects.filter(e => e.type === EffectType.STRIKE);
    
    for (const effect of strikeEffects) {
      this.logger.info(`Processing Strike effect from ${attacker.name} against ${target.name}`);
      // Pass the target to executeStrike
      this.executeStrike(attacker, effect, target);
    }
  }

  public handleUnitDeath(unit: IUnit, killer?: IUnit): void {
    // Handle Deathblow effects
    const deathblowEffects = unit.effects.filter(e => e.type === EffectType.DEATHBLOW);
    
    for (const effect of deathblowEffects) {
      this.executeDeathblow(unit, effect, killer);
    }
    
    // Handle Deathstrike effects from killer
    if (killer) {
      const deathstrikeEffects = killer.effects.filter(e => e.type === EffectType.DEATHSTRIKE);
      for (const effect of deathstrikeEffects) {
        this.executeDeathstrike(killer, effect, unit);
      }
    }
  }

  public handleAdvancePhase(): void {
    const state = this.gameEngine.getState();
    
    // Update rooted units
    for (const player of state.players) {
      for (const unit of player.units) {
        if (unit.isRooted && unit.rootDuration !== undefined) {
          unit.rootDuration--;
          if (unit.rootDuration <= 0) {
            unit.isRooted = false;
            delete unit.rootDuration;
            this.eventBus.emit('rootExpired', { unit });
          }
        }
      }
    }
  }

  // Execute specific effect types
  private executeWarshout(source: IUnit, effect: IEffect): void {
    this.logger.debug(`Executing Warshout from ${source.name}`, effect);
    
    // If the effect doesn't require targeting, execute immediately
    if (!effect.requiresTargeting) {
      // For area effects, find all valid targets
      if (effect.area === 'all' || effect.targetType === TargetType.ALL) {
        const targets = this.getValidTargets(effect, source);
        targets.forEach(target => {
          this.executeEffectAction(source, effect, target);
        });
      } else {
        // Single target, non-targeting effects (like draw)
        this.executeEffectAction(source, effect, undefined);
      }
    } else {
      // Create targeting mode for player to select target
      this.gameEngine.enterTargetingMode(source, effect);
    }
  }

  private executeStrike(source: IUnit, effect: IEffect, target: IUnit): void {
    this.logger.debug(`Executing Strike from ${source.name} against ${target.name}`);
    // Strike effects always target the attacked unit
    this.executeEffectAction(source, effect, target);
  }

  private executeDeathblow(source: IUnit, effect: IEffect, killer?: IUnit): void {
    this.logger.debug(`Executing Deathblow from ${source.name}`);
    this.executeEffectAction(source, effect, killer);
  }

  private executeDeathstrike(source: IUnit, effect: IEffect, victim: IUnit): void {
    this.logger.debug(`Executing Deathstrike from ${source.name}`);
    this.executeEffectAction(source, effect, victim);
  }

  // Main effect action execution
  public executeEffectAction(source: IUnit | ICard, effect: IEffect, target?: any): IEffectResult {
    const action = effect.action || this.inferActionFromEffect(effect);
    
    this.logger.info(`Executing effect action: ${action}`, { source, effect, target });
    
    switch (action) {
      case EffectAction.DAMAGE:
        return this.executeDamage(source, effect, target);
        
      case EffectAction.HEAL:
        return this.executeHeal(source, effect, target);
        
      case EffectAction.BUFF:
        return this.executeBuff(source, effect, target);
        
      case EffectAction.DRAW:
        return this.executeDraw(source, effect);
        
      case EffectAction.ROOT:
        return this.executeRoot(source, effect, target);
        
      case EffectAction.REDUCE_COST:
        return this.executeReduceCost(source, effect, target);
        
      case EffectAction.PUSH:
        return this.executePush(source, effect, target);
        
      case EffectAction.PULL:
        return this.executePull(source, effect, target);
        
      case EffectAction.TELEPORT:
        return this.executeTeleport(source, effect, target);
        
      case EffectAction.DISCARD:
        return this.executeDiscard(source, effect, target);
        
      case EffectAction.RETURN_TO_HAND:
        return this.executeReturnToHand(source, effect, target);
        
      case EffectAction.RESURRECT:
        return this.executeResurrect(source, effect, target);
        
      default:
        this.logger.warn(`Unknown effect action: ${action}`);
        return { success: false, message: 'Unknown effect action' };
    }
  }

  // Individual effect action implementations
  private executeDamage(source: IUnit | ICard, effect: IEffect, target: IUnit | IPlayer): IEffectResult {
    if (!target || !effect.value) return { success: false };
    
    if ('health' in target) {
      target.health -= effect.value;
      this.eventBus.emit('damageDealt', { source, target, damage: effect.value });
      
      if (target.health <= 0) {
        if ('playerId' in target) {
          this.eventBus.emit('unitDied', { unit: target });
        } else {
          this.eventBus.emit('playerDefeated', { player: target });
        }
      }
    }
    
    return { success: true };
  }

  private executeHeal(source: IUnit | ICard, effect: IEffect, target: IUnit | IPlayer): IEffectResult {
    if (!target || !effect.value) return { success: false };
    
    if ('health' in target && 'maxHealth' in target) {
      const healAmount = Math.min(effect.value, target.maxHealth - target.health);
      target.health += healAmount;
      this.eventBus.emit('healingDone', { source, target, amount: healAmount });
    }
    
    return { success: true };
  }

  private executeBuff(source: IUnit | ICard, effect: IEffect, target: IUnit): IEffectResult {
    if (!target || !effect.value) return { success: false };
    
    target.attack += effect.value;
    target.health += effect.value;
    target.maxHealth += effect.value;
    
    const buffs: IBuff[] = target.buffs || [];
    const sourceName = 'name' in source ? source.name : (source as ICard).id;
    const buff: IBuff = {
      id: this.generateId(),
      source: sourceName,
      attack: effect.value,
      health: effect.value,
      duration: -1 // Permanent
    };
    buffs.push(buff);
    target.buffs = buffs;
    
    this.eventBus.emit('buffApplied', { source, target, buff: effect.value });
    return { success: true };
  }

  private executeDraw(source: IUnit | ICard, effect: IEffect): IEffectResult {
    const playerId = 'playerId' in source ? source.playerId : this.gameEngine.getCurrentPlayer().id;
    const player = this.gameEngine.getPlayerById(playerId) as Player;
    
    if (!player) return { success: false };
    
    const drawCount = effect.value || 1;
    for (let i = 0; i < drawCount; i++) {
      const card = player.drawCard();
      if (card) {
        this.eventBus.emit('cardDrawn', { playerId: player.id, card });
      }
    }
    
    return { success: true };
  }

  private executeRoot(source: IUnit | ICard, effect: IEffect, target: IUnit): IEffectResult {
    if (!target) return { success: false };
    
    // Validate target is valid according to YAR if specified
    if (effect.yar && !this.isInYAR(target)) {
      return { success: false, message: 'Target not in YAR' };
    }
    
    target.isRooted = true;
    target.rootDuration = effect.value || 1; // Default 1 turn
    
    const buffs: IBuff[] = target.buffs || [];
    const sourceName = 'name' in source ? source.name : (source as ICard).id;
    const buff: IBuff = {
      id: this.generateId(),
      source: sourceName,
      type: 'ROOT',
      duration: target.rootDuration
    };
    buffs.push(buff);
    target.buffs = buffs;
    
    this.eventBus.emit('unitRooted', { source, target, duration: target.rootDuration });
    return { success: true };
  }

  private executeReduceCost(source: IUnit | ICard, effect: IEffect, target?: any): IEffectResult {
    const playerId = 'playerId' in source ? source.playerId : this.gameEngine.getCurrentPlayer().id;
    const player = this.gameEngine.getPlayerById(playerId);
    
    if (!player) return { success: false };
    
    const archetype = effect.filter?.type || 'DEMON'; // Default to DEMON if not specified
    const reduction = effect.value || 2;
    
    // Initialize cost reductions map if needed
    if (!player.costReductions) {
      player.costReductions = new Map();
    }
    
    // Add or update cost reduction for archetype
    const current = player.costReductions.get(archetype) || 0;
    player.costReductions.set(archetype, current + reduction);
    
    this.eventBus.emit('costReductionApplied', { 
      playerId, 
      archetype, 
      reduction,
      message: `Next ${archetype} costs (${reduction}) less` 
    });
    
    return { success: true };
  }

  private executePush(source: IUnit | ICard, effect: IEffect, target: IUnit): IEffectResult {
    if (!target || !('position' in source)) {
      this.logger.warn('Push effect requires a target and source with position');
      return { success: false, message: 'Invalid push configuration' };
    }
    
    const sourceUnit = source as IUnit;
    this.logger.info(`${sourceUnit.name} knocking back ${target.name}`);
    
    // Determine knockback direction based on relative positions
    let direction = 0;
    if (sourceUnit.position.row < target.position.row) {
      // Source is above target, push down
      direction = 1;
    } else if (sourceUnit.position.row > target.position.row) {
      // Source is below target, push up
      direction = -1;
    } else {
      // Same row - push based on who owns the unit
      // Push enemies away from our spawn
      direction = target.playerId === sourceUnit.playerId ? 0 : 
                  (sourceUnit.playerId === 1 ? -1 : 1);
    }
    
    if (direction === 0) {
      this.logger.info('Cannot determine push direction - units on same row');
      return { success: false, message: 'Cannot push - same row' };
    }
    
    const pushDistance = effect.value || 1;
    let pushed = false;
    let actualDistance = 0;
    
    for (let i = 0; i < pushDistance; i++) {
      const newRow = target.position.row + direction;
      const newPos = { row: newRow, col: target.position.col };
      
      if (this.gameEngine.isValidPosition(newPos) && this.gameEngine.isEmpty(newPos)) {
        // Update board state first
        const state = this.gameEngine.getState();
        state.board.tiles[target.position.row][target.position.col] = null;
        state.board.tiles[newRow][target.position.col] = target.id;
        
        // Update unit position
        target.position.row = newRow;
        pushed = true;
        actualDistance++;
        
        this.logger.info(`Pushed ${target.name} to row ${newRow}`);
      } else {
        this.logger.info(`Cannot push further - blocked at row ${newRow}`);
        break; // Can't push further
      }
    }
    
    if (pushed) {
      // Show visual effect
      const targetElement = document.querySelector(`[data-unit-id="${target.id}"]`) as HTMLElement;
      if (targetElement) {
        this.visualEffects.pushEffect(targetElement, actualDistance);
      }
      
      this.eventBus.emit('unitPushed', { 
        source, 
        target, 
        distance: actualDistance,
        newPosition: target.position 
      });
      
      // Check if unit reached enemy spawn after push
      const enemySpawnRow = this.gameEngine.getEnemySpawnRow(target.playerId);
      if (target.position.row === enemySpawnRow) {
        this.logger.info(`${target.name} was pushed to enemy spawn!`);
        this.gameEngine.handleUnitReachedSpawn(target);
      }
    }
    
    return { 
      success: pushed, 
      message: pushed ? `Pushed ${actualDistance} spaces` : 'Could not push unit' 
    };
  }

  private executePull(source: IUnit | ICard, effect: IEffect, target: IUnit): IEffectResult {
    if (!target) return { success: false };
    
    const direction = target.playerId === 1 ? 1 : -1; // Opposite of push
    const pullDistance = effect.value || 1;
    
    let pulled = false;
    for (let i = 0; i < pullDistance; i++) {
      const newRow = target.position.row + direction;
      const newPos = { row: newRow, col: target.position.col };
      
      if (this.gameEngine.isValidPosition(newPos) && this.gameEngine.isEmpty(newPos)) {
        this.gameEngine.moveUnitForced(target, newPos);
        pulled = true;
      } else {
        break; // Can't pull further
      }
    }
    
    if (pulled) {
      this.eventBus.emit('unitPulled', { source, target, distance: pullDistance });
    }
    
    return { success: pulled };
  }

  private executeTeleport(source: IUnit | ICard, effect: IEffect, target: IUnit): IEffectResult {
    if (!target || !('position' in source)) return { success: false };
    
    // Teleport target to position in front of source
    const sourceUnit = source as IUnit;
    const direction = sourceUnit.playerId === 1 ? -1 : 1;
    const teleportPos = {
      row: sourceUnit.position.row + direction,
      col: sourceUnit.position.col
    };
    
    if (this.gameEngine.isValidPosition(teleportPos) && this.gameEngine.isEmpty(teleportPos)) {
      const oldPos = { ...target.position };
      this.gameEngine.moveUnitForced(target, teleportPos);
      
      this.eventBus.emit('unitTeleported', { source, target, from: oldPos, to: teleportPos });
      return { success: true };
    }
    
    return { success: false, message: 'Invalid teleport destination' };
  }

  private executeDiscard(source: IUnit | ICard, effect: IEffect, target: ICard): IEffectResult {
    if (!target) return { success: false };
    
    const playerId = 'playerId' in source ? source.playerId : this.gameEngine.getCurrentPlayer().id;
    const player = this.gameEngine.getPlayerById(playerId);
    
    if (!player) return { success: false };
    
    const cardIndex = player.hand.findIndex(c => c.id === target.id);
    if (cardIndex === -1) return { success: false, message: 'Card not in hand' };
    
    const discarded = player.hand.splice(cardIndex, 1)[0];
    player.graveyard.push(discarded);
    
    this.eventBus.emit('cardDiscarded', { playerId, card: discarded });
    return { success: true };
  }

  private executeReturnToHand(source: IUnit | ICard, effect: IEffect, targets: ICard[]): IEffectResult {
    const playerId = 'playerId' in source ? source.playerId : this.gameEngine.getCurrentPlayer().id;
    const player = this.gameEngine.getPlayerById(playerId);
    
    if (!player || !targets || targets.length === 0) return { success: false };
    
    let returned = 0;
    for (const card of targets) {
      if (player.hand.length >= 7) break; // Hand limit
      
      const graveIndex = player.graveyard.findIndex(c => c.id === card.id);
      if (graveIndex !== -1) {
        const returnedCard = player.graveyard.splice(graveIndex, 1)[0];
        player.hand.push(returnedCard);
        returned++;
        
        this.eventBus.emit('cardReturnedToHand', { playerId, card: returnedCard });
      }
    }
    
    return { success: returned > 0, message: `Returned ${returned} cards to hand` };
  }

  private executeResurrect(source: IUnit | ICard, effect: IEffect, target: ICard): IEffectResult {
    if (!target || target.type !== 'UNIT') return { success: false };
    
    const playerId = 'playerId' in source ? source.playerId : this.gameEngine.getCurrentPlayer().id;
    const player = this.gameEngine.getPlayerById(playerId);
    
    if (!player) return { success: false };
    
    // Find valid spawn position
    const spawnPositions = this.gameEngine.getValidSpawnPositions(playerId);
    if (spawnPositions.length === 0) {
      return { success: false, message: 'No valid spawn positions' };
    }
    
    // Remove from graveyard
    const graveIndex = player.graveyard.findIndex(c => c.id === target.id);
    if (graveIndex === -1) return { success: false, message: 'Card not in graveyard' };
    
    player.graveyard.splice(graveIndex, 1);
    
    // Create unit at random spawn position
    const position = spawnPositions[Math.floor(Math.random() * spawnPositions.length)];
    const unit = this.gameEngine.createUnitFromCard(target, playerId, position);
    
    this.eventBus.emit('unitResurrected', { playerId, unit, card: target });
    return { success: true };
  }

  // Helper methods
  private isInYAR(unit: IUnit): boolean {
    const config = this.gameEngine.getConfig();
    const yarRange = config.yarRange || 3;
    const spawnRow = this.gameEngine.getSpawnRow(unit.playerId);
    
    if (unit.playerId === 1) {
      // Player 1: YAR is from spawn row (bottom) up to middle
      return unit.position.row >= spawnRow - yarRange + 1;
    } else {
      // Player 2: YAR is from spawn row (top) down to middle
      return unit.position.row <= spawnRow + yarRange - 1;
    }
  }

  private matchesFilter(target: any, filter: ITargetFilter = {}): boolean {
    // Check type and archetype
    if (filter.type && 'type' in target && target.type !== filter.type) return false;
    if (filter.archetype && 'archetype' in target && target.archetype !== filter.archetype) return false;
    
    // Check cost
    if ('cost' in target) {
      const cost = target.cost;
      if (filter.minCost !== undefined && cost < filter.minCost) return false;
      if (filter.maxCost !== undefined && cost > filter.maxCost) return false;
    }
    
    // Check attack
    if ('attack' in target) {
      const attack = target.attack;
      if (filter.minAttack !== undefined && attack < filter.minAttack) return false;
      if (filter.maxAttack !== undefined && attack > filter.maxAttack) return false;
    }
    
    // Check health
    if ('health' in target) {
      const health = target.health;
      if (filter.minHealth !== undefined && health < filter.minHealth) return false;
      if (filter.maxHealth !== undefined && health > filter.maxHealth) return false;
    }
    
    // Check for specific effect
    if (filter.hasEffect && 'effects' in target) {
      if (!target.effects.some((e: IEffect) => e.type === filter.hasEffect)) return false;
    }
    
    // Check location
    if (filter.location) {
      const state = this.gameEngine.getState();
      const playerId = 'playerId' in target ? target.playerId : this.gameEngine.getCurrentPlayer().id;
      const player = this.gameEngine.getPlayerById(playerId);
      
      if (!player) return false;
      
      switch (filter.location) {
        case 'field':
          if (!player.units.some(u => u.id === target.id)) return false;
          break;
        case 'hand':
          if (!player.hand.some(c => c.id === target.id)) return false;
          break;
        case 'graveyard':
          if (!player.graveyard.some(c => c.id === target.id)) return false;
          break;
      }
    }
    
    // Check controller filter
    if (filter.controller && 'playerId' in target) {
      const currentPlayerId = this.gameEngine.getCurrentPlayer().id;
      switch (filter.controller) {
        case 'SELF':
          if (target.playerId !== currentPlayerId) return false;
          break;
        case 'ENEMY':
          if (target.playerId === currentPlayerId) return false;
          break;
        // 'ANY' allows all
      }
    }
    
    // Check YAR filter
    if (filter.inYAR && 'position' in target) {
      if (!this.isInYAR(target as IUnit)) return false;
    }
    
    // Check rooted status
    if (filter.isRooted !== undefined && 'isRooted' in target) {
      if (target.isRooted !== filter.isRooted) return false;
    }
    
    return true;
  }

  public getValidTargets(effect: IEffect, source: IUnit | ICard): any[] {
    const state = this.gameEngine.getState();
    const targets: any[] = [];
    const sourcePlayerId = 'playerId' in source ? source.playerId : this.gameEngine.getCurrentPlayer().id;
    
    // Handle different target types
    switch (effect.targetType) {
      case TargetType.SELF:
        if ('position' in source) {
          targets.push(source);
        }
        break;
        
      case TargetType.ALLY:
        const allyPlayer = state.players.find(p => p.id === sourcePlayerId);
        if (allyPlayer) {
          targets.push(...allyPlayer.units.filter(u => u.id !== source.id));
        }
        break;
        
      case TargetType.ENEMY:
        const enemyPlayer = state.players.find(p => p.id !== sourcePlayerId);
        if (enemyPlayer) {
          targets.push(...enemyPlayer.units);
        }
        break;
        
      case TargetType.ALL:
        state.players.forEach(player => {
          targets.push(...player.units);
        });
        break;
        
      case TargetType.ANY:
        state.players.forEach(player => {
          targets.push(...player.units);
        });
        break;
    }
    
    // Apply YAR filtering if needed
    if (effect.yar) {
      return targets.filter(target => 'position' in target && this.isInYAR(target));
    }
    
    return targets;
  }

  private inferActionFromEffect(effect: IEffect): EffectAction {
    // Infer action from effect type if not explicitly set
    switch (effect.type) {
      case EffectType.DAMAGE:
        return EffectAction.DAMAGE;
      case EffectType.HEAL:
        return EffectAction.HEAL;
      case EffectType.BUFF:
        return EffectAction.BUFF;
      case EffectType.DRAW:
        return EffectAction.DRAW;
      case EffectType.SUMMON:
        return EffectAction.SUMMON;
      default:
        return EffectAction.DAMAGE; // Default fallback
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public destroy(): void {
    this.effectStack = [];
    this.visualEffects.destroy();
  }
}