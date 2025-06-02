// src/ui/CardBuilder.ts
import { EventBus } from '../utils/EventBus';
import { Logger } from '../utils/Logger';
import { ICard, IEffect, CardType, Rarity, EffectType, TargetType, EffectAction } from '../types';
import { CardPreviewUI } from './components/CardPreviewUI';
import { EffectActionModal } from './components/EffectActionModal';
import '../styles/CardBuilder.css';

interface EffectOption {
  type: EffectType;
  name: string;
  icon: string;
  description: string;
}

export class CardBuilder {
  private container: HTMLElement;
  private eventBus: EventBus;
  private logger: Logger;
  private cardPreview: CardPreviewUI;
  private currentCard: Partial<ICard>;
  private currentStep: number = 1;
  private totalSteps: number = 5;
  private selectedEffects: IEffect[] = [];
  
  // All available emojis for card icons
  private availableIcons = [
    // Warriors & Fighters
    '⚔️', '🗡️', '🛡️', '🏹', '🪓', '⛏️', '🔨', '🔱', '🥊', '🥋',
    // Creatures
    '🐉', '🦎', '🐺', '🦅', '🦇', '🐻', '🦁', '🐯', '🦊', '🐗',
    '🦌', '🦏', '🦈', '🐊', '🦂', '🕷️', '🦟', '🐝', '🐛', '🦋',
    // Magical
    '🔮', '✨', '💫', '⭐', '🌟', '💎', '💠', '🔷', '🔶', '⚡',
    '🔥', '❄️', '💧', '🌊', '🌪️', '☄️', '🌈', '🌙', '☀️', '⚜️',
    // Undead & Dark
    '💀', '☠️', '👻', '👹', '👺', '🧟', '🧛', '🦴', '🩸', '🕯️',
    // Nature
    '🌳', '🌲', '🌿', '🍄', '🌺', '🌸', '🌼', '🌻', '🌹', '🥀',
    // Objects
    '👑', '💍', '📿', '🏺', '⚱️', '🗿', '🎭', '🪄', '📜', '🗝️'
  ];

  private effectOptions: EffectOption[] = [
    {
      type: EffectType.WARSHOUT,
      name: 'Warshout',
      icon: '📣',
      description: 'Triggers when this unit enters the battlefield'
    },
    {
      type: EffectType.STRIKE,
      name: 'Strike',
      icon: '⚡',
      description: 'Triggers when this unit attacks'
    },
    {
      type: EffectType.DEATHBLOW,
      name: 'Deathblow',
      icon: '💀',
      description: 'Triggers when this unit dies'
    },
    {
      type: EffectType.DEATHSTRIKE,
      name: 'Deathstrike',
      icon: '☠️',
      description: 'Triggers when this unit kills an enemy'
    },
    {
      type: EffectType.TAUNT,
      name: 'Taunt',
      icon: '🛡️',
      description: 'Enemies must attack this unit first'
    }
  ];

