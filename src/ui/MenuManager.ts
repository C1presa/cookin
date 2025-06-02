// src/ui/MenuManager.ts - Fixed version with CardBuilder integration
import { EventBus } from '../utils/EventBus';
import { Logger } from '../utils/Logger';
import { CardBuilder } from './CardBuilder'; // Import CardBuilder
import { DeckBuilder } from './DeckBuilder';
import '../styles/MenuStyles.css';

export interface MenuOption {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
}

export interface DeckOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  cardCount: number;
  archetype: string;
}

export class MenuManager {
  private container: HTMLElement;
  private eventBus: EventBus;
  private logger: Logger;
  private currentMenu: string = 'main';
  private cardBuilder: CardBuilder | null = null;
  private deckBuilder: DeckBuilder | null = null;
  
  private presetDecks: DeckOption[] = [
    {
      id: 'aggro-rush',
      name: 'Aggro Rush',
      description: 'Fast and aggressive deck focused on early pressure',
      icon: '⚔️',
      cardCount: 30,
      archetype: 'Aggro'
    },
    {
      id: 'control-defense',
      name: 'Control Defense',
      description: 'Defensive deck with strong late-game units',
      icon: '🛡️',
      cardCount: 30,
      archetype: 'Control'
    },
    {
      id: 'balanced-starter',
      name: 'Balanced Starter',
      description: 'Well-rounded deck for beginners',
      icon: '⚖️',
      cardCount: 30,
      archetype: 'Midrange'
    }
  ];

