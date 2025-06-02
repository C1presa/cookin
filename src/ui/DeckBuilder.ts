// src/ui/DeckBuilder.ts
import { EventBus } from '../utils/EventBus';
import { Logger } from '../utils/Logger';
import { ICard, CardType, Rarity, EffectType } from '../types';
import { CardDatabase } from '../core/CardDatabase';
import { CardHoverPreview } from './components/CardHoverPreview';
import '../styles/DeckBuilder.css';

interface DeckCard {
  card: ICard;
  quantity: number;
}

interface Deck {
  id: string;
  name: string;
  archetype: string;
  description: string;
  cards: DeckCard[];
  createdAt: number;
  updatedAt: number;
  icon?: string;
}

interface FilterOptions {
  search: string;
  archetype: string | null;
  cost: number | null;
  type: CardType | null;
  rarity: Rarity | null;
  includeCustom: boolean;
}

export class DeckBuilder {
  private container: HTMLElement;
  private eventBus: EventBus;
  private logger: Logger;
  private cardDatabase: CardDatabase;
  private cardHoverPreview: CardHoverPreview;
  
  private currentDeck: Deck | null = null;
  private allCards: ICard[] = [];
  private filteredCards: ICard[] = [];
  private filters: FilterOptions = {
    search: '',
    archetype: null,
    cost: null,
    type: null,
    rarity: null,
    includeCustom: true
  };
  
  private selectedArchetype: string | null = null;
  private isDragging: boolean = false;
  private draggedCard: ICard | null = null;
  
  // Available archetypes
  private archetypes = [
    { id: 'neutral', name: 'Neutral', icon: '⚖️', color: '#b0b3b8', description: 'Balanced gameplay for all situations' },
    { id: 'nether', name: 'Nether', icon: '🔥', color: '#ff4757', description: 'Aggressive and damage-focused' },
    { id: 'nature', name: 'Nature', icon: '🌿', color: '#2ed573', description: 'Growth and board control' },
    { id: 'divine', name: 'Divine', icon: '✨', color: '#ffa502', description: 'Healing and protection' },
    { id: 'shadow', name: 'Shadow', icon: '🌑', color: '#5f27cd', description: 'Death and resurrection' },
    { id: 'tech', name: 'Tech', icon: '⚡', color: '#00d2d3', description: 'Combos and card draw' }
  ];

  constructor(container: HTMLElement) {
    this.container = container;
    this.eventBus = new EventBus();
    this.logger = new Logger('DeckBuilder');
    this.cardDatabase = new CardDatabase();
    this.cardHoverPreview = new CardHoverPreview();
    
    this.loadAllCards();
    this.render();
  }

  private loadAllCards(): void {
    // Load base cards
    this.allCards = [...this.cardDatabase.getAllCards()];
    
    // Load custom cards from localStorage
    const customCards = JSON.parse(localStorage.getItem('customCards') || '[]');
    customCards.forEach((card: ICard) => {
      card.archetype = card.archetype || 'Neutral'; // Ensure archetype
      this.allCards.push(card);
    });
    
    this.filteredCards = [...this.allCards];
  }

  private render(): void {
    if (!this.selectedArchetype) {
      this.renderArchetypeSelection();
    } else {
      this.renderDeckBuilder();
    }
  }

  private renderArchetypeSelection(): void {
    this.container.innerHTML = `
      <div class="deck-builder-container">
        <button class="back-button" id="builder-back">
          <span>← Back to Menu</span>
        </button>
        
        <div class="archetype-selection">
          <div class="selection-header">
            <h1>Choose Your Archetype</h1>
            <p>Select the primary archetype for your deck</p>
          </div>
          
          <div class="archetype-grid">
            ${this.archetypes.map(arch => `
              <div class="archetype-card" data-archetype="${arch.id}">
                <div class="archetype-glow" style="background: ${arch.color}"></div>
                <div class="archetype-icon" style="color: ${arch.color}">${arch.icon}</div>
                <h3 class="archetype-name">${arch.name}</h3>
                <p class="archetype-desc">${arch.description}</p>
                <div class="archetype-stats">
                  <span>${this.getArchetypeCardCount(arch.id)} cards available</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    this.setupArchetypeHandlers();
  }