  constructor(container: HTMLElement) {
    this.container = container;
    this.eventBus = new EventBus();
    this.logger = new Logger('CardBuilder');
    
    // Initialize with default card
    this.currentCard = {
      id: this.generateCardId(),
      name: '',
      cost: 1,
      type: CardType.UNIT,
      archetype: 'Neutral',
      rarity: Rarity.COMMON,
      attack: 1,
      health: 1,
      effects: [],
      description: '',
      icon: '🦎'
    };
    
    this.cardPreview = new CardPreviewUI();
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="card-builder-container">
        <button class="back-button" id="builder-back">
          <span>← Back to Menu</span>
        </button>
        
        <div class="builder-header">
          <h1>Create Your Card</h1>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${(this.currentStep / this.totalSteps) * 100}%"></div>
          </div>
          <p class="step-indicator">Step ${this.currentStep} of ${this.totalSteps}</p>
        </div>
        
        <div class="builder-content">
          <div class="builder-left">
            ${this.renderCurrentStep()}
          </div>
          
          <div class="builder-right">
            <div class="card-preview-container">
              <h3>Live Preview</h3>
              <div id="card-preview"></div>
              <div class="preview-hint">This is how your card will look!</div>
            </div>
          </div>
        </div>
        
        <div class="builder-footer">
          ${this.currentStep > 1 ? '<button class="btn btn-secondary" id="prev-step">← Previous</button>' : ''}
          ${this.currentStep < this.totalSteps ? 
            '<button class="btn btn-primary" id="next-step">Next →</button>' : 
            '<button class="btn btn-success" id="save-card">✨ Create Card!</button>'
          }
        </div>
      </div>
    `;
    
    // Mount preview
    const previewContainer = document.getElementById('card-preview');
    if (previewContainer) {
      this.cardPreview.mount(previewContainer);
      this.cardPreview.update(this.currentCard as ICard);
    }
    
    this.setupEventHandlers();
  }

  private renderCurrentStep(): string {
    switch (this.currentStep) {
      case 1:
        return this.renderBasicInfoStep();
      case 2:
        return this.renderStatsStep();
      case 3:
        return this.renderIconStep();
      case 4:
        return this.renderEffectsStep();
      case 5:
        return this.renderReviewStep();
      default:
        return '';
    }
  }

  private renderBasicInfoStep(): string {
    return `
      <div class="step-content">
        <h2>✏️ Basic Information</h2>
        <p class="step-description">Let's start with the basics!</p>
        
        <div class="form-group">
          <label for="card-name">Card Name</label>
          <input 
            type="text" 
            id="card-name" 
            class="form-input" 
            placeholder="Enter a cool name..."
            value="${this.currentCard.name || ''}"
            maxlength="20"
          >
          <div class="input-hint">Give your card an awesome name!</div>
        </div>
        
        <div class="form-group">
          <label for="card-cost">Mana Cost</label>
          <div class="number-input-wrapper">
            <button class="number-btn minus" data-target="card-cost">-</button>
            <input 
              type="number" 
              id="card-cost" 
              class="form-input number-input" 
              min="0" 
              max="10" 
              value="${this.currentCard.cost || 1}"
            >
            <button class="number-btn plus" data-target="card-cost">+</button>
          </div>
          <div class="input-hint">How much mana to play this card?</div>
        </div>
        
        <div class="form-group">
          <label>Rarity</label>
          <div class="rarity-selector">
            ${Object.values(Rarity).map(rarity => `
              <button 
                class="rarity-btn ${this.currentCard.rarity === rarity ? 'selected' : ''}" 
                data-rarity="${rarity}"
              >
                <span class="rarity-gem rarity-${rarity.toLowerCase()}">💎</span>
                ${rarity}
              </button>
            `).join('')}
          </div>
          <div class="input-hint">How rare should your card be?</div>
        </div>
      </div>
    `;
  }

  private renderStatsStep(): string {
    return `
      <div class="step-content">
        <h2>⚔️ Combat Stats</h2>
        <p class="step-description">How strong is your unit?</p>
        
        <div class="stats-container">
          <div class="stat-group">
            <label for="card-attack">Attack Power</label>
            <div class="stat-input-wrapper">
              <div class="stat-icon attack">⚔️</div>
              <div class="number-input-wrapper">
                <button class="number-btn minus" data-target="card-attack">-</button>
                <input 
                  type="number" 
                  id="card-attack" 
                  class="form-input number-input stat-input" 
                  min="0" 
                  max="20" 
                  value="${this.currentCard.attack || 1}"
                >
                <button class="number-btn plus" data-target="card-attack">+</button>
              </div>
            </div>
            <div class="input-hint">Damage dealt to enemies</div>
          </div>
          
          <div class="stat-group">
            <label for="card-health">Health Points</label>
            <div class="stat-input-wrapper">
              <div class="stat-icon health">❤️</div>
              <div class="number-input-wrapper">
                <button class="number-btn minus" data-target="card-health">-</button>
                <input 
                  type="number" 
                  id="card-health" 
                  class="form-input number-input stat-input" 
                  min="1" 
                  max="20" 
                  value="${this.currentCard.health || 1}"
                >
                <button class="number-btn plus" data-target="card-health">+</button>
              </div>
            </div>
            <div class="input-hint">Damage it can take</div>
          </div>
        </div>
        
        <div class="stat-preview">
          <div class="preview-title">Your unit will be:</div>
          <div class="preview-stats">
            <span class="preview-attack">${this.currentCard.attack || 1}</span>
            <span>/</span>
            <span class="preview-health">${this.currentCard.health || 1}</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderIconStep(): string {
    return `
      <div class="step-content">
        <h2>🎨 Choose an Icon</h2>
        <p class="step-description">Pick a cool icon for your card!</p>
        
        <div class="icon-grid">
          ${this.availableIcons.map(icon => `
            <button 
              class="icon-btn ${this.currentCard.icon === icon ? 'selected' : ''}" 
              data-icon="${icon}"
            >
              ${icon}
            </button>
          `).join('')}
        </div>
        
        <div class="current-icon-display">
          <div class="current-icon">${this.currentCard.icon}</div>
          <p>Current Icon</p>
        </div>
      </div>
    `;
  }

  private renderEffectsStep(): string {
    return `
      <div class="step-content">
        <h2>✨ Add Special Effects</h2>
        <p class="step-description">Make your card unique! You can add up to 2 effects.</p>
        
        <div class="effects-container">
          ${this.selectedEffects.length < 2 ? `
            <div class="add-effect-section">
              <h3>Choose an Effect Type:</h3>
              <div class="effect-type-grid">
                ${this.effectOptions.map(effect => `
                  <button 
                    class="effect-type-btn" 
                    data-effect-type="${effect.type}"
                    ${this.selectedEffects.some(e => e.type === effect.type) ? 'disabled' : ''}
                  >
                    <div class="effect-icon">${effect.icon}</div>
                    <div class="effect-name">${effect.name}</div>
                    <div class="effect-desc">${effect.description}</div>
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div class="selected-effects">
            <h3>Your Effects (${this.selectedEffects.length}/2):</h3>
            ${this.selectedEffects.length === 0 ? 
              '<p class="no-effects">No effects added yet</p>' :
              this.selectedEffects.map((effect, index) => this.renderSelectedEffect(effect, index)).join('')
            }
          </div>
        </div>
      </div>
    `;
  }

  private renderSelectedEffect(effect: IEffect, index: number): string {
    const effectOption = this.effectOptions.find(e => e.type === effect.type);
    if (!effectOption) return '';
    
    return `
      <div class="selected-effect">
        <div class="effect-header">
          <span class="effect-icon">${effectOption.icon}</span>
          <span class="effect-name">${effectOption.name}</span>
          <button class="remove-effect-btn" data-effect-index="${index}">×</button>
        </div>
        <div class="effect-details">
          ${this.getEffectDescription(effect)}
        </div>
      </div>
    `;
  }

  private getEffectDescription(effect: IEffect): string {
    // Generate a human-readable description based on the effect configuration
    let desc = '';
    
    if (effect.type === EffectType.TAUNT) {
      return 'Enemies must attack this unit first.';
    }
    
    // Add more detailed descriptions based on the effect's properties
    return desc || 'Custom effect configured.';
  }

  private renderReviewStep(): string {
    const description = this.generateCardDescription();
    this.currentCard.description = description;
    
    return `
      <div class="step-content">
        <h2>🎉 Review Your Card</h2>
        <p class="step-description">Everything looks good? Let's create your card!</p>
        
        <div class="review-summary">
          <div class="summary-item">
            <span class="summary-label">Name:</span>
            <span class="summary-value">${this.currentCard.name || 'Unnamed'}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Cost:</span>
            <span class="summary-value">${this.currentCard.cost} Mana</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Stats:</span>
            <span class="summary-value">${this.currentCard.attack}/${this.currentCard.health}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Rarity:</span>
            <span class="summary-value rarity-${this.currentCard.rarity?.toLowerCase()}">${this.currentCard.rarity}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Effects:</span>
            <span class="summary-value">${this.selectedEffects.length} effect(s)</span>
          </div>
        </div>
        
        <div class="description-preview">
          <h3>Card Description:</h3>
          <p>${description}</p>
        </div>
        
        <div class="final-message">
          <p>🌟 Your card is ready to be created!</p>
          <p>Click "Create Card" to add it to your collection.</p>
        </div>
      </div>
    `;
  }

  private generateCardDescription(): string {
    if (this.selectedEffects.length === 0) {
      return '';
    }
    
    const descriptions: string[] = [];
    
    this.selectedEffects.forEach(effect => {
      let desc = '';
      const effectOption = this.effectOptions.find(e => e.type === effect.type);
      
      if (effectOption) {
        // Add the trigger
        desc = `${effectOption.name}: `;
        
        // Add the action description
        switch (effect.action) {
          case EffectAction.DAMAGE:
            desc += `Deal ${effect.value || 1} damage to ${this.getTargetDescription(effect.targetType)}`;
            break;
          case EffectAction.HEAL:
            desc += `Heal ${this.getTargetDescription(effect.targetType)} for ${effect.value || 1}`;
            break;
          case EffectAction.BUFF:
            desc += `Give ${this.getTargetDescription(effect.targetType)} +${effect.value || 1}/+${effect.value || 1}`;
            break;
          case EffectAction.DRAW:
            desc += `Draw ${effect.value || 1} card${(effect.value || 1) > 1 ? 's' : ''}`;
            break;
          case EffectAction.ROOT:
            desc += `Root ${this.getTargetDescription(effect.targetType)} for ${effect.value || 1} turn${(effect.value || 1) > 1 ? 's' : ''}`;
            break;
          case EffectAction.SUMMON:
            desc += `Summon ${effect.value || 1} 1/1 token${(effect.value || 1) > 1 ? 's' : ''}`;
            break;
          default:
            desc += effectOption.name;
        }
        
        if (effect.yar) {
          desc += ' (YAR)';
        }
        
        descriptions.push(desc);
      }
    });
    
    return descriptions.join('. ');
  }

  private getTargetDescription(targetType: TargetType): string {
    switch (targetType) {
      case TargetType.SELF: return 'this unit';
      case TargetType.ALLY: return 'friendly units';
      case TargetType.ENEMY: return 'enemy units';
      case TargetType.ALL: return 'all units';
      case TargetType.ANY: return 'any unit';
      default: return 'target';
    }
  }

  private setupEventHandlers(): void {
    // Back button
    const backBtn = document.getElementById('builder-back');
    backBtn?.addEventListener('click', () => {
      this.eventBus.emit('closeCardBuilder');
    });
    
    // Navigation buttons
    const prevBtn = document.getElementById('prev-step');
    const nextBtn = document.getElementById('next-step');
    const saveBtn = document.getElementById('save-card');
    
    prevBtn?.addEventListener('click', () => this.previousStep());
    nextBtn?.addEventListener('click', () => this.nextStep());
    saveBtn?.addEventListener('click', () => this.saveCard());
    
    // Step-specific handlers
    this.setupStepHandlers();
  }

  private setupStepHandlers(): void {
    switch (this.currentStep) {
      case 1:
        this.setupBasicInfoHandlers();
        break;
      case 2:
        this.setupStatsHandlers();
        break;
      case 3:
        this.setupIconHandlers();
        break;
      case 4:
        this.setupEffectsHandlers();
        break;
    }
  }

  private setupBasicInfoHandlers(): void {
    // Name input
    const nameInput = document.getElementById('card-name') as HTMLInputElement;
    nameInput?.addEventListener('input', (e) => {
      this.currentCard.name = (e.target as HTMLInputElement).value;
      this.updatePreview();
    });
    
    // Cost input
    const costInput = document.getElementById('card-cost') as HTMLInputElement;
    costInput?.addEventListener('input', (e) => {
      this.currentCard.cost = parseInt((e.target as HTMLInputElement).value) || 0;
      this.updatePreview();
    });
    
    // Number buttons
    document.querySelectorAll('.number-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).dataset.target;
        const input = document.getElementById(target!) as HTMLInputElement;
        const isPlus = (e.currentTarget as HTMLElement).classList.contains('plus');
        
        if (input) {
          const currentValue = parseInt(input.value) || 0;
          const min = parseInt(input.min) || 0;
          const max = parseInt(input.max) || 99;
          
          if (isPlus && currentValue < max) {
            input.value = (currentValue + 1).toString();
          } else if (!isPlus && currentValue > min) {
            input.value = (currentValue - 1).toString();
          }
          
          input.dispatchEvent(new Event('input'));
        }
      });
    });
    
    // Rarity buttons
    document.querySelectorAll('.rarity-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rarity = (e.currentTarget as HTMLElement).dataset.rarity as Rarity;
        this.currentCard.rarity = rarity;
        
        // Update UI
        document.querySelectorAll('.rarity-btn').forEach(b => b.classList.remove('selected'));
        (e.currentTarget as HTMLElement).classList.add('selected');
        
        this.updatePreview();
      });
    });
  }

  private setupStatsHandlers(): void {
    // Attack input
    const attackInput = document.getElementById('card-attack') as HTMLInputElement;
    attackInput?.addEventListener('input', (e) => {
      this.currentCard.attack = parseInt((e.target as HTMLInputElement).value) || 0;
      this.updatePreview();
    });
    
    // Health input
    const healthInput = document.getElementById('card-health') as HTMLInputElement;
    healthInput?.addEventListener('input', (e) => {
      this.currentCard.health = parseInt((e.target as HTMLInputElement).value) || 1;
      this.updatePreview();
    });
    
    // Number buttons
    this.setupBasicInfoHandlers(); // Reuse number button logic
  }

  private setupIconHandlers(): void {
    document.querySelectorAll('.icon-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const icon = (e.currentTarget as HTMLElement).dataset.icon!;
        this.currentCard.icon = icon;
        
        // Update UI
        document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('selected'));
        (e.currentTarget as HTMLElement).classList.add('selected');
        
        // Update current icon display
        const currentIconDisplay = document.querySelector('.current-icon');
        if (currentIconDisplay) {
          currentIconDisplay.textContent = icon;
        }
        
        this.updatePreview();
      });
    });
  }

  private setupEffectsHandlers(): void {
    // Effect type buttons
    document.querySelectorAll('.effect-type-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const effectType = (e.currentTarget as HTMLElement).dataset.effectType as EffectType;
        this.showEffectActionSelector(effectType);
      });
    });
    
    // Remove effect buttons
    document.querySelectorAll('.remove-effect-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.currentTarget as HTMLElement).dataset.effectIndex!);
        this.selectedEffects.splice(index, 1);
        this.currentCard.effects = this.selectedEffects;
        this.render();
        this.updatePreview();
      });
    });
  }

  private showEffectActionSelector(effectType: EffectType): void {
    if (effectType === EffectType.TAUNT) {
      // Taunt is passive, add it directly
      const effect: IEffect = {
        type: effectType,
        targetType: TargetType.SELF,
        requiresTargeting: false
      };
      
      this.selectedEffects.push(effect);
      this.currentCard.effects = this.selectedEffects;
      this.render();
      this.updatePreview();
    } else {
      // Show modal for other effects
      const modal = new EffectActionModal(effectType, (effect) => {
        this.selectedEffects.push(effect);
        this.currentCard.effects = this.selectedEffects;
        this.render();
        this.updatePreview();
      });
    }
  }

  private updatePreview(): void {
    this.cardPreview.update(this.currentCard as ICard);
  }

  private previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.render();
    }
  }

  private nextStep(): void {
    if (this.validateCurrentStep() && this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.render();
    }
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        if (!this.currentCard.name || this.currentCard.name.trim() === '') {
          alert('Please enter a card name!');
          return false;
        }
        return true;
      case 2:
        return true; // Stats have defaults
      case 3:
        return true; // Icon has default
      case 4:
        return true; // Effects are optional
      default:
        return true;
    }
  }

  private saveCard(): void {
    // Final validation
    if (!this.currentCard.name || this.currentCard.name.trim() === '') {
      alert('Card must have a name!');
      return;
    }
    
    // Complete the card
    const completeCard: ICard = {
      ...this.currentCard as ICard,
      id: this.generateCardId(),
      description: this.generateCardDescription()
    };
    
    // Save to localStorage (in a real app, this would go to a database)
    const customCards = JSON.parse(localStorage.getItem('customCards') || '[]');
    customCards.push(completeCard);
    localStorage.setItem('customCards', JSON.stringify(customCards));
    
    // Show success message
    alert(`🎉 "${completeCard.name}" has been created!`);
    
    // Emit event
    this.eventBus.emit('cardCreated', completeCard);
  }

  private generateCardId(): string {
    return `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public on(event: string, handler: Function): void {
    this.eventBus.on(event, handler);
  }

  public destroy(): void {
    this.cardPreview.destroy();
    this.eventBus.clear();
  }
}
