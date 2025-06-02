import { IEffect, EffectType, TargetType, EffectAction } from '../../types';
import { EventBus } from '../../utils/EventBus';

interface ActionConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  requiresValue: boolean;
  requiresTarget: boolean;
  requiresTargetCount?: boolean; // NEW: For multi-target selection
  targetOptions?: TargetOption[];
  valueOptions?: ValueOption;
  yarSupported?: boolean;
  customOptions?: CustomOption[]; // NEW: For special options
}

interface TargetOption {
  type: TargetType;
  name: string;
  icon: string;
  description: string;
}

interface ValueOption {
  min: number;
  max: number;
  default: number;
  label: string;
  icon: string;
}

interface CustomOption {
  id: string;
  label: string;
  type: 'checkbox' | 'select';
  options?: string[];
}

export class EffectActionModal {
  private container: HTMLElement;
  private eventBus: EventBus;
  private effectType: EffectType;
  private onComplete: (effect: IEffect) => void;
  private selectedAction: string | null = null;
  private selectedTarget: TargetType | null = null;
  private selectedValue: number = 1;
  private selectedTargetCount: number = 1; // NEW
  private useYAR: boolean = false;
  private customOptions: Map<string, any> = new Map(); // NEW

  private actionConfigs: Record<string, ActionConfig[]> = {
    [EffectType.WARSHOUT]: [
      {
        id: 'buff',
        name: 'Power Up Friends',
        icon: '💪',
        description: 'Make your other units stronger!',
        requiresValue: true,
        requiresTarget: true,
        requiresTargetCount: true,
        targetOptions: [
          { type: TargetType.SELF, name: 'Just Me', icon: '👤', description: 'Only affects this unit' },
          { type: TargetType.ALLY, name: 'My Friends', icon: '👥', description: 'Affects friendly units' },
          { type: TargetType.ALL, name: 'Everyone!', icon: '🌍', description: 'Affects all units' }
        ],
        valueOptions: { min: 1, max: 5, default: 1, label: 'Power Boost', icon: '⬆️' },
        yarSupported: true
      },
      {
        id: 'draw',
        name: 'Draw Cards',
        icon: '📖',
        description: 'Get more cards from your deck!',
        requiresValue: true,
        requiresTarget: false,
        valueOptions: { min: 1, max: 3, default: 1, label: 'Cards to Draw', icon: '🃏' }
      },
      {
        id: 'damage',
        name: 'Blast Enemies',
        icon: '🔥',
        description: 'Hurt the bad guys!',
        requiresValue: true,
        requiresTarget: true,
        requiresTargetCount: true,
        targetOptions: [
          { type: TargetType.ENEMY, name: 'Enemies', icon: '👹', description: 'Hurts enemy units' },
          { type: TargetType.ALL, name: 'Everyone!', icon: '💥', description: 'Hurts all units (even yours!)' }
        ],
        valueOptions: { min: 1, max: 5, default: 2, label: 'Damage', icon: '💢' },
        yarSupported: true
      },
      {
        id: 'heal',
        name: 'Heal Friends',
        icon: '💚',
        description: 'Make your units healthy again!',
        requiresValue: true,
        requiresTarget: true,
        requiresTargetCount: true,
        targetOptions: [
          { type: TargetType.SELF, name: 'Just Me', icon: '🩹', description: 'Heals only this unit' },
          { type: TargetType.ALLY, name: 'My Friends', icon: '💉', description: 'Heals friendly units' }
        ],
        valueOptions: { min: 1, max: 5, default: 2, label: 'Health Restored', icon: '❤️' },
        yarSupported: true
      },
      {
        id: 'teleport',
        name: 'Teleport',
        icon: '🌀',
        description: 'Move to any tile instantly!',
        requiresValue: false,
        requiresTarget: true,
        targetOptions: [
          { type: TargetType.SELF, name: 'Teleport Me', icon: '🏃', description: 'This unit teleports' }
        ],
        yarSupported: true,
        customOptions: [
          { id: 'freeTarget', label: 'Target any tile on board', type: 'checkbox' }
        ]
      },
      {
        id: 'reduceCost',
        name: 'Cheaper Cards',
        icon: '💰',
        description: 'Make your next unit cost less mana!',
        requiresValue: true,
        requiresTarget: false,
        valueOptions: { min: 1, max: 3, default: 1, label: 'Cost Reduction', icon: '⬇️' }
      },
      {
        id: 'summon',
        name: 'Call Helpers',
        icon: '✨',
        description: 'Create copies of this unit!',
        requiresValue: true,
        requiresTarget: false,
        valueOptions: { min: 1, max: 2, default: 1, label: 'Copies to Summon', icon: '👥' }
      },
      {
        id: 'root',
        name: 'Root',
        icon: '🌱',
        description: 'Stop enemies from moving forward!',
        requiresValue: true,
        requiresTarget: true,
        requiresTargetCount: true,
        targetOptions: [
          { type: TargetType.ENEMY, name: 'Enemy', icon: '🦶', description: 'Stops an enemy unit' },
          { type: TargetType.ALL, name: 'All Enemies', icon: '🛑', description: 'Stops all enemy units' }
        ],
        valueOptions: { min: 1, max: 3, default: 1, label: 'Turns Rooted', icon: '⏱️' },
        yarSupported: true
      }
    ],
    [EffectType.STRIKE]: [
      {
        id: 'damage',
        name: 'Extra Punch',
        icon: '👊',
        description: 'Deal 1 extra damage when attacking!',
        requiresValue: true,
        requiresTarget: false,
        valueOptions: { min: 1, max: 1, default: 1, label: 'Extra Damage', icon: '💥' }
      },
      {
        id: 'push',
        name: 'Knockback',
        icon: '🌊',
        description: 'Push enemies away when you hit them!',
        requiresValue: true,
        requiresTarget: false,
        valueOptions: { min: 1, max: 2, default: 1, label: 'Push Distance', icon: '➡️' }
      },
      {
        id: 'stun',
        name: 'Stun Hit',
        icon: '⚡',
        description: 'Stun enemy - they can\'t move or attack next turn!',
        requiresValue: true,
        requiresTarget: false,
        valueOptions: { min: 1, max: 1, default: 1, label: 'Stun Duration', icon: '🔒' }
      },
      {
        id: 'heal',
        name: 'Life Steal',
        icon: '🩸',
        description: 'Heal yourself when attacking!',
        requiresValue: true,
        requiresTarget: false,
        valueOptions: { min: 1, max: 3, default: 1, label: 'Health Stolen', icon: '💉' }
      }
    ],
    [EffectType.DEATHBLOW]: [
      {
        id: 'damage',
        name: 'Final Explosion',
        icon: '💥',
        description: 'Go out with a BANG!',
        requiresValue: true,
        requiresTarget: true,
        targetOptions: [
          { type: TargetType.ALL, name: 'Everyone', icon: '🌟', description: 'Damages all units' },
          { type: TargetType.ENEMY, name: 'Enemies Only', icon: '👹', description: 'Only hurts enemies' }
        ],
        valueOptions: { min: 1, max: 5, default: 2, label: 'Explosion Damage', icon: '💣' },
        customOptions: [
          { id: 'killerOnly', label: 'Only damage the unit that killed me', type: 'checkbox' }
        ]
      },
      {
        id: 'resurrect',
        name: 'Bring Back Friend',
        icon: '👻',
        description: 'Let player choose a unit from graveyard!',
        requiresValue: false,
        requiresTarget: false,
        customOptions: [
          { id: 'interactive', label: 'Player chooses (10s timer)', type: 'checkbox' }
        ]
      },
      {
        id: 'returnToHand',
        name: 'Second Chance',
        icon: '🔄',
        description: 'Return this unit to hand (once per unit)!',
        requiresValue: false,
        requiresTarget: false,
        customOptions: [
          { id: 'oncePerUnit', label: 'Can only trigger once per unit', type: 'checkbox' }
        ]
      },
      {
        id: 'buff',
        name: 'Last Gift',
        icon: '🎁',
        description: 'Make your friends stronger as you die!',
        requiresValue: true,
        requiresTarget: true,
        requiresTargetCount: true,
        targetOptions: [
          { type: TargetType.ALLY, name: 'My Friends', icon: '👥', description: 'Buffs friendly units' },
          { type: TargetType.ALL, name: 'Everyone', icon: '🌍', description: 'Buffs all units' }
        ],
        valueOptions: { min: 1, max: 3, default: 1, label: 'Power Given', icon: '💪' }
      }
    ],
    [EffectType.DEATHSTRIKE]: [
      {
        id: 'heal',
        name: 'Victory Heal',
        icon: '💚',
        description: 'Get health when you defeat enemies!',
        requiresValue: true,
        requiresTarget: false,
        valueOptions: { min: 1, max: 5, default: 2, label: 'Health Gained', icon: '❤️' }
      },
      {
        id: 'buff',
        name: 'Growing Power',
        icon: '📈',
        description: 'Get stronger with each victory!',
        requiresValue: true,
        requiresTarget: false,
        valueOptions: { min: 1, max: 2, default: 1, label: 'Power Increase', icon: '⬆️' }
      },
      {
        id: 'draw',
        name: 'Victory Card',
        icon: '🏆',
        description: 'Draw a card when you win a fight!',
        requiresValue: true,
        requiresTarget: false,
        valueOptions: { min: 1, max: 2, default: 1, label: 'Cards to Draw', icon: '🃏' }
      }
    ]
  };