  private renderDeckBuilder(): void {
    const archetype = this.archetypes.find(a => a.id === this.selectedArchetype);
    const deckStats = this.calculateDeckStats();
    
    this.container.innerHTML = `
      <div class="deck-builder-container">
        <div class="builder-header">
          <button class="back-button" id="builder-back">
            <span>← Back</span>
          </button>
          
          <div class="deck-info">
            <input type="text" 
                   class="deck-name-input" 
                   placeholder="Enter deck name..." 
                   value="${this.currentDeck?.name || ''}"
                   maxlength="30">
            <div class="deck-archetype">
              <span class="archetype-icon" style="color: ${archetype?.color}">${archetype?.icon}</span>
              <span>${archetype?.name} Deck</span>
            </div>
          </div>
          
          <div class="deck-actions">
            <button class="btn btn-secondary" id="import-deck">
              <span>📥 Import</span>
            </button>
            <button class="btn btn-secondary" id="export-deck">
              <span>📤 Export</span>
            </button>
            <button class="btn btn-primary" id="save-deck">
              <span>💾 Save Deck</span>
            </button>
          </div>
        </div>
        
        <div class="builder-main">
          <!-- Left: Card Collection -->
          <div class="collection-panel">
            <div class="collection-header">
              <h2>Card Collection</h2>
              <div class="collection-stats">
                ${this.filteredCards.length} cards shown
              </div>
            </div>
            
            <!-- Filters -->
            <div class="filter-bar">
              <input type="text" 
                     class="search-input" 
                     placeholder="Search cards..." 
                     id="card-search">
              
              <div class="filter-buttons">
                <select class="filter-select" id="filter-cost">
                  <option value="">All Costs</option>
                  ${[0,1,2,3,4,5,6,7,8,9,10].map(cost => 
                    `<option value="${cost}">${cost} Mana</option>`
                  ).join('')}
                </select>
                
                <select class="filter-select" id="filter-type">
                  <option value="">All Types</option>
                  <option value="UNIT">Units</option>
                  <option value="SPELL">Spells</option>
                </select>
                
                <select class="filter-select" id="filter-rarity">
                  <option value="">All Rarities</option>
                  ${Object.values(Rarity).map(rarity => 
                    `<option value="${rarity}">${rarity}</option>`
                  ).join('')}
                </select>
                
                <label class="filter-toggle">
                  <input type="checkbox" id="filter-custom" checked>
                  <span>Show Custom</span>
                </label>
              </div>
            </div>
            
            <!-- Card Grid -->
            <div class="collection-grid" id="collection-grid">
              ${this.renderCollectionCards()}
            </div>
          </div>
          
          <!-- Center: Deck List -->
          <div class="deck-panel">
            <div class="deck-header">
              <h2>Deck List</h2>
              <div class="deck-count">${deckStats.totalCards} / 30 cards</div>
            </div>
            
            <!-- Mana Curve -->
            <div class="mana-curve">
              <h3>Mana Curve</h3>
              <div class="curve-bars">
                ${this.renderManaCurve(deckStats.manaCurve)}
              </div>
            </div>
            
            <!-- Deck List -->
            <div class="deck-list" id="deck-list">
              ${this.renderDeckList()}
            </div>
            
            <!-- Deck Stats -->
            <div class="deck-stats">
              <div class="stat-item">
                <span class="stat-label">Units</span>
                <span class="stat-value">${deckStats.units}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Spells</span>
                <span class="stat-value">${deckStats.spells}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Avg Cost</span>
                <span class="stat-value">${deckStats.avgCost.toFixed(1)}</span>
              </div>
            </div>
          </div>
          
          <!-- Right: Saved Decks -->
          <div class="saved-decks-panel">
            <div class="saved-header">
              <h2>My Decks</h2>
              <button class="btn btn-small" id="new-deck">+ New</button>
            </div>
            
            <div class="saved-decks-list" id="saved-decks">
              ${this.renderSavedDecks()}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Import/Export Modal -->
      <div class="modal-overlay" id="import-export-modal" style="display: none;">
        <div class="modal-content">
          <button class="modal-close" id="close-modal">×</button>
          <h2 id="modal-title">Import Deck</h2>
          <textarea class="deck-code-input" 
                    id="deck-code" 
                    placeholder="Paste deck code here..."
                    rows="10"></textarea>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="cancel-modal">Cancel</button>
            <button class="btn btn-primary" id="confirm-modal">Import</button>
          </div>
        </div>
      </div>
    `;
    
    this.setupDeckBuilderHandlers();
  }

