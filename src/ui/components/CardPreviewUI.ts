// src/ui/components/CardPreviewUI.ts
import { ICard } from '../../types';

export class CardPreviewUI {
  private container: HTMLElement | null = null;
  private card: ICard | null = null;

  public mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  public update(card: ICard): void {
    this.card = card;
    this.render();
  }

  private render(): void {
    if (!this.container || !this.card) return;

    const rarityClass = `rarity-${(this.card.rarity || 'common').toLowerCase()}`;
    const effectIcons = this.getEffectIcons();

    this.container.innerHTML = `
      <div class="preview-card ${rarityClass}">
        <div class="preview-card-glow"></div>
        <div class="preview-card-inner">
          <div class="preview-card-header">
            <div class="preview-card-cost">
              <span class="cost-number">${this.card.cost || 0}</span>
            </div>
            <div class="preview-card-name">${this.card.name || 'Unnamed Card'}</div>
          </div>
          
          <div class="preview-card-art">
            <div class="preview-card-icon">${this.card.icon || '🦎'}</div>
            <div class="preview-card-frame ${rarityClass}"></div>
          </div>
          
          <div class="preview-card-type">
            <span class="type-badge">${this.card.type || 'UNIT'}</span>
            <span class="rarity-badge ${rarityClass}">${this.card.rarity || 'COMMON'}</span>
          </div>
          
          <div class="preview-card-text">
            <p class="card-description">${this.card.description || 'No description yet...'}</p>
            ${effectIcons ? `
              <div class="effect-icons">
                ${effectIcons}
              </div>
            ` : ''}
          </div>
          
          ${this.card.type === 'UNIT' ? `
            <div class="preview-card-stats">
              <div class="stat attack">
                <span class="stat-icon">⚔️</span>
                <span class="stat-value">${this.card.attack || 0}</span>
              </div>
              <div class="stat health">
                <span class="stat-icon">❤️</span>
                <span class="stat-value">${this.card.health || 0}</span>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Add animation class after a brief delay
    setTimeout(() => {
      const card = this.container?.querySelector('.preview-card');
      card?.classList.add('animate');
    }, 10);
  }

  private getEffectIcons(): string {
    if (!this.card || !this.card.effects || this.card.effects.length === 0) {
      return '';
    }

    const effectIconMap: Record<string, string> = {
      'WARSHOUT': '📣',
      'STRIKE': '⚡',
      'DEATHBLOW': '💀',
      'DEATHSTRIKE': '☠️',
      'TAUNT': '🛡️'
    };

    return this.card.effects
      .map(effect => {
        const icon = effectIconMap[effect.type] || '✨';
        return `<span class="effect-icon" title="${effect.type}">${icon}</span>`;
      })
      .join('');
  }

  public destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}