import { EventBus } from '../utils/EventBus';
import { Logger } from '../utils/Logger';
import { GameEngine } from './GameEngine';
import { UIManager } from '../ui/UIManager';
import { MenuManager } from '../ui/MenuManager';

export class Game {
  private eventBus: EventBus;
  private logger: Logger;
  private gameEngine: GameEngine | null = null;
  private uiManager: UIManager | null = null;
  private menuManager: MenuManager;

  constructor(container: HTMLElement) {
    this.eventBus = new EventBus();
    this.logger = new Logger('Game');
    this.menuManager = new MenuManager(container);
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.menuManager.on('startGame', (data: any) => {
      this.logger.info('Starting game with deck data:', data);
      this.startGame(data);
    });
  }

  private startGame(deckData: any): void {
    this.logger.info('Starting game with deck data:', deckData);
    
    // Hide menu
    this.menuManager.hide();
    
    // Initialize game engine with the full deck data structure
    this.gameEngine = new GameEngine({}, deckData);
    
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
    // Clean up game
    if (this.gameEngine) {
      this.gameEngine.destroy();
      this.gameEngine = null;
    }
    if (this.uiManager) {
      this.uiManager.destroy();
      this.uiManager = null;
    }
    
    // Show menu
    this.menuManager.show();
  }

  public destroy(): void {
    if (this.gameEngine) {
      this.gameEngine.destroy();
    }
    if (this.uiManager) {
      this.uiManager.destroy();
    }
    this.menuManager.destroy();
    this.eventBus.clear();
  }
} 