  private renderCollectionCards(): string {
    return this.filteredCards.map(card => {
      const inDeck = this.getCardQuantityInDeck(card.id);
      const rarityClass = `rarity-${card.rarity.toLowerCase()}`;
      
      return `
        <div class="collection-card ${rarityClass} ${inDeck > 0 ? 'in-deck' : ''}" 
             data-card-id="${card.id}"
             draggable="true">
          <div class="card-cost">${card.cost}</div>
          <div class="card-content">
            <div class="card-icon">${card.icon}</div>
            <div class="card-info">
              <div class="card-name">${card.name}</div>
              <div class="card-type">${card.type}</div>
            </div>
            ${card.type === 'UNIT' ? `
              <div class="card-stats">
                <span class="attack">${card.attack}</span>
                <span>/</span>
                <span class="health">${card.health}</span>
              </div>
            ` : ''}
          </div>
          ${inDeck > 0 ? `<div class="card-quantity">${inDeck}</div>` : ''}
          ${card.id.startsWith('custom-') ? '<div class="custom-badge">Custom</div>' : ''}
        </div>
      `;
    }).join('');
  }

  private renderDeckList(): string {
    if (!this.currentDeck || this.currentDeck.cards.length === 0) {
      return `
        <div class="empty-deck">
          <p>Your deck is empty</p>
          <p class="hint">Drag cards here or click to add them</p>
        </div>
      `;
    }
    
    // Sort by cost, then name
    const sortedCards = [...this.currentDeck.cards].sort((a, b) => {
      if (a.card.cost !== b.card.cost) return a.card.cost - b.card.cost;
      return a.card.name.localeCompare(b.card.name);
    });
    
    return sortedCards.map(deckCard => {
      const rarityClass = `rarity-${deckCard.card.rarity.toLowerCase()}`;
      
      return `
        <div class="deck-card ${rarityClass}" data-card-id="${deckCard.card.id}">
          <div class="deck-card-cost">${deckCard.card.cost}</div>
          <div class="deck-card-name">${deckCard.card.name}</div>
          <div class="deck-card-quantity">
            <button class="qty-btn minus" data-card-id="${deckCard.card.id}">-</button>
            <span class="qty-value">×${deckCard.quantity}</span>
            <button class="qty-btn plus" data-card-id="${deckCard.card.id}">+</button>
          </div>
          <button class="remove-btn" data-card-id="${deckCard.card.id}">×</button>
        </div>
      `;
    }).join('');
  }

  private renderManaCurve(curve: Map<number, number>): string {
    const maxCount = Math.max(...Array.from(curve.values()), 1);
    const bars: string[] = [];
    
    for (let cost = 0; cost <= 7; cost++) {
      const count = curve.get(cost) || 0;
      const height = (count / maxCount) * 100;
      
      bars.push(`
        <div class="curve-bar">
          <div class="bar-fill" style="height: ${height}%">
            <span class="bar-count">${count}</span>
          </div>
          <span class="bar-cost">${cost}${cost === 7 ? '+' : ''}</span>
        </div>
      `);
    }
    
    return bars.join('');
  }

