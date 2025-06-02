// src/ui/components/CardHoverPreview.ts
import { ICard } from '../../types';
import { EFFECT_ICONS } from '../../utils/Constants';

export class CardHoverPreview {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private currentCard: ICard | null = null;
  private hideTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.container = this.createContainer();
    document.body.appendChild(this.container);
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'card-hover-preview';
    container.style.cssText = `
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      background: var(--color-bg-secondary);
      border: 2px solid var(--color-border);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
      min-width: 300px;
      max-width: 400px;
    `;
    return container;
  }

  public show(card: ICard, event: MouseEvent): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    this.currentCard = card;
    this.updateContent(card);
    this.updatePosition(event);
    
    this.container.style.opacity = '1';
    this.isVisible = true;
  }

  public hide(): void {
    this.hideTimeout = setTimeout(() => {
      this.container.style.opacity = '0';
      this.isVisible = false;
      this.currentCard = null;
    }, 100);
  }

  public updatePosition(event: MouseEvent): void {
    if (!this.isVisible) return;

    const padding = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = event.clientX + padding;
    let y = event.clientY + padding;

    // Get container dimensions
    const rect = this.container.getBoundingClientRect();
    
    // Adjust position if it would go off screen
    if (x + rect.width > viewportWidth) {
      x = event.clientX - rect.width - padding;
    }
    
    if (y + rect.height > viewportHeight) {
      y = event.clientY - rect.height - padding;
    }

    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
  }

  private updateContent(card: ICard): void {
    const effectsHtml = card.effects.map(effect => {
      const icon = EFFECT_ICONS[effect.type] || '✨';
      return `<div class="preview-effect">
        <span class="effect-icon">${icon}</span>
        <span class="effect-type">${effect.type}</span>
      </div>`;
    }).join('');

    this.container.innerHTML = `
      <div class="preview-header">
        <h3 class="preview-name">${card.name}</h3>
        <div class="preview-cost">${card.cost}</div>
      </div>
      
      <div class="preview-body">
        <div class="preview-icon">${card.icon}</div>
        <div class="preview-type">${card.type} - ${card.archetype}</div>
        <div class="preview-rarity rarity-${card.rarity.toLowerCase()}">${card.rarity}</div>
        
        <div class="preview-description">${card.description}</div>
        
        ${effectsHtml ? `<div class="preview-effects">${effectsHtml}</div>` : ''}
        
        ${card.type === 'UNIT' ? `
          <div class="preview-stats">
            <span class="preview-attack">${card.attack || 0}</span>
            <span>/</span>
            <span class="preview-health">${card.health || 0}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  public destroy(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.container.remove();
  }
}