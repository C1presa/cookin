// src/ui/components/PlayerHandUI.ts
import { ICard, IPlayer, GamePhase } from '../../types';
import { CardHoverPreview } from './CardHoverPreview';

export class PlayerHandUI {
  private container: HTMLElement;
  private hand: ICard[];
  private onCardClick: (index: number) => void;
  private selectedCardIndex: number | null = null;
  private hoverPreview: CardHoverPreview | null;
  private isInteractive: boolean = true;
  private currentPlayerMana: number = 0;
  private currentPhase: GamePhase | null = null;

  constructor(
    container: HTMLElement,
    hand: ICard[],
    onCardClick: (index: number) => void,
    hoverPreview?: CardHoverPreview
  ) {
    this.container = container;
    this.hand = hand;
    this.onCardClick = onCardClick;
    this.hoverPreview = hoverPreview || null;
    this.render();
  }

  public update(hand: ICard[], playerMana?: number): void {
    this.hand = hand;
    if (playerMana !== undefined) {
      this.currentPlayerMana = playerMana;
    }
    this.render();
  }

  public setSelectedCard(index: number | null): void {
    this.selectedCardIndex = index;
    this.render();
  }

  public setInteractive(interactive: boolean, phase?: GamePhase): void {
    this.isInteractive = interactive;
    if (phase !== undefined) {
      this.currentPhase = phase;
    }
    this.render();
  }

  public setPlayerMana(mana: number): void {
    this.currentPlayerMana = mana;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = 'player-hand';
    
    // Only add non-interactive class if we're truly not in play phase
    const isPlayPhase = this.currentPhase === GamePhase.PLAY || this.currentPhase === null;
    const canInteract = this.isInteractive && isPlayPhase;
    
    if (!canInteract && this.currentPhase) {
      this.container.classList.add('non-interactive');
      
      // Add phase-specific message
      const messageEl = document.createElement('div');
      messageEl.className = 'phase-message';
      
      switch (this.currentPhase) {
        case GamePhase.DRAW:
          messageEl.textContent = 'Draw Phase...';
          break;
        case GamePhase.ADVANCE:
          messageEl.textContent = 'Units Advancing...';
          break;
        case GamePhase.BATTLE:
          messageEl.textContent = 'Battle Phase - Attack with units!';
          break;
        case GamePhase.END:
          messageEl.textContent = 'Ending Turn...';
          break;
        default:
          messageEl.textContent = 'Waiting...';
      }
      
      this.container.appendChild(messageEl);
    }

    if (this.hand.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-hand';
      emptyMessage.textContent = 'No cards in hand';
      this.container.appendChild(emptyMessage);
      return;
    }

    // Create card container
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-container';
    
    this.hand.forEach((card, index) => {
      const cardElement = this.createCard(card, index, canInteract);
      cardContainer.appendChild(cardElement);
    });
    
    this.container.appendChild(cardContainer);
  }

  private createCard(card: ICard, index: number, canInteract: boolean): HTMLElement {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    
    // Check if card is playable based on mana AND phase
    const hasEnoughMana = card.cost <= this.currentPlayerMana;
    const isPlayable = canInteract && hasEnoughMana;
    
    if (index === this.selectedCardIndex) {
      cardEl.classList.add('selected');
    }

    if (!canInteract) {
      cardEl.classList.add('disabled');
    } else if (!hasEnoughMana) {
      cardEl.classList.add('unplayable');
    } else {
      cardEl.classList.add('playable');
    }

    // Visual indicator for mana cost
    const costClass = hasEnoughMana ? 'affordable' : 'expensive';

    cardEl.innerHTML = `
      <div class="card-header">
        <div class="card-cost ${costClass}">${card.cost}</div>
        <div class="card-name">${card.name}</div>
      </div>
      <div class="card-body">
        <div class="card-icon">${card.icon}</div>
        <div class="card-description">${card.description}</div>
      </div>
      ${card.type === 'UNIT' ? `
        <div class="card-footer">
          <span class="card-attack">${card.attack || 0}</span>
          <span>/</span>
          <span class="card-health">${card.health || 0}</span>
        </div>
      ` : ''}
    `;

    // Only add click handler if truly playable
    if (isPlayable) {
      cardEl.addEventListener('click', () => {
        console.log('[PlayerHandUI] Card clicked:', index, card.name);
        this.onCardClick(index);
      });

      if (this.hoverPreview) {
        cardEl.addEventListener('mouseenter', (e) => {
          this.hoverPreview?.show(card, e as MouseEvent);
        });

        cardEl.addEventListener('mousemove', (e) => {
          this.hoverPreview?.updatePosition(e as MouseEvent);
        });

        cardEl.addEventListener('mouseleave', () => {
          this.hoverPreview?.hide();
        });
      }
    } else {
      // Add tooltip for unplayable cards
      cardEl.title = !canInteract ? 'Wait for Play Phase' : 'Not enough mana';
    }

    return cardEl;
  }

  public getCardElement(index: number): HTMLElement | null {
    return this.container.querySelector(`.card:nth-child(${index + 1})`) as HTMLElement;
  }
}