  constructor(effectType: EffectType, onComplete: (effect: IEffect) => void) {
    this.effectType = effectType;
    this.onComplete = onComplete;
    this.eventBus = new EventBus();
    
    // Create modal container
    this.container = document.createElement('div');
    this.container.className = 'effect-modal-overlay';
    this.container.innerHTML = this.render();
    document.body.appendChild(this.container);
    
    this.setupEventHandlers();
  }

  private render(): string {
    const actions = this.actionConfigs[this.effectType] || [];
    
    return `
      <div class="effect-modal">
        <div class="effect-modal-content">
          <button class="modal-close" id="modal-close">×</button>
          
          <div class="modal-header">
            <h2>🎮 Choose Your Effect Action!</h2>
            <p>What should happen when ${this.getEffectTriggerText()}?</p>
          </div>
          
          <div class="modal-body">
            ${this.selectedAction === null ? this.renderActionSelection(actions) : this.renderActionConfiguration()}
          </div>
          
          <div class="modal-footer">
            ${this.selectedAction !== null ? 
              `<button class="btn btn-secondary" id="back-to-actions">← Back</button>` : ''
            }
            ${this.canComplete() ? 
              `<button class="btn btn-primary" id="complete-effect">✨ Add Effect!</button>` : ''
            }
          </div>
        </div>
      </div>
    `;
  }