  // --- New state for PvP deck selection ---
  private gameMode: 'pvp' | 'ai' | null = null;
  private currentSelectingPlayer: 1 | 2 = 1;
  private player1DeckSelection: { deckId: string; deckType: string } | null = null;
  private selectedDeckId: string | null = null;
  private selectedDeckType: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.eventBus = new EventBus();
    this.logger = new Logger('MenuManager');
    this.render();
  }

  private render(): void {
    switch (this.currentMenu) {
      case 'main':
        this.renderMainMenu();
        break;
      case 'builder':
        this.renderBuilderMenu();
        break;
      case 'gameMode':
        this.renderGameModeMenu();
        break;
      case 'deckSelect':
        this.renderDeckSelectMenu();
        break;
      case 'settings':
        this.renderSettingsMenu();
        break;
    }
  }

  private renderMainMenu(): void {
    this.container.innerHTML = `
      <div class="menu-container">
        <canvas id="menu-background"></canvas>
        <div class="menu-content">
          <div class="menu-header">
            <div class="game-logo">
              <span class="logo-text">CURVE</span>
              <div class="logo-swords">
                <div class="logo-sword logo-sword-left"></div>
                <div class="logo-sword logo-sword-right"></div>
              </div>
              <span class="logo-text">GAME</span>
            </div>
            <p class="menu-subtitle">Strategic Card Battler</p>
          </div>
          
          <div class="menu-options">
            <button class="menu-button menu-button-primary" data-action="play">
              <span class="button-icon">⚔️</span>
              <span class="button-text">Play</span>
            </button>
            
            <button class="menu-button" data-action="collection">
              <span class="button-icon">📚</span>
              <span class="button-text">Collection</span>
            </button>
            
            <button class="menu-button" data-action="builder">
              <span class="button-icon">🎴</span>
              <span class="button-text">Builder</span>
            </button>
            
            <button class="menu-button" data-action="settings">
              <span class="button-icon">⚙️</span>
              <span class="button-text">Settings</span>
            </button>
            
            <button class="menu-button menu-button-secondary" data-action="quit">
              <span class="button-icon">🚪</span>
              <span class="button-text">Quit</span>
            </button>
          </div>
          
          <div class="menu-footer">
            <p class="version-info">Version 1.0.0</p>
          </div>
        </div>
      </div>
    `;

    this.setupMainMenuHandlers();
    this.initializeBackgroundAnimation();
  }

  private renderBuilderMenu(): void {
    this.container.innerHTML = `
      <div class="menu-container">
        <canvas id="menu-background"></canvas>
        <div class="menu-content">
          <button class="back-button" data-action="back">
            <span>← Back</span>
          </button>
          
          <div class="menu-header">
            <h2 class="menu-title">Builder</h2>
            <p class="menu-subtitle">Create and customize your experience</p>
          </div>
          
          <div class="builder-options">
            <div class="builder-card" data-builder="card">
              <div class="builder-icon">🎨</div>
              <h3 class="builder-title">Card Builder</h3>
              <p class="builder-description">Design your own unique cards with custom effects</p>
              <div class="builder-badge">Available</div>
            </div>
            
            <div class="builder-card" data-builder="deck">
              <div class="builder-icon">📦</div>
              <h3 class="builder-title">Deck Builder</h3>
              <p class="builder-description">Create custom decks with your favorite cards</p>
              <div class="builder-badge">Available</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupBuilderMenuHandlers();
    this.initializeBackgroundAnimation();
  }

  private renderGameModeMenu(): void {
    this.container.innerHTML = `
      <div class="menu-container">
        <canvas id="menu-background"></canvas>
        <div class="menu-content">
          <button class="back-button" data-action="back">
            <span>← Back</span>
          </button>
          
          <div class="menu-header">
            <h2 class="menu-title">Select Game Mode</h2>
          </div>
          
          <div class="game-mode-grid">
            <div class="game-mode-card" data-mode="pvp">
              <div class="mode-icon">👥</div>
              <h3 class="mode-title">Player vs Player</h3>
              <p class="mode-description">Battle against another player locally</p>
              <div class="mode-badge">Hot Seat</div>
            </div>
            
            <div class="game-mode-card" data-mode="ai">
              <div class="mode-icon">🤖</div>
              <h3 class="mode-title">vs AI</h3>
              <p class="mode-description">Test your skills against computer opponents</p>
              <div class="mode-badge">3 Difficulty Levels</div>
            </div>
            
            <div class="game-mode-card disabled" data-mode="online">
              <div class="mode-icon">🌐</div>
              <h3 class="mode-title">Online</h3>
              <p class="mode-description">Coming Soon</p>
              <div class="mode-badge">Future Update</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupGameModeHandlers();
    this.initializeBackgroundAnimation();
  }

  private renderDeckSelectMenu(): void {
    const currentPlayer = this.gameMode === 'pvp' ? this.currentSelectingPlayer : 1;
    this.container.innerHTML = `
      <div class="menu-container">
        <canvas id="menu-background"></canvas>
        <div class="menu-content">
          <button class="back-button" data-action="back">
            <span>← Back</span>
          </button>
          <div class="menu-header">
            <h2 class="menu-title">Player ${currentPlayer} - Select Your Deck</h2>
          </div>
          <div class="deck-select-container">
            <div class="deck-tabs">
              <button class="deck-tab active" data-tab="preset">Preset Decks</button>
              <button class="deck-tab" data-tab="custom">Custom Decks</button>
            </div>
            <div class="deck-grid" id="deck-grid">
              ${this.renderPresetDecks()}
            </div>
            <div class="deck-preview" id="deck-preview">
              <h3>Select a deck to preview</h3>
              <p>Choose from preset decks or create your own</p>
            </div>
          </div>
          <button class="menu-button menu-button-primary" id="confirm-deck-btn" disabled>
            <span class="button-icon">✓</span>
            <span class="button-text">Confirm Deck</span>
          </button>
        </div>
      </div>
    `;
    this.setupDeckSelectHandlers();
    this.initializeBackgroundAnimation();
  }

  private renderPresetDecks(): string {
    return this.presetDecks.map(deck => `
      <div class="deck-card" data-deck-id="${deck.id}">
        <div class="deck-icon">${deck.icon}</div>
        <h4 class="deck-name">${deck.name}</h4>
        <p class="deck-archetype">${deck.archetype}</p>
        <p class="deck-card-count">${deck.cardCount} cards</p>
      </div>
    `).join('');
  }

  private renderCustomDecks(): string {
    const savedDecks = JSON.parse(localStorage.getItem('savedDecks') || '[]');
    if (savedDecks.length === 0) {
      return `<div class="no-custom-decks">No custom decks created yet!</div>`;
    }
    
    return savedDecks.map((deck: any) => {
      // Safely calculate card count
      let cardCount = 0;
      let archetype = 'Custom';
      
      if (deck.cards && Array.isArray(deck.cards)) {
        cardCount = deck.cards.reduce((sum: number, dc: any) => sum + (dc.quantity || 0), 0);
        // Get the most common archetype from the deck
        const archetypes = deck.cards
          .filter((dc: any) => dc.card && dc.card.archetype)
          .map((dc: any) => dc.card.archetype);
        if (archetypes.length > 0) {
          archetype = this.getMostCommonArchetype(archetypes) || 'Custom';
        }
      }
      
      return `
        <div class="deck-card custom" data-deck-id="${deck.id}" data-deck-type="custom">
          <div class="deck-icon">${deck.icon || '📦'}</div>
          <h4 class="deck-name">${deck.name || 'Unnamed Deck'}</h4>
          <p class="deck-archetype">${archetype}</p>
          <p class="deck-card-count">${cardCount} cards</p>
        </div>
      `;
    }).join('');
  }

  private getMostCommonArchetype(archetypes: string[]): string {
    const counts = archetypes.reduce((acc: any, arch: string) => {
      acc[arch] = (acc[arch] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(counts)
      .sort(([, a]: any, [, b]: any) => b - a)[0]?.[0] || 'Custom';
  }

  private renderSettingsMenu(): void {
    this.container.innerHTML = `
      <div class="menu-container">
        <canvas id="menu-background"></canvas>
        <div class="menu-content">
          <button class="back-button" data-action="back">
            <span>← Back</span>
          </button>
          
          <div class="menu-header">
            <h2 class="menu-title">Settings</h2>
          </div>
          
          <div class="settings-container">
            <div class="settings-group">
              <h3>Audio</h3>
              <div class="setting-item">
                <label>Master Volume</label>
                <input type="range" min="0" max="100" value="50" class="slider">
              </div>
              <div class="setting-item">
                <label>Music Volume</label>
                <input type="range" min="0" max="100" value="50" class="slider">
              </div>
              <div class="setting-item">
                <label>SFX Volume</label>
                <input type="range" min="0" max="100" value="50" class="slider">
              </div>
            </div>
            
            <div class="settings-group">
              <h3>Graphics</h3>
              <div class="setting-item">
                <label>Animations</label>
                <input type="checkbox" checked class="toggle">
              </div>
              <div class="setting-item">
                <label>Particle Effects</label>
                <input type="checkbox" checked class="toggle">
              </div>
            </div>
            
            <div class="settings-group">
              <h3>Gameplay</h3>
              <div class="setting-item">
                <label>Auto End Turn</label>
                <input type="checkbox" class="toggle">
              </div>
              <div class="setting-item">
                <label>Confirm Actions</label>
                <input type="checkbox" checked class="toggle">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupSettingsHandlers();
    this.initializeBackgroundAnimation();
  }

  private initializeBackgroundAnimation(): void {
    const canvas = document.getElementById('menu-background') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.5
      });
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 14, 26, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
        ctx.fill();

        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;
      });

      requestAnimationFrame(animate);
    };

    animate();
  }

  private setupMainMenuHandlers(): void {
    const buttons = this.container.querySelectorAll('.menu-button');
    
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-action');
        
        switch (action) {
          case 'play':
            this.currentMenu = 'gameMode';
            this.render();
            break;
          case 'collection':
            alert('Collection feature coming soon!');
            break;
          case 'builder':
            this.currentMenu = 'builder';
            this.render();
            break;
          case 'settings':
            this.currentMenu = 'settings';
            this.render();
            break;
          case 'quit':
            if (confirm('Are you sure you want to quit?')) {
              window.close();
            }
            break;
        }
      });
    });
  }

  private setupBuilderMenuHandlers(): void {
    const backBtn = this.container.querySelector('.back-button');
    backBtn?.addEventListener('click', () => {
      this.currentMenu = 'main';
      this.render();
    });

    const builderCards = this.container.querySelectorAll('.builder-card');
    builderCards.forEach(card => {
      card.addEventListener('click', () => {
        const builderType = card.getAttribute('data-builder');
        
        if (builderType === 'card') {
          this.openCardBuilder();
        } else if (builderType === 'deck') {
          this.openDeckBuilder();
        }
      });
    });
  }

  private openCardBuilder(): void {
    // Hide menu
    this.container.style.display = 'none';
    
    // Create card builder container
    const cardBuilderContainer = document.createElement('div');
    cardBuilderContainer.id = 'card-builder-container';
    document.body.appendChild(cardBuilderContainer);
    
    // Initialize card builder
    this.cardBuilder = new CardBuilder(cardBuilderContainer);
    
    // Handle card builder close
    this.cardBuilder.on('closeCardBuilder', () => {
      this.closeCardBuilder();
    });
    
    // Handle card creation
    this.cardBuilder.on('cardCreated', (card: any) => {
      this.logger.info('Card created:', card);
      // You could add the card to a collection here
    });
  }

  private closeCardBuilder(): void {
    // Destroy card builder
    if (this.cardBuilder) {
      this.cardBuilder.destroy();
      this.cardBuilder = null;
    }
    
    // Remove card builder container
    const cardBuilderContainer = document.getElementById('card-builder-container');
    if (cardBuilderContainer) {
      cardBuilderContainer.remove();
    }
    
    // Show menu again
    this.container.style.display = 'block';
    this.currentMenu = 'builder';
    this.render();
  }

  private openDeckBuilder(): void {
    // Hide menu
    this.container.style.display = 'none';

    // Create deck builder container
    const deckBuilderContainer = document.createElement('div');
    deckBuilderContainer.id = 'deck-builder-container';
    document.body.appendChild(deckBuilderContainer);

    // Initialize deck builder
    this.deckBuilder = new DeckBuilder(deckBuilderContainer);

    // Handle deck builder close
    this.deckBuilder.on('closeDeckBuilder', () => {
      this.closeDeckBuilder();
    });
  }

  private closeDeckBuilder(): void {
    // Destroy deck builder
    if (this.deckBuilder) {
      this.deckBuilder.destroy();
      this.deckBuilder = null;
    }

    // Remove deck builder container
    const deckBuilderContainer = document.getElementById('deck-builder-container');
    if (deckBuilderContainer) {
      deckBuilderContainer.remove();
    }

    // Show menu again
    this.container.style.display = 'block';
    this.currentMenu = 'builder';
    this.render();
  }

  private setupGameModeHandlers(): void {
    const backBtn = this.container.querySelector('.back-button');
    backBtn?.addEventListener('click', () => {
      this.currentMenu = 'main';
      this.render();
    });

    const modeCards = this.container.querySelectorAll('.game-mode-card:not(.disabled)');
    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.getAttribute('data-mode');
        this.gameMode = mode as 'pvp' | 'ai' | null;
        this.currentMenu = 'deckSelect';
        this.render();
      });
    });
  }

  private setupDeckSelectHandlers(): void {
    const backBtn = this.container.querySelector('.back-button');
    backBtn?.addEventListener('click', () => {
      this.currentMenu = 'gameMode';
      this.render();
    });

    const deckTabs = this.container.querySelectorAll('.deck-tab');
    const deckGrid = this.container.querySelector('#deck-grid');
    let currentTab: 'preset' | 'custom' = 'preset';
    let selectedDeckId: string | null = this.selectedDeckId;
    let selectedDeckType: 'preset' | 'custom' | null = this.selectedDeckType as any;
    let selectedDeckData: any = null;

    const setupDeckCardHandlers = (deckGrid: Element | null, tab: 'preset' | 'custom') => {
      if (!deckGrid) return;
      const deckCards = deckGrid.querySelectorAll('.deck-card');
      deckCards.forEach(card => {
        card.addEventListener('click', () => {
          deckCards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedDeckId = card.getAttribute('data-deck-id');
          selectedDeckType = card.getAttribute('data-deck-type') as 'preset' | 'custom' || tab;
          if (tab === 'preset') {
            selectedDeckData = this.presetDecks.find(d => d.id === selectedDeckId);
          } else {
            const savedDecks = JSON.parse(localStorage.getItem('savedDecks') || '[]');
            selectedDeckData = savedDecks.find((d: any) => d.id === selectedDeckId);
          }
          if (selectedDeckData) {
            this.updateDeckPreview(selectedDeckData);
            const confirmBtn = document.getElementById('confirm-deck-btn') as HTMLButtonElement;
            if (confirmBtn) confirmBtn.disabled = false;
          }
        });
      });
    };

    const renderTab = (tab: 'preset' | 'custom') => {
      currentTab = tab;
      deckTabs.forEach(t => t.classList.toggle('active', (t as HTMLElement).dataset.tab === tab));
      if (deckGrid) {
        deckGrid.innerHTML = tab === 'preset' ? this.renderPresetDecks() : this.renderCustomDecks();
      }
      selectedDeckId = null;
      selectedDeckType = tab;
      selectedDeckData = null;
      const confirmBtn = document.getElementById('confirm-deck-btn') as HTMLButtonElement;
      if (confirmBtn) confirmBtn.disabled = true;
      setupDeckCardHandlers(deckGrid, tab);
    };

    deckTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabType = (tab as HTMLElement).dataset.tab as 'preset' | 'custom';
        renderTab(tabType);
      });
    });

    setupDeckCardHandlers(deckGrid, currentTab);

    const confirmBtn = document.getElementById('confirm-deck-btn');
    confirmBtn?.addEventListener('click', () => {
      if (!selectedDeckId || !selectedDeckType) return;
      if (this.gameMode === 'pvp' && this.currentSelectingPlayer === 1) {
        // Store Player 1's deck selection
        this.player1DeckSelection = {
          deckId: selectedDeckId,
          deckType: selectedDeckType
        };
        // Move to Player 2 selection
        this.currentSelectingPlayer = 2;
        this.selectedDeckId = null;
        this.selectedDeckType = null;
        this.render();
      } else {
        // Store Player 2's deck selection (or single player)
        const player2Selection = this.gameMode === 'pvp' ? {
          deckId: selectedDeckId,
          deckType: selectedDeckType
        } : null;
        // Start game with both selections
        this.eventBus.emit('startGame', {
          player1: this.player1DeckSelection || {
            deckId: selectedDeckId,
            deckType: selectedDeckType
          },
          player2: player2Selection
        });
      }
    });

    const startBtn = document.getElementById('start-game-btn');
    startBtn?.addEventListener('click', () => {
      if (selectedDeckId) {
        // For single deck selection (old system)
        this.eventBus.emit('startGame', { 
          player1: {
            deckId: selectedDeckId, 
            deckType: selectedDeckType
          }
        });
      }
    });
  }

  private setupSettingsHandlers(): void {
    const backBtn = this.container.querySelector('.back-button');
    backBtn?.addEventListener('click', () => {
      this.currentMenu = 'main';
      this.render();
    });
  }

  private updateDeckPreview(deck: any): void {
    const preview = document.getElementById('deck-preview');
    if (!preview) return;

    const icon = deck.icon || '📦';
    const name = deck.name || 'Unnamed Deck';
    const isCustom = deck.cards && Array.isArray(deck.cards);
    
    let archetype = deck.archetype || 'Custom';
    let cardCount = deck.cardCount || 0;
    let keyCardsHtml = '';
    
    if (isCustom) {
      cardCount = deck.cards.reduce((sum: number, dc: any) => sum + (dc.quantity || 0), 0);
      // Get actual cards from the deck
      const topCards = deck.cards
        .filter((dc: any) => dc.card && dc.card.name)
        .sort((a: any, b: any) => (b.card.cost || 0) - (a.card.cost || 0)) // Sort by cost
        .slice(0, 3);
      if (topCards.length > 0) {
        keyCardsHtml = topCards.map((dc: any) => 
          `<div class="card-mini">${dc.card.icon || '🃏'} ${dc.card.name}</div>`
        ).join('');
      } else {
        keyCardsHtml = '<div class="card-mini">No cards in deck</div>';
      }
    } else {
      // Preset deck
      keyCardsHtml = this.getPresetDeckKeyCards(deck.id);
    }
    
    const description = deck.description || 'Custom created deck';

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

  private getPresetDeckKeyCards(deckId: string): string {
    switch (deckId) {
      case 'aggro-rush':
        return `
          <div class="card-mini">🦎 Kriper</div>
          <div class="card-mini">⚔️ Mercenary</div>
          <div class="card-mini">🗡️ Berserker</div>
        `;
      case 'control-defense':
        return `
          <div class="card-mini">🛡️ Guard</div>
          <div class="card-mini">👑 Warchief</div>
          <div class="card-mini">🗿 Titan</div>
        `;
      default:
        return `
          <div class="card-mini">🦎 Kriper</div>
          <div class="card-mini">⚔️ Mercenary</div>
          <div class="card-mini">🛡️ Guard</div>
        `;
    }
  }

  public on(event: string, handler: Function): void {
    this.eventBus.on(event, handler);
  }

  public show(): void {
    this.container.style.display = 'block';
  }

  public hide(): void {
    this.container.style.display = 'none';
  }

  public destroy(): void {
    if (this.cardBuilder) {
      this.cardBuilder.destroy();
    }
    this.eventBus.clear();
    this.container.innerHTML = '';
  }
}