export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
  }
  
  export class Logger {
    private static globalLevel: LogLevel = LogLevel.INFO;
    private context: string;
  
    constructor(context: string) {
      this.context = context;
    }
  
    public static setGlobalLevel(level: LogLevel): void {
      Logger.globalLevel = level;
    }
  
    public debug(message: string, data?: any): void {
      this.log(LogLevel.DEBUG, message, data);
    }
  
    public info(message: string, data?: any): void {
      this.log(LogLevel.INFO, message, data);
    }
  
    public warn(message: string, data?: any): void {
      this.log(LogLevel.WARN, message, data);
    }
  
    public error(message: string, data?: any): void {
      this.log(LogLevel.ERROR, message, data);
    }
  
    private log(level: LogLevel, message: string, data?: any): void {
      if (level < Logger.globalLevel) return;
  
      const timestamp = new Date().toISOString();
      const levelName = LogLevel[level];
      const prefix = `[${timestamp}] [${levelName}] [${this.context}]`;
  
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(prefix, message, data);
          break;
        case LogLevel.INFO:
          console.info(prefix, message, data);
          break;
        case LogLevel.WARN:
          console.warn(prefix, message, data);
          break;
        case LogLevel.ERROR:
          console.error(prefix, message, data);
          break;
      }
    }
  }