  private renderActionSelection(actions: ActionConfig[]): string {
    return `
      <div class="action-grid">
        ${actions.map(action => `
          <button class="action-card" data-action="${action.id}">
            <div class="action-icon">${action.icon}</div>
            <div class="action-name">${action.name}</div>
            <div class="action-desc">${action.description}</div>
          </button>
        `).join('')}
      </div>
    `;
  }

  private renderActionConfiguration(): string {
    const action = this.getCurrentAction();
    if (!action) return '';
    
    return `
      <div class="action-config">
        <div class="config-header">
          <div class="config-icon">${action.icon}</div>
          <h3>${action.name}</h3>
        </div>
        
        ${action.requiresTarget ? this.renderTargetSelection(action) : ''}
        ${action.requiresTargetCount && this.selectedTarget !== TargetType.ALL ? this.renderTargetCountSelection() : ''}
        ${action.requiresValue ? this.renderValueSelection(action) : ''}
        ${action.yarSupported ? this.renderYAROption() : ''}
        ${action.customOptions ? this.renderCustomOptions(action) : ''}
        
        <div class="effect-preview">
          <h4>Effect Preview:</h4>
          <p>${this.generateEffectDescription()}</p>
        </div>
      </div>
    `;
  }

  private renderTargetSelection(action: ActionConfig): string {
    if (!action.targetOptions) return '';
    
    return `
      <div class="config-section">
        <h4>Who gets affected?</h4>
        <div class="target-options">
          ${action.targetOptions.map(target => `
            <button 
              class="target-btn ${this.selectedTarget === target.type ? 'selected' : ''}" 
              data-target="${target.type}"
            >
              <div class="target-icon">${target.icon}</div>
              <div class="target-name">${target.name}</div>
              <div class="target-desc">${target.description}</div>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderTargetCountSelection(): string {
    return `
      <div class="config-section">
        <h4>How many targets?</h4>
        <div class="value-selector">
          <div class="value-icon">🎯</div>
          <div class="value-slider-container">
            <input 
              type="range" 
              class="value-slider" 
              min="1" 
              max="5" 
              value="${this.selectedTargetCount}"
              id="target-count-slider"
            >
            <div class="value-display">
              <span class="value-number">${this.selectedTargetCount}</span>
            </div>
          </div>
          <div class="value-marks">
            ${Array.from({ length: 5 }, (_, i) => `
              <span class="value-mark">${i + 1}</span>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private renderValueSelection(action: ActionConfig): string {
    if (!action.valueOptions) return '';
    
    const { min, max, label, icon } = action.valueOptions;
    
    return `
      <div class="config-section">
        <h4>${label}</h4>
        <div class="value-selector">
          <div class="value-icon">${icon}</div>
          <div class="value-slider-container">
            <input 
              type="range" 
              class="value-slider" 
              min="${min}" 
              max="${max}" 
              value="${this.selectedValue}"
              id="value-slider"
            >
            <div class="value-display">
              <span class="value-number">${this.selectedValue}</span>
            </div>
          </div>
          <div class="value-marks">
            ${Array.from({ length: max - min + 1 }, (_, i) => `
              <span class="value-mark">${min + i}</span>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private renderYAROption(): string {
    return `
      <div class="config-section">
        <h4>Special Range Option</h4>
        <div class="yar-option">
          <label class="yar-checkbox">
            <input type="checkbox" id="yar-checkbox" ${this.useYAR ? 'checked' : ''}>
            <span class="checkbox-custom"></span>
            <span class="yar-label">
              <strong>YAR Mode</strong> - Only affects units near your spawn area (3 rows)
            </span>
          </label>
          <div class="yar-hint">
            🏰 This limits the effect to units close to your base!
          </div>
        </div>
      </div>
    `;
  }

  private renderCustomOptions(action: ActionConfig): string {
    if (!action.customOptions) return '';
    
    return `
      <div class="config-section">
        <h4>Special Options</h4>
        ${action.customOptions.map(option => {
          if (option.type === 'checkbox') {
            return `
              <label class="custom-checkbox">
                <input type="checkbox" id="custom-${option.id}" ${this.customOptions.get(option.id) ? 'checked' : ''}>
                <span class="checkbox-custom"></span>
                <span class="checkbox-label">${option.label}</span>
              </label>
            `;
          }
          return '';
        }).join('')}
      </div>
    `;
  }

  private getEffectTriggerText(): string {
    const triggers: Record<EffectType, string> = {
      [EffectType.WARSHOUT]: 'this unit enters the battlefield',
      [EffectType.STRIKE]: 'this unit attacks',
      [EffectType.DEATHBLOW]: 'this unit dies',
      [EffectType.DEATHSTRIKE]: 'this unit defeats an enemy',
      [EffectType.TAUNT]: 'enemies must attack this unit',
      [EffectType.SACRIFICE]: 'this unit is sacrificed',
      [EffectType.SUMMON]: 'this summons a unit',
      [EffectType.DRAW]: 'this draws cards',
      [EffectType.BUFF]: 'this buffs units',
      [EffectType.DAMAGE]: 'this deals damage',
      [EffectType.HEAL]: 'this heals units'
    };
    return triggers[this.effectType] || 'the effect triggers';
  }

  private getCurrentAction(): ActionConfig | null {
    if (!this.selectedAction) return null;
    const actions = this.actionConfigs[this.effectType] || [];
    return actions.find(a => a.id === this.selectedAction) || null;
  }

  private generateEffectDescription(): string {
    const action = this.getCurrentAction();
    if (!action) return 'Select an action...';
    
    let desc = `When ${this.getEffectTriggerText()}, `;
    
    switch (this.selectedAction) {
      case 'buff':
        desc += `give ${this.getTargetCountText()} ${this.getTargetText()} +${this.selectedValue}/+${this.selectedValue}`;
        break;
      case 'damage':
        if (this.customOptions.get('killerOnly')) {
          desc += `deal ${this.selectedValue} damage to the unit that killed this`;
        } else {
          desc += `deal ${this.selectedValue} damage to ${this.getTargetCountText()} ${this.getTargetText()}`;
        }
        break;
      case 'heal':
        desc += `heal ${this.getTargetCountText()} ${this.getTargetText()} for ${this.selectedValue}`;
        break;
      case 'draw':
        desc += `draw ${this.selectedValue} card${this.selectedValue > 1 ? 's' : ''}`;
        break;
      case 'root':
        desc += `root ${this.getTargetCountText()} ${this.getTargetText()} for ${this.selectedValue} turn${this.selectedValue > 1 ? 's' : ''}`;
        break;
      case 'push':
        desc += `push the attacked unit ${this.selectedValue} space${this.selectedValue > 1 ? 's' : ''} away`;
        break;
      case 'stun':
        desc += `stun the attacked unit for ${this.selectedValue} turn (can't move or attack)`;
        break;
      case 'teleport':
        if (this.customOptions.get('freeTarget')) {
          desc += `teleport this unit to any tile on the board`;
        } else {
          desc += `teleport ${this.getTargetText()} forward`;
        }
        break;
      case 'reduceCost':
        desc += `reduce the cost of your next unit by ${this.selectedValue}`;
        break;
      case 'summon':
        desc += `summon ${this.selectedValue} cop${this.selectedValue > 1 ? 'ies' : 'y'} of this unit`;
        break;
      case 'resurrect':
        if (this.customOptions.get('interactive')) {
          desc += `let player choose a unit from graveyard to resurrect (10s timer)`;
        } else {
          desc += `resurrect a random unit from graveyard`;
        }
        break;
      case 'returnToHand':
        desc += `return this unit to hand`;
        if (this.customOptions.get('oncePerUnit')) {
          desc += ' (once per unit only)';
        }
        break;
    }
    
    if (this.useYAR) {
      desc += ' (YAR - only near your spawn)';
    }
    
    desc += '.';
    return desc;
  }

  private getTargetText(): string {
    if (!this.selectedTarget) return 'targets';
    
    const targetTexts: Record<TargetType, string> = {
      [TargetType.SELF]: 'this unit',
      [TargetType.ALLY]: 'friendly unit(s)',
      [TargetType.ENEMY]: 'enemy unit(s)',
      [TargetType.ALL]: 'all units',
      [TargetType.ANY]: 'any unit'
    };
    
    return targetTexts[this.selectedTarget] || 'targets';
  }

  private getTargetCountText(): string {
    if (this.selectedTarget === TargetType.ALL) return '';
    if (this.selectedTargetCount === 1) return '';
    return `${this.selectedTargetCount}`;
  }

  private canComplete(): boolean {
    const action = this.getCurrentAction();
    if (!action || !this.selectedAction) return false;
    
    if (action.requiresTarget && !this.selectedTarget) return false;
    
    return true;
  }

  private setupEventHandlers(): void {
    // Close button
    document.getElementById('modal-close')?.addEventListener('click', () => {
      this.close();
    });
    
    // Click outside to close
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });
    
    // Action selection
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const actionCard = target.closest('.action-card') as HTMLElement;
      if (actionCard) {
        const action = actionCard.dataset.action;
        if (action) {
          this.selectedAction = action;
          this.updateModal();
        }
      }
    });
    
