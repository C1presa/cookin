import { GameEngine } from './core/GameEngine';
import { UIManager } from './ui/UIManager';
import { MenuManager } from './ui/MenuManager';
import { CardBuilder } from './ui/CardBuilder';
import { Logger, LogLevel } from './utils/Logger';
import './styles/main.css';

class CurveGame {
  private gameEngine: GameEngine | null = null;
  private uiManager: UIManager | null = null;
  private menuManager: MenuManager;
  private cardBuilder: CardBuilder | null = null;
  private logger: Logger;
  private menuContainer: HTMLElement;
  private gameMode: string | null = null;

  constructor() {
    this.logger = new Logger('CurveGame');
    
    // Set log level based on environment
    const isDev = window.location.hostname === 'localhost';
    Logger.setGlobalLevel(isDev ? LogLevel.DEBUG : LogLevel.INFO);
    
    this.logger.info('Initializing Curve Game...');
    
    // Create menu container
    this.menuContainer = document.createElement('div');
    this.menuContainer.id = 'menu-container';
    document.getElementById('app')!.appendChild(this.menuContainer);
    
    // Initialize menu
    this.menuManager = new MenuManager(this.menuContainer);
    
    // Set up menu event handlers
    this.setupEventHandlers();
    
    // Set up global error handling
    this.setupErrorHandling();
    
    // Start with menu
    this.showMenu();
  }

  private setupEventHandlers(): void {
    this.menuManager.on('gameModeSelected', (data: any) => {
      this.gameMode = data.mode;
      this.logger.info(`Game mode selected: ${data.mode}`);
    });

    this.menuManager.on('startGame', (data: any) => {
      this.logger.info(`Starting game with deck data:`, data);
      // Pass the full data object, not just deckId
      this.startGame(data);
    });

    // Card Builder events
    this.menuManager.on('openCardBuilder', () => {
      this.logger.info('Opening card builder');
      this.openCardBuilder();
    });
  }

  private setupErrorHandling(): void {
    window.addEventListener('error', (event) => {
      this.logger.error('Global error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logger.error('Unhandled promise rejection:', event.reason);
    });
  }

  private showMenu(): void {
    this.logger.info('Showing menu...');
    
    // Hide loading screen
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => loadingScreen.remove(), 500);
      }, 2000); // Show loading screen for 2 seconds
    }
    
    // Clean up card builder if exists
    if (this.cardBuilder) {
      this.cardBuilder.destroy();
      this.cardBuilder = null;
    }
    
    this.menuManager.show();
  }

  private openCardBuilder(): void {
    this.logger.info('Opening card builder...');
    
    // Hide menu
    this.menuManager.hide();
    
    // Create card builder container
    const builderContainer = document.createElement('div');
    builderContainer.id = 'card-builder-container';
    document.getElementById('app')!.appendChild(builderContainer);
    
    // Initialize card builder
    this.cardBuilder = new CardBuilder(builderContainer);
    
    // Handle card builder events
    this.cardBuilder.on('closeCardBuilder', () => {
      this.closeCardBuilder();
    });
    
    this.cardBuilder.on('cardCreated', (card: any) => {
      this.logger.info('Card created:', card);
      // In a real app, you'd save this to a database
      // For now, it's saved to localStorage in the CardBuilder
    });
  }

  private closeCardBuilder(): void {
    this.logger.info('Closing card builder...');
    
    // Clean up card builder
    if (this.cardBuilder) {
      this.cardBuilder.destroy();
      this.cardBuilder = null;
    }
    
    // Remove container
    const container = document.getElementById('card-builder-container');
    if (container) {
      container.remove();
    }
    
    // Show menu again
    this.showMenu();
  }

  private startGame(deckData: any): void {
    this.logger.info('Starting game with deck data:', deckData);
    
    // Hide menu
    this.menuManager.hide();
    
    // The deckData already has player1 and player2 properties!
    // Just pass it directly with gameMode added
    const gameConfig = {
      ...deckData,  // This already has player1 and player2
      gameMode: this.gameMode
    };
    
    // Initialize game engine with proper config
    this.gameEngine = new GameEngine({}, gameConfig);
    
    // Initialize UI
    this.uiManager = new UIManager(this.gameEngine);
    
    // Store game reference globally for debugging
    (window as any).curveGame = this;
    
    // Add return to menu handler
    this.uiManager.on('returnToMenu', () => {
      this.returnToMenu();
    });
    
    // Start the game
    this.gameEngine.startGame();
    
    // Initial render
    this.uiManager.render();
    
    this.logger.info('Game started successfully!');
  }

  private returnToMenu(): void {
    this.logger.info('Returning to menu...');
    
    // Destroy game instances
    if (this.uiManager) {
      this.uiManager.destroy();
      this.uiManager = null;
    }
    
    if (this.gameEngine) {
      this.gameEngine.destroy();
      this.gameEngine = null;
    }
    
    // Show menu again
    this.showMenu();
  }

  public destroy(): void {
    this.logger.info('Destroying game...');
    
    if (this.uiManager) {
      this.uiManager.destroy();
    }
    
    if (this.gameEngine) {
      this.gameEngine.destroy();
    }
    
    if (this.cardBuilder) {
      this.cardBuilder.destroy();
    }
    
    this.menuManager.destroy();
    
    this.logger.info('Game destroyed');
  }
}

// Initialize game when DOM is ready
let game: CurveGame | null = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    game = new CurveGame();
  });
} else {
  game = new CurveGame();
}

// Export for debugging
export { game };