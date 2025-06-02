import { EventBus } from '../../utils/EventBus';
import { Logger } from '../../utils/Logger';
import { ICard } from '../../types';
import '../../styles/DeckSelection.css';

export class DeckSelectionUI {
  private container: HTMLElement;
  private eventBus: EventBus;
  private logger: Logger;
  private selectedDeckId: string | null = null;
  private selectedDeckType: 'preset' | 'custom' | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.eventBus = new EventBus();
    this.logger = new Logger('DeckSelectionUI');
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="deck-select-container">
        <div class="deck-tabs">
          <button class="deck-tab active" data-type="preset">Preset Decks</button>
          <button class="deck-tab" data-type="custom">Custom Decks</button>
        </div>
        
        <div class="deck-grid">
          <!-- Deck cards will be rendered here -->
        </div>
        
        <div class="deck-preview">
          <div class="deck-preview-header">
            <div class="deck-preview-icon">🎴</div>
            <h3>Select a Deck</h3>
          </div>
          <p class="deck-preview-description">Choose a deck to start playing!</p>
        </div>
        
        <div class="deck-select-actions">
          <button class="btn btn-primary" id="start-game-btn" disabled>Start Game</button>
        </div>
      </div>
    `;

    this.setupEventHandlers();
    this.loadDecks('preset');
  }

  private setupEventHandlers(): void {
    // Tab switching
    document.querySelectorAll('.deck-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const type = (e.currentTarget as HTMLElement).dataset.type as 'preset' | 'custom';
        this.switchTab(type);
      });
    });

    // Start game button
    const startBtn = document.getElementById('start-game-btn');
    startBtn?.addEventListener('click', () => {
      if (this.selectedDeckId && this.selectedDeckType) {
        this.eventBus.emit('startGame', {
          deckId: this.selectedDeckId,
          deckType: this.selectedDeckType
        });
      }
    });
  }

  private switchTab(type: 'preset' | 'custom'): void {
    // Update active tab
    document.querySelectorAll('.deck-tab').forEach(tab => {
      tab.classList.toggle('active', (tab as HTMLElement).dataset.type === type);
    });

    // Load decks for selected type
    this.loadDecks(type);
  }

  private loadDecks(type: 'preset' | 'custom'): void {
    const deckGrid = document.querySelector('.deck-grid');
    if (!deckGrid) return;

    if (type === 'preset') {
      this.renderPresetDecks(deckGrid);
    } else {
      this.renderCustomDecks(deckGrid);
    }
  }

  private renderPresetDecks(container: Element): void {
    const presetDecks = [
      {
        id: 'balanced-starter',
        name: 'Balanced Starter',
        icon: '⚖️',
        archetype: 'Neutral',
        cardCount: 20
      },
      {
        id: 'aggro-rush',
        name: 'Aggro Rush',
        icon: '⚡',
        archetype: 'Aggro',
        cardCount: 20
      },
      {
        id: 'control-defense',
        name: 'Control Defense',
        icon: '🛡️',
        archetype: 'Control',
        cardCount: 20
      }
    ];

    container.innerHTML = presetDecks.map(deck => this.renderDeckCard(deck, 'preset')).join('');

    container.querySelectorAll('.deck-card').forEach((cardElem, idx) => {
      cardElem.addEventListener('click', () => {
        this.selectDeck(presetDecks[idx], 'preset');
      });
    });
  }

  private renderCustomDecks(container: Element): void {
    const savedDecks = JSON.parse(localStorage.getItem('savedDecks') || '[]');
    
    if (savedDecks.length === 0) {
      container.innerHTML = `
        <div class="no-custom-decks">
          <p>No custom decks created yet!</p>
          <p>Create your own deck in the deck builder.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = savedDecks.map((deck: any) => this.renderDeckCard(deck, 'custom')).join('');

    // Add click handlers for each custom deck card
    container.querySelectorAll('.deck-card').forEach((cardElem, idx) => {
      cardElem.addEventListener('click', () => {
        this.selectDeck(savedDecks[idx], 'custom');
      });
    });
  }

  private renderDeckCard(deck: any, type: 'preset' | 'custom'): string {
    const icon = deck.icon || '📦';
    const name = deck.name || 'Unnamed Deck';
    const archetype = deck.archetype || 'Custom';
    const cardCount = type === 'custom'
      ? (deck.cards ? deck.cards.reduce((sum: number, dc: any) => sum + dc.quantity, 0) : 0)
      : deck.cardCount;

    return `
      <div class="deck-card ${type === 'custom' ? 'custom-deck' : ''}" 
           data-deck-id="${deck.id}" 
           data-deck-type="${type}">
        <div class="deck-icon">${icon}</div>
        <div class="deck-name">${name}</div>
        <div class="deck-archetype">${archetype}</div>
        <div class="deck-card-count">${cardCount} cards</div>
      </div>
    `;
  }

  private selectDeck(deck: any, type: 'preset' | 'custom'): void {
    this.selectedDeckId = deck.id;
    this.selectedDeckType = type;

    // Update UI
    document.querySelectorAll('.deck-card').forEach(card => {
      card.classList.toggle('selected', 
        (card as HTMLElement).dataset.deckId === deck.id &&
        (card as HTMLElement).dataset.deckType === type
      );
    });

    // Enable start button
    const startBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
    if (startBtn) {
      startBtn.disabled = false;
    }

    // Update preview with the full deck object
    this.updateDeckPreview(deck);
  }

  private updateDeckPreview(deck: any): void {
    const preview = document.querySelector('.deck-preview');
    if (!preview) return;

    const isCustom = Array.isArray(deck.cards);
    const icon = deck.icon || '📦';
    const name = deck.name || 'Unnamed Deck';
    const archetype = deck.archetype || 'Custom';
    const cardCount = isCustom
      ? (deck.cards && Array.isArray(deck.cards) ? deck.cards.reduce((sum: number, dc: any) => sum + dc.quantity, 0) : 0)
      : deck.cardCount;
    const description = deck.description || '';

    const keyCardsHtml =
      isCustom && Array.isArray(deck.cards) && deck.cards.length > 0
        ? deck.cards
            .slice(0, 3)
            .map(
              (dc: any) =>
                `<div class="card-mini">${dc.card?.icon || '🃏'} ${dc.card?.name || ''}</div>`
            )
            .join('')
        : `
          <div class="card-mini">🦎 Kriper</div>
          <div class="card-mini">⚔️ Mercenary</div>
          <div class="card-mini">🛡️ Guard</div>
        `;

    preview.innerHTML = `
      <div class="deck-preview-header">
        <div class="deck-preview-icon">${icon}</div>
        <h3>${name}</h3>
      </div>
      <p class="deck-preview-description">${description}</p>
      <div class="deck-preview-stats">
        <div class="stat">
          <span class="stat-label">Archetype</span>
          <span class="stat-value">${archetype}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Cards</span>
          <span class="stat-value">${cardCount}</span>
        </div>
      </div>
      <div class="deck-preview-cards">
        <h4>Key Cards</h4>
        <div class="key-cards-grid">
          ${keyCardsHtml}
        </div>
      </div>
    `;
  }

  public on(event: string, handler: Function): void {
    this.eventBus.on(event, handler);
  }

  public destroy(): void {
    this.eventBus.clear();
  }
} 