// src/utils/CardValidator.ts
import { ICard, IEffect, EffectType, EffectAction, TargetType } from '../types';
import { Logger } from './Logger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  powerLevel: number; // 1-10 scale
  complexity: number; // 1-5 scale
}

export class CardValidator {
  private logger: Logger;
  
  // Effect action compatibility map
  private effectCompatibility: Record<EffectType, EffectAction[]> = {
    [EffectType.WARSHOUT]: [
      EffectAction.DAMAGE, EffectAction.HEAL, EffectAction.BUFF, 
      EffectAction.DRAW, EffectAction.SUMMON, EffectAction.ROOT,
      EffectAction.REDUCE_COST, EffectAction.TELEPORT
    ],
    [EffectType.STRIKE]: [
      EffectAction.DAMAGE, EffectAction.HEAL, EffectAction.PUSH, 
      EffectAction.ROOT
    ],
    [EffectType.DEATHBLOW]: [
      EffectAction.DAMAGE, EffectAction.RESURRECT, EffectAction.RETURN_TO_HAND,
      EffectAction.BUFF
    ],
    [EffectType.DEATHSTRIKE]: [
      EffectAction.HEAL, EffectAction.BUFF, EffectAction.DRAW
    ],
    [EffectType.TAUNT]: [], // Passive effect
    [EffectType.SACRIFICE]: [
      EffectAction.DAMAGE, EffectAction.HEAL, EffectAction.BUFF,
      EffectAction.SUMMON
    ],
    [EffectType.SUMMON]: [
      EffectAction.SUMMON
    ],
    [EffectType.DRAW]: [
      EffectAction.DRAW
    ],
    [EffectType.BUFF]: [
      EffectAction.BUFF
    ],
    [EffectType.DAMAGE]: [
      EffectAction.DAMAGE
    ],
    [EffectType.HEAL]: [
      EffectAction.HEAL
    ]
  };

  constructor() {
    this.logger = new Logger('CardValidator');
  }

