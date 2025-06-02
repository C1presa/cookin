export class StateManager<T> {
    private state: T;
    private history: T[] = [];
    private maxHistory: number;
    private subscribers: Set<(state: T) => void> = new Set();
  
    constructor(initialState: T, maxHistory: number = 50) {
      this.state = this.deepClone(initialState);
      this.maxHistory = maxHistory;
    }
  
    public getState(): Readonly<T> {
      return this.state;
    }
  
    public setState(newState: T): void {
      this.saveHistory();
      this.state = this.deepClone(newState);
      this.notifySubscribers();
    }
  
    public updateState(updater: (state: T) => T): void {
      this.saveHistory();
      this.state = updater(this.deepClone(this.state));
      this.notifySubscribers();
    }
  
    public undo(): boolean {
      if (this.history.length === 0) return false;
      
      this.state = this.history.pop()!;
      this.notifySubscribers();
      return true;
    }
  
    public canUndo(): boolean {
      return this.history.length > 0;
    }
  
    public subscribe(callback: (state: T) => void): () => void {
      this.subscribers.add(callback);
      return () => this.subscribers.delete(callback);
    }
  
    private saveHistory(): void {
      if (this.history.length >= this.maxHistory) {
        this.history.shift();
      }
      this.history.push(this.deepClone(this.state));
    }
  
    private notifySubscribers(): void {
      this.subscribers.forEach(callback => callback(this.state));
    }
  
    private deepClone(obj: T): T {
      return JSON.parse(JSON.stringify(obj));
    }
  }
  
  // src/utils/AsyncQueue.ts
  export class AsyncQueue<T> {
    private queue: T[] = [];
    private processing = false;
    private processor: (item: T) => Promise<void>;
  
    constructor(processor: (item: T) => Promise<void>) {
      this.processor = processor;
    }
  
    public async add(item: T): Promise<void> {
      this.queue.push(item);
      if (!this.processing) {
        await this.process();
      }
    }
  
    private async process(): Promise<void> {
      this.processing = true;
      
      while (this.queue.length > 0) {
        const item = this.queue.shift()!;
        try {
          await this.processor(item);
        } catch (error) {
          console.error('Error processing queue item:', error);
        }
      }
      
      this.processing = false;
    }
  
    public clear(): void {
      this.queue = [];
    }
  
    public getLength(): number {
      return this.queue.length;
    }
  }