  private renderSavedDecks(): string {
    const savedDecks = this.getSavedDecks();
    
    if (savedDecks.length === 0) {
      return '<div class="no-saved-decks">No saved decks yet</div>';
    }
    
    return savedDecks.map(deck => {
      const archetype = this.archetypes.find(a => a.id === deck.archetype);
      const cardCount = deck.cards.reduce((sum, dc) => sum + dc.quantity, 0);
      const isActive = this.currentDeck?.id === deck.id;
      
      return `
        <div class="saved-deck-item ${isActive ? 'active' : ''}" data-deck-id="${deck.id}">
          <div class="saved-deck-icon" style="color: ${archetype?.color}">
            ${archetype?.icon || '📚'}
          </div>
          <div class="saved-deck-info">
            <div class="saved-deck-name">${deck.name || 'Unnamed Deck'}</div>
            <div class="saved-deck-meta">
              ${archetype?.name || 'Unknown'} • ${cardCount} cards
            </div>
          </div>
          <div class="saved-deck-actions">
            <button class="deck-action-btn load-btn" data-deck-id="${deck.id}" title="Load">
              📂
            </button>
            <button class="deck-action-btn duplicate-btn" data-deck-id="${deck.id}" title="Duplicate">
              📋
            </button>
            <button class="deck-action-btn delete-btn" data-deck-id="${deck.id}" title="Delete">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  private getArchetypeCardCount(archetype: string): number {
    return this.allCards.filter(card => 
      card.archetype === archetype || card.archetype === 'Neutral'
    ).length;
  }

  private calculateDeckStats(): any {
    if (!this.currentDeck) {
      return {
        totalCards: 0,
        units: 0,
        spells: 0,
        avgCost: 0,
        manaCurve: new Map()
      };
    }
    
    let totalCards = 0;
    let totalCost = 0;
    let units = 0;
    let spells = 0;
    const manaCurve = new Map<number, number>();
    
    this.currentDeck.cards.forEach(deckCard => {
      totalCards += deckCard.quantity;
      totalCost += deckCard.card.cost * deckCard.quantity;
      
      if (deckCard.card.type === CardType.UNIT) {
        units += deckCard.quantity;
      } else {
        spells += deckCard.quantity;
      }
      
      const cost = Math.min(deckCard.card.cost, 7); // Group 7+ together
      manaCurve.set(cost, (manaCurve.get(cost) || 0) + deckCard.quantity);
    });
    
    return {
      totalCards,
      units,
      spells,
      avgCost: totalCards > 0 ? totalCost / totalCards : 0,
      manaCurve
    };
  }

  private getCardQuantityInDeck(cardId: string): number {
    if (!this.currentDeck) return 0;
    
    const deckCard = this.currentDeck.cards.find(dc => dc.card.id === cardId);
    return deckCard ? deckCard.quantity : 0;
  }

  private applyFilters(): void {
    this.filteredCards = this.allCards.filter(card => {
      // Search filter
      if (this.filters.search) {
        const search = this.filters.search.toLowerCase();
        const matchesSearch = 
          card.name.toLowerCase().includes(search) ||
          card.description.toLowerCase().includes(search) ||
          card.effects.some(e => e.type.toLowerCase().includes(search));
        
        if (!matchesSearch) return false;
      }
      
      // Archetype filter (show selected archetype + neutral)
      if (this.selectedArchetype && 
          card.archetype !== this.selectedArchetype && 
          card.archetype !== 'Neutral') {
        return false;
      }
      
      // Cost filter
      if (this.filters.cost !== null && card.cost !== this.filters.cost) {
        return false;
      }
      
      // Type filter
      if (this.filters.type && card.type !== this.filters.type) {
        return false;
      }
      
      // Rarity filter
      if (this.filters.rarity && card.rarity !== this.filters.rarity) {
        return false;
      }
      
      // Custom cards filter
      if (!this.filters.includeCustom && card.id.startsWith('custom-')) {
        return false;
      }
      
      return true;
    });
    
    // Re-render collection
    const grid = document.getElementById('collection-grid');
    if (grid) {
      grid.innerHTML = this.renderCollectionCards();
      this.setupCardHandlers();
    }
  }

  private addCardToDeck(cardId: string): void {
    const card = this.allCards.find(c => c.id === cardId);
    if (!card) return;
    
    if (!this.currentDeck) {
      this.createNewDeck();
    }
    
    // CHECK DECK SIZE LIMIT
    const currentCardCount = this.currentDeck!.cards.reduce((sum, dc) => sum + dc.quantity, 0);
    if (currentCardCount >= 30) {
      this.showNotification('Deck is full! Maximum 30 cards allowed.', 'error');
      return;
    }
    
    const existingCard = this.currentDeck!.cards.find(dc => dc.card.id === cardId);
    
    if (existingCard) {
      // Check if adding another copy would exceed limit
      if (currentCardCount + 1 > 30) {
        this.showNotification('Cannot add more cards. Deck limit reached!', 'error');
        return;
      }
      existingCard.quantity++;
    } else {
      this.currentDeck!.cards.push({ card, quantity: 1 });
    }
    
    this.currentDeck!.updatedAt = Date.now();
    this.updateDeckDisplay();
  }

  private removeCardFromDeck(cardId: string, all: boolean = false): void {
    if (!this.currentDeck) return;
    
    const index = this.currentDeck.cards.findIndex(dc => dc.card.id === cardId);
    if (index === -1) return;
    
    if (all || this.currentDeck.cards[index].quantity === 1) {
      this.currentDeck.cards.splice(index, 1);
    } else {
      this.currentDeck.cards[index].quantity--;
    }
    
    this.currentDeck.updatedAt = Date.now();
    this.updateDeckDisplay();
  }

  private createNewDeck(): void {
    this.currentDeck = {
      id: this.generateDeckId(),
      name: '',
      archetype: this.selectedArchetype || 'neutral',
      description: '',
      cards: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  private saveDeck(): void {
    if (!this.currentDeck) return;
    
    const deckName = (document.querySelector('.deck-name-input') as HTMLInputElement)?.value;
    this.currentDeck.name = deckName || `${this.selectedArchetype} Deck`;
    
    const savedDecks = this.getSavedDecks();
    const existingIndex = savedDecks.findIndex(d => d.id === this.currentDeck!.id);
    
    if (existingIndex >= 0) {
      savedDecks[existingIndex] = this.currentDeck;
    } else {
      savedDecks.push(this.currentDeck);
    }
    
    localStorage.setItem('savedDecks', JSON.stringify(savedDecks));
    this.showNotification('Deck saved successfully!', 'success');
    this.updateSavedDecksList();
  }

  private loadDeck(deckId: string): void {
    const savedDecks = this.getSavedDecks();
    const deck = savedDecks.find(d => d.id === deckId);
    
    if (deck) {
      this.currentDeck = JSON.parse(JSON.stringify(deck)); // Deep clone
      this.selectedArchetype = deck.archetype;
      this.render();
    }
  }

  private deleteDeck(deckId: string): void {
    if (!confirm('Are you sure you want to delete this deck?')) return;
    
    const savedDecks = this.getSavedDecks();
    const filtered = savedDecks.filter(d => d.id !== deckId);
    
    localStorage.setItem('savedDecks', JSON.stringify(filtered));
    
    if (this.currentDeck?.id === deckId) {
      this.createNewDeck();
      this.render();
    } else {
      this.updateSavedDecksList();
    }
    
    this.showNotification('Deck deleted', 'info');
  }

  private duplicateDeck(deckId: string): void {
    const savedDecks = this.getSavedDecks();
    const deck = savedDecks.find(d => d.id === deckId);
    
    if (deck) {
      const newDeck = JSON.parse(JSON.stringify(deck));
      newDeck.id = this.generateDeckId();
      newDeck.name = `${deck.name} (Copy)`;
      newDeck.createdAt = Date.now();
      newDeck.updatedAt = Date.now();
      
      savedDecks.push(newDeck);
      localStorage.setItem('savedDecks', JSON.stringify(savedDecks));
      
      this.currentDeck = newDeck;
      this.selectedArchetype = newDeck.archetype;
      this.render();
      
      this.showNotification('Deck duplicated!', 'success');
    }
  }

  private exportDeck(): void {
    if (!this.currentDeck || this.currentDeck.cards.length === 0) {
      this.showNotification('Deck is empty!', 'error');
      return;
    }
    
    const deckCode = this.encodeDeck(this.currentDeck);
    this.showImportExportModal('Export Deck', deckCode, false);
  }

  private importDeck(deckCode: string): void {
    try {
      const deck = this.decodeDeck(deckCode);
      this.currentDeck = deck;
      this.selectedArchetype = deck.archetype;
      this.render();
      this.showNotification('Deck imported successfully!', 'success');
    } catch (error) {
      this.showNotification('Invalid deck code!', 'error');
    }
  }

  private encodeDeck(deck: Deck): string {
    const data = {
      n: deck.name,
      a: deck.archetype,
      c: deck.cards.map(dc => ({
        i: dc.card.id,
        q: dc.quantity
      }))
    };
    
    return btoa(JSON.stringify(data));
  }

  private decodeDeck(code: string): Deck {
    const data = JSON.parse(atob(code));
    const cards: DeckCard[] = [];
    
    data.c.forEach((item: any) => {
      const card = this.allCards.find(c => c.id === item.i);
      if (card) {
        cards.push({ card, quantity: item.q });
      }
    });
    
    return {
      id: this.generateDeckId(),
      name: data.n || 'Imported Deck',
      archetype: data.a || 'neutral',
      description: '',
      cards,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  private getSavedDecks(): Deck[] {
    return JSON.parse(localStorage.getItem('savedDecks') || '[]');
  }

  private generateDeckId(): string {
    return `deck-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateDeckDisplay(): void {
    // Update deck list
    const deckList = document.getElementById('deck-list');
    if (deckList) {
      deckList.innerHTML = this.renderDeckList();
    }
    
    // Update stats
    const stats = this.calculateDeckStats();
    const deckCount = document.querySelector('.deck-count');
    if (deckCount) {
      deckCount.textContent = `${stats.totalCards} / 30 cards`;
    }
    
    // Update mana curve
    const curveBars = document.querySelector('.curve-bars');
    if (curveBars) {
      curveBars.innerHTML = this.renderManaCurve(stats.manaCurve);
    }
    
    // Update collection to show quantities
    const grid = document.getElementById('collection-grid');
    if (grid) {
      grid.innerHTML = this.renderCollectionCards();
      this.setupCardHandlers();
    }
    
    // Update deck stats
    document.querySelectorAll('.deck-stats .stat-value').forEach((el, index) => {
      if (index === 0) el.textContent = stats.units.toString();
      if (index === 1) el.textContent = stats.spells.toString();
      if (index === 2) el.textContent = stats.avgCost.toFixed(1);
    });
  }

  private updateSavedDecksList(): void {
    const savedDecksList = document.getElementById('saved-decks');
    if (savedDecksList) {
      savedDecksList.innerHTML = this.renderSavedDecks();
      this.setupSavedDecksHandlers();
    }
  }

  private showImportExportModal(title: string, code: string = '', isImport: boolean = true): void {
    const modal = document.getElementById('import-export-modal');
    const modalTitle = document.getElementById('modal-title');
    const deckCodeInput = document.getElementById('deck-code') as HTMLTextAreaElement;
    const confirmBtn = document.getElementById('confirm-modal');
    
    if (modal && modalTitle && deckCodeInput && confirmBtn) {
      modal.style.display = 'flex';
      modalTitle.textContent = title;
      deckCodeInput.value = code;
      confirmBtn.textContent = isImport ? 'Import' : 'Copy';
      
      if (!isImport) {
        deckCodeInput.select();
      }
      
      // Update confirm handler
      const newConfirmBtn = confirmBtn.cloneNode(true) as HTMLElement;
      confirmBtn.parentNode?.replaceChild(newConfirmBtn, confirmBtn);
      
      newConfirmBtn.addEventListener('click', () => {
        if (isImport) {
          this.importDeck(deckCodeInput.value);
          modal.style.display = 'none';
        } else {
          navigator.clipboard.writeText(deckCodeInput.value);
          this.showNotification('Deck code copied to clipboard!', 'success');
          modal.style.display = 'none';
        }
      });
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Event Handlers Setup
  private setupArchetypeHandlers(): void {
    document.getElementById('builder-back')?.addEventListener('click', () => {
      this.eventBus.emit('closeDeckBuilder');
    });
    
    document.querySelectorAll('.archetype-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectedArchetype = card.getAttribute('data-archetype');
        this.createNewDeck();
        this.render();
      });
    });
  }

  private setupDeckBuilderHandlers(): void {
    // Back button
    document.getElementById('builder-back')?.addEventListener('click', () => {
      this.selectedArchetype = null;
      this.render();
    });
    
    // Save deck
    document.getElementById('save-deck')?.addEventListener('click', () => {
      this.saveDeck();
    });
    
    // Import/Export
    document.getElementById('import-deck')?.addEventListener('click', () => {
      this.showImportExportModal('Import Deck', '', true);
    });
    
    document.getElementById('export-deck')?.addEventListener('click', () => {
      this.exportDeck();
    });
    
    // New deck
    document.getElementById('new-deck')?.addEventListener('click', () => {
      this.createNewDeck();
      this.render();
    });
    
    // Modal handlers
    document.getElementById('close-modal')?.addEventListener('click', () => {
      const modal = document.getElementById('import-export-modal');
      if (modal) modal.style.display = 'none';
    });
    
    document.getElementById('cancel-modal')?.addEventListener('click', () => {
      const modal = document.getElementById('import-export-modal');
      if (modal) modal.style.display = 'none';
    });
    
    // Filter handlers
    document.getElementById('card-search')?.addEventListener('input', (e) => {
      this.filters.search = (e.target as HTMLInputElement).value;
      this.applyFilters();
    });
    
    document.getElementById('filter-cost')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      this.filters.cost = value ? parseInt(value) : null;
      this.applyFilters();
    });
    
    document.getElementById('filter-type')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      this.filters.type = value ? value as CardType : null;
      this.applyFilters();
    });
    
    document.getElementById('filter-rarity')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      this.filters.rarity = value ? value as Rarity : null;
      this.applyFilters();
    });
    
    document.getElementById('filter-custom')?.addEventListener('change', (e) => {
      this.filters.includeCustom = (e.target as HTMLInputElement).checked;
      this.applyFilters();
    });
    
    // Setup card and deck handlers
    this.setupCardHandlers();
    this.setupDeckHandlers();
    this.setupSavedDecksHandlers();
  }

  private setupCardHandlers(): void {
    // Collection cards
    document.querySelectorAll('.collection-card').forEach(card => {
      // Click to add
      card.addEventListener('click', () => {
        const cardId = card.getAttribute('data-card-id');
        if (cardId) {
          this.addCardToDeck(cardId);
        }
      });
      
      // Hover preview
      card.addEventListener('mouseenter', (e) => {
        const cardId = card.getAttribute('data-card-id');
        const cardData = this.allCards.find(c => c.id === cardId);
        if (cardData) {
          this.cardHoverPreview.show(cardData, e as MouseEvent);
        }
      });
      
      card.addEventListener('mousemove', (e) => {
        this.cardHoverPreview.updatePosition(e as MouseEvent);
      });
      
      card.addEventListener('mouseleave', () => {
        this.cardHoverPreview.hide();
      });
      
      // Drag start
      card.addEventListener('dragstart', (e) => {
        const cardId = card.getAttribute('data-card-id');
        const cardData = this.allCards.find(c => c.id === cardId);
        if (cardData) {
          this.isDragging = true;
          this.draggedCard = cardData;
          (e as DragEvent).dataTransfer!.effectAllowed = 'copy';
          card.classList.add('dragging');
        }
      });
      
      card.addEventListener('dragend', () => {
        this.isDragging = false;
        this.draggedCard = null;
        card.classList.remove('dragging');
      });
    });
  }

  private setupDeckHandlers(): void {
    const deckList = document.getElementById('deck-list');
    if (!deckList) return;
    
    // Enable drop on deck list
    deckList.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (this.isDragging) {
        deckList.classList.add('drag-over');
      }
    });
    
    deckList.addEventListener('dragleave', () => {
      deckList.classList.remove('drag-over');
    });
    
    deckList.addEventListener('drop', (e) => {
      e.preventDefault();
      deckList.classList.remove('drag-over');
      
      if (this.draggedCard) {
        this.addCardToDeck(this.draggedCard.id);
      }
    });
    
    // Quantity buttons
    deckList.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      if (target.classList.contains('qty-btn')) {
        const cardId = target.getAttribute('data-card-id');
        if (!cardId) return;
        
        if (target.classList.contains('minus')) {
          this.removeCardFromDeck(cardId, false);
        } else if (target.classList.contains('plus')) {
          // Check deck size before adding
          const currentCount = this.currentDeck?.cards.reduce((sum, dc) => sum + dc.quantity, 0) || 0;
          if (currentCount >= 30) {
            this.showNotification('Deck is full! Maximum 30 cards allowed.', 'error');
            return;
          }
          this.addCardToDeck(cardId);
        }
      }
      
      if (target.classList.contains('remove-btn')) {
        const cardId = target.getAttribute('data-card-id');
        if (cardId) {
          this.removeCardFromDeck(cardId, true);
        }
      }
    });
    
    // Hover preview for deck cards
    deckList.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;
      const deckCard = target.closest('.deck-card') as HTMLElement;
      
      if (deckCard) {
        const cardId = deckCard.getAttribute('data-card-id');
        const cardData = this.allCards.find(c => c.id === cardId);
        if (cardData) {
          this.cardHoverPreview.show(cardData, e as MouseEvent);
        }
      }
    });
    
    deckList.addEventListener('mousemove', (e) => {
      this.cardHoverPreview.updatePosition(e as MouseEvent);
    });
    
    deckList.addEventListener('mouseout', (e) => {
      const target = e.target as HTMLElement;
      const deckCard = target.closest('.deck-card');
      if (deckCard) {
        this.cardHoverPreview.hide();
      }
    });
  }

  private setupSavedDecksHandlers(): void {
    document.querySelectorAll('.saved-deck-item').forEach(item => {
      const deckId = item.getAttribute('data-deck-id');
      if (!deckId) return;
      
      // Load deck on click
      item.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('.saved-deck-actions')) {
          this.loadDeck(deckId);
        }
      });
    });
    
    // Action buttons
    document.querySelectorAll('.load-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const deckId = btn.getAttribute('data-deck-id');
        if (deckId) this.loadDeck(deckId);
      });
    });
    
    document.querySelectorAll('.duplicate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const deckId = btn.getAttribute('data-deck-id');
        if (deckId) this.duplicateDeck(deckId);
      });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const deckId = btn.getAttribute('data-deck-id');
        if (deckId) this.deleteDeck(deckId);
      });
    });
  }

  public on(event: string, handler: Function): void {
    this.eventBus.on(event, handler);
  }

  public destroy(): void {
    this.cardHoverPreview.destroy();
    this.eventBus.clear();
  }
}