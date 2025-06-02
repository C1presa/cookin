// src/ui/components/PlayerStatsUI.ts
import { IPlayer } from '../../types';

export class PlayerStatsUI {
  private container: HTMLElement;
  private player: IPlayer;

  constructor(container: HTMLElement, player: IPlayer) {
    this.container = container;
    this.player = player;
    this.render();
  }

  public update(player: IPlayer): void {
    this.player = player;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = 'player-stats';

    this.container.innerHTML = `
      <h3>${this.player.name}</h3>
      <div class="stats">
        <div class="stat">
          <span class="stat-label">Health</span>
          <span class="stat-value health" id="health-${this.player.id}">${this.player.health}/${this.player.maxHealth}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Mana</span>
          <span class="stat-value mana">${this.player.mana}/${this.player.maxMana}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Cards in Hand</span>
          <span class="stat-value">${this.player.hand.length}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Cards in Deck</span>
          <span class="stat-value">${this.player.deck.length}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Units on Board</span>
          <span class="stat-value">${this.player.units.length}</span>
        </div>
      </div>
    `;
  }

  public showDamageAnimation(damage: number): void {
    // Flash the container
    this.container.classList.add('damage-flash');
    
    // Create floating damage number
    const damageEl = document.createElement('div');
    damageEl.className = 'floating-damage';
    damageEl.textContent = `-${damage}`;
    
    // Position it relative to the health stat
    const healthEl = this.container.querySelector(`#health-${this.player.id}`);
    if (healthEl) {
      const rect = healthEl.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      
      damageEl.style.position = 'absolute';
      damageEl.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
      damageEl.style.top = `${rect.top - containerRect.top}px`;
      damageEl.style.transform = 'translateX(-50%)';
      
      this.container.style.position = 'relative';
      this.container.appendChild(damageEl);
    }
    
    // Remove flash class after animation
    setTimeout(() => {
      this.container.classList.remove('damage-flash');
    }, 300);
    
    // Remove damage number after animation
    setTimeout(() => {
      damageEl.remove();
    }, 1000);
  }

  public showHealAnimation(amount: number): void {
    // Similar to damage but with heal styling
    const healEl = document.createElement('div');
    healEl.className = 'floating-heal';
    healEl.textContent = `+${amount}`;
    
    const healthEl = this.container.querySelector(`#health-${this.player.id}`);
    if (healthEl) {
      const rect = healthEl.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      
      healEl.style.position = 'absolute';
      healEl.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
      healEl.style.top = `${rect.top - containerRect.top}px`;
      healEl.style.transform = 'translateX(-50%)';
      
      this.container.style.position = 'relative';
      this.container.appendChild(healEl);
    }
    
    setTimeout(() => {
      healEl.remove();
    }, 1000);
  }
}