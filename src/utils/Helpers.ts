// src/utils/Helpers.ts
export class Helpers {
    public static shuffle<T>(array: T[]): T[] {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  
    public static clamp(value: number, min: number, max: number): number {
      return Math.max(min, Math.min(max, value));
    }
  
    public static lerp(start: number, end: number, t: number): number {
      return start + (end - start) * t;
    }
  
    public static distance(a: { x: number, y: number }, b: { x: number, y: number }): number {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
  
    public static generateId(): string {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  
    public static debounce<T extends (...args: any[]) => any>(
      func: T,
      wait: number
    ): (...args: Parameters<T>) => void {
      let timeout: NodeJS.Timeout | null = null;
      
      return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
      };
    }
  
    public static throttle<T extends (...args: any[]) => any>(
      func: T,
      limit: number
    ): (...args: Parameters<T>) => void {
      let inThrottle = false;
      
      return (...args: Parameters<T>) => {
        if (!inThrottle) {
          func(...args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    }
  }