  public validateCard(card: ICard): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      powerLevel: 0,
      complexity: 0
    };

    // Basic validation
    this.validateBasicProperties(card, result);
    
    // Effect validation
    this.validateEffects(card, result);
    
    // Power level calculation
    result.powerLevel = this.calculatePowerLevel(card);
    
    // Complexity calculation
    result.complexity = this.calculateComplexity(card);
    
    // Balance warnings
    this.checkBalance(card, result);
    
    result.isValid = result.errors.length === 0;
    
    return result;
  }

  private validateBasicProperties(card: ICard, result: ValidationResult): void {
    if (!card.name || card.name.trim().length === 0) {
      result.errors.push('Card must have a name');
    }
    
    if (card.cost < 0 || card.cost > 10) {
      result.errors.push('Card cost must be between 0 and 10');
    }
    
    if (card.type === 'UNIT') {
      if (card.attack === undefined || card.attack < 0) {
        result.errors.push('Unit must have non-negative attack');
      }
      
      if (card.health === undefined || card.health < 1) {
        result.errors.push('Unit must have at least 1 health');
      }
    }
  }

  private validateEffects(card: ICard, result: ValidationResult): void {
    card.effects.forEach((effect, index) => {
      // Check effect-action compatibility
      if (effect.action) {
        const compatibleActions = this.effectCompatibility[effect.type] || [];
        if (!compatibleActions.includes(effect.action)) {
          result.errors.push(
            `Effect ${index + 1}: ${effect.type} is not compatible with ${effect.action} action`
          );
        }
      }
      
      // Validate effect properties
      if (effect.requiresTargeting && !effect.targetType) {
        result.errors.push(`Effect ${index + 1}: Requires targeting but no target type specified`);
      }
      
      // Check for missing values
      if (this.effectNeedsValue(effect) && !effect.value) {
        result.warnings.push(`Effect ${index + 1}: May need a value property`);
      }
      
      // Validate YAR effects
      if (effect.yar && !this.supportsYAR(effect.action)) {
        result.warnings.push(`Effect ${index + 1}: YAR may not work with this action`);
      }
    });
    
    // Check for duplicate effects
    const effectTypes = card.effects.map(e => e.type);
    const duplicates = effectTypes.filter((type, index) => effectTypes.indexOf(type) !== index);
    if (duplicates.length > 0) {
      result.warnings.push(`Duplicate effect types: ${duplicates.join(', ')}`);
    }
  }

  private effectNeedsValue(effect: IEffect): boolean {
    const valueActions = [
      EffectAction.DAMAGE, EffectAction.HEAL, EffectAction.BUFF,
      EffectAction.DRAW, EffectAction.ROOT, EffectAction.REDUCE_COST,
      EffectAction.PUSH, EffectAction.PULL, EffectAction.RESURRECT,
      EffectAction.RETURN_TO_HAND
    ];
    
    return effect.action ? valueActions.includes(effect.action) : false;
  }

  private supportsYAR(action?: EffectAction): boolean {
    const yarActions = [
      EffectAction.DAMAGE, EffectAction.HEAL, EffectAction.BUFF, EffectAction.ROOT
    ];
    
    return action ? yarActions.includes(action) : false;
  }

  private calculatePowerLevel(card: ICard): number {
    let power = 0;
    
    // Base stats value (for units)
    if (card.type === 'UNIT') {
      const statTotal = (card.attack || 0) + (card.health || 0);
      const expectedStats = card.cost * 2 + 1; // Standard stat formula
      
      // Compare to vanilla stats
      power += Math.min(10, Math.max(1, 5 + (statTotal - expectedStats)));
      
      // Adjust for effects
      card.effects.forEach(effect => {
        power += this.getEffectPowerValue(effect);
      });
      
      // Normalize to cost
      power = Math.round(power * (10 / Math.max(1, card.cost)));
    }
    
    return Math.min(10, Math.max(1, power));
  }

  private getEffectPowerValue(effect: IEffect): number {
    // Base power values for different effects
    const powerMap: Partial<Record<EffectAction, number>> = {
      [EffectAction.DAMAGE]: 1.5,
      [EffectAction.HEAL]: 1,
      [EffectAction.BUFF]: 2,
      [EffectAction.DRAW]: 2.5,
      [EffectAction.RESURRECT]: 3,
      [EffectAction.ROOT]: 1.5,
      [EffectAction.REDUCE_COST]: 2
    };
    
    const basePower = effect.action ? (powerMap[effect.action] || 1) : 1;
    const valueMult = effect.value || 1;
    
    // Adjust for targeting
    let targetMult = 1;
    if (effect.targetType === TargetType.ALL) targetMult = 2;
    else if (effect.targetType === TargetType.ALLY) targetMult = 1.5;
    
    return basePower * valueMult * targetMult;
  }

  private calculateComplexity(card: ICard): number {
    let complexity = 1; // Base complexity
    
    // Add complexity for each effect
    complexity += card.effects.length;
    
    // Add complexity for targeting effects
    complexity += card.effects.filter(e => e.requiresTargeting).length * 0.5;
    
    // Add complexity for conditional effects
    card.effects.forEach(effect => {
      if (effect.type === EffectType.DEATHSTRIKE || effect.type === EffectType.STRIKE) {
        complexity += 0.5; // Conditional triggers
      }
      if (effect.yar) {
        complexity += 0.5; // Positional requirement
      }
    });
    
    return Math.min(5, Math.round(complexity));
  }

  private checkBalance(card: ICard, result: ValidationResult): void {
    // Check for overpowered combinations
    if (result.powerLevel > 8) {
      result.warnings.push('This card may be overpowered for its cost');
    }
    
    // Check for underpowered cards
    if (result.powerLevel < 3 && card.cost > 2) {
      result.warnings.push('This card may be underpowered for its cost');
    }
    
    // Check complexity vs cost
    if (result.complexity > 3 && card.cost < 3) {
      result.warnings.push('Complex effects on low-cost cards can be problematic');
    }
    
    // Specific combo warnings
    const hasResurrect = card.effects.some(e => e.action === EffectAction.RESURRECT);
    const hasDeathblow = card.effects.some(e => e.type === EffectType.DEATHBLOW);
    
    if (hasResurrect && hasDeathblow) {
      result.warnings.push('Resurrect + Deathblow can create infinite loops - use carefully');
    }
  }
  
  // Test a card in isolation
  public generateTestScenarios(card: ICard): string[] {
    const scenarios: string[] = [];
    
    scenarios.push(`Test ${card.name} (${card.cost} mana ${card.attack}/${card.health}):`);
    
    card.effects.forEach((effect, index) => {
      const effectOption = this.getEffectName(effect.type);
      
      switch (effect.type) {
        case EffectType.WARSHOUT:
          scenarios.push(`- On play: ${this.describeEffectAction(effect)}`);
          break;
          
        case EffectType.STRIKE:
          scenarios.push(`- When attacking: ${this.describeEffectAction(effect)}`);
          break;
          
        case EffectType.DEATHBLOW:
          scenarios.push(`- When dies: ${this.describeEffectAction(effect)}`);
          break;
          
        case EffectType.DEATHSTRIKE:
          scenarios.push(`- When kills enemy: ${this.describeEffectAction(effect)}`);
          break;
          
        case EffectType.TAUNT:
          scenarios.push(`- Enemies must attack this unit first`);
          break;
      }
    });
    
    return scenarios;
  }
  
  private getEffectName(type: EffectType): string {
    return type.charAt(0) + type.slice(1).toLowerCase();
  }
  
  private describeEffectAction(effect: IEffect): string {
    // Similar to the description generator but for testing
    const value = effect.value || 1;
    
    switch (effect.action) {
      case EffectAction.DAMAGE:
        return `Deal ${value} damage`;
      case EffectAction.HEAL:
        return `Restore ${value} health`;
      case EffectAction.BUFF:
        return `Give +${value}/+${value}`;
      case EffectAction.DRAW:
        return `Draw ${value} cards`;
      case EffectAction.RESURRECT:
        return `Resurrect ${value} units`;
      default:
        return 'Trigger effect';
    }
  }
}

// Usage in CardBuilder:
// const validator = new CardValidator();
// const validation = validator.validateCard(card);
// if (!validation.isValid) {
//   alert(`Card has errors: ${validation.errors.join(', ')}`);
// }