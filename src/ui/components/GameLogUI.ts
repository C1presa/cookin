// src/ui/components/GameLogUI.ts
export class GameLogUI {
    private container: HTMLElement;
    private logs: string[] = [];
    private maxLogs: number = 50;
  
    constructor(container: HTMLElement) {
      this.container = container;
      this.render();
      this.setupEventListeners();
    }
  
    private setupEventListeners(): void {
      const gameEngine = (window as any).curveGame?.gameEngine;
      if (!gameEngine) return;
  
      gameEngine.on('phaseChanged', (event: any) => {
        this.addLog(`Phase changed to ${event.data.phase}`);
      });
  
      gameEngine.on('unitPlayed', (event: any) => {
        this.addLog(`Player ${event.data.playerId} played ${event.data.unit.name}`);
      });
  
      gameEngine.on('unitMoved', (event: any) => {
        this.addLog(`${event.data.unit.name} moved`);
      });
  
      gameEngine.on('unitAttacked', (event: any) => {
        this.addLog(`${event.data.attacker.name} attacked ${event.data.target.name} for ${event.data.damage} damage`);
      });
  
      gameEngine.on('unitDied', (event: any) => {
        this.addLog(`${event.data.unit.name} was destroyed`);
      });
  
      gameEngine.on('playerAttacked', (event: any) => {
        this.addLog(`${event.data.attacker.name} attacked player for ${event.data.damage} damage`);
      });
  
      gameEngine.on('turnEnded', (event: any) => {
        this.addLog(`Turn ${event.data.turnNumber} started`);
      });
    }
  
    public addLog(message: string): void {
      const timestamp = new Date().toLocaleTimeString();
      this.logs.push(`[${timestamp}] ${message}`);
      
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
      
      this.render();
    }
  
    private render(): void {
      this.container.innerHTML = `
        <h4>Game Log</h4>
        <div class="log-content">
          ${this.logs.map(log => `
            <div class="log-entry">${log}</div>
          `).join('')}
        </div>
      `;
  
      // Auto-scroll to bottom
      const logContent = this.container.querySelector('.log-content');
      if (logContent) {
        logContent.scrollTop = logContent.scrollHeight;
      }
    }
  
    public destroy(): void {
      // Clean up event listeners if needed
    }
  }