    // Back button
    this.container.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'back-to-actions') {
        this.selectedAction = null;
        this.selectedTarget = null;
        this.selectedValue = 1;
        this.selectedTargetCount = 1;
        this.updateModal();
      }
    });
    
    // Complete button - FIX THIS
    this.container.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'complete-effect') {
        if (this.canComplete()) {
          this.complete();
        }
      }
    });
  }

  private updateModal(): void {
    this.container.innerHTML = this.render();
    
    // Re-setup specific handlers after re-render
    if (this.selectedAction) {
      // Target selection
      document.querySelectorAll('.target-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = (e.currentTarget as HTMLElement).dataset.target as TargetType;
          this.selectedTarget = target;
          
          // Update UI
          document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('selected'));
          (e.currentTarget as HTMLElement).classList.add('selected');
          
          this.updateEffectPreview();
        });
      });
      
      // Target count slider
      const targetCountSlider = document.getElementById('target-count-slider') as HTMLInputElement;
      targetCountSlider?.addEventListener('input', (e) => {
        this.selectedTargetCount = parseInt((e.target as HTMLInputElement).value);
        const display = document.querySelector('.value-number');
        if (display) {
          display.textContent = this.selectedTargetCount.toString();
        }
        this.updateEffectPreview();
      });
      
      // Value slider
      const slider = document.getElementById('value-slider') as HTMLInputElement;
      slider?.addEventListener('input', (e) => {
        this.selectedValue = parseInt((e.target as HTMLInputElement).value);
        const display = document.querySelector('.value-number');
        if (display) {
          display.textContent = this.selectedValue.toString();
        }
        this.updateEffectPreview();
      });
      
      // YAR checkbox
      document.getElementById('yar-checkbox')?.addEventListener('change', (e) => {
        this.useYAR = (e.target as HTMLInputElement).checked;
        this.updateEffectPreview();
      });
      
      // Custom options
      const action = this.getCurrentAction();
      action?.customOptions?.forEach(option => {
        const element = document.getElementById(`custom-${option.id}`);
        element?.addEventListener('change', (e) => {
          if (option.type === 'checkbox') {
            this.customOptions.set(option.id, (e.target as HTMLInputElement).checked);
          }
          this.updateEffectPreview();
        });
      });
    }
  }

  private updateEffectPreview(): void {
    const preview = document.querySelector('.effect-preview p');
    if (preview) {
      preview.textContent = this.generateEffectDescription();
    }
  }

  private complete(): void {
    const action = this.getCurrentAction();
    if (!action) return;
    
    const effect: IEffect = {
      type: this.effectType,
      targetType: this.selectedTarget || TargetType.SELF,
      requiresTargeting: action.requiresTarget || false,
      action: this.getEffectAction(),
      value: action.requiresValue ? this.selectedValue : undefined,
      yar: this.useYAR && action.yarSupported ? true : undefined
    };
    
    // Add target count for multi-target effects
    if (action.requiresTargetCount && this.selectedTarget !== TargetType.ALL) {
      effect.targetCount = this.selectedTargetCount;
    }
    
    // Add custom options
    if (this.customOptions.size > 0) {
      effect.customData = Object.fromEntries(this.customOptions);
    }
    
    // Add area for area effects
    if (this.selectedTarget === TargetType.ALL) {
      effect.area = 'all';
    }
    
    this.onComplete(effect);
    this.close();
  }

  private getEffectAction(): EffectAction {
    const actionMapping: Record<string, EffectAction> = {
      'damage': EffectAction.DAMAGE,
      'heal': EffectAction.HEAL,
      'buff': EffectAction.BUFF,
      'draw': EffectAction.DRAW,
      'summon': EffectAction.SUMMON,
      'root': EffectAction.ROOT,
      'reduceCost': EffectAction.REDUCE_COST,
      'push': EffectAction.PUSH,
      'pull': EffectAction.PULL,
      'teleport': EffectAction.TELEPORT,
      'discard': EffectAction.DISCARD,
      'returnToHand': EffectAction.RETURN_TO_HAND,
      'resurrect': EffectAction.RESURRECT,
      'stun': EffectAction.STUN
    };
    
    return actionMapping[this.selectedAction!] || EffectAction.DAMAGE;
  }

  private close(): void {
    this.container.remove();
  }
}