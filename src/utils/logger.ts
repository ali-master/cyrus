import fs from "fs";
import path from "path";
import chalk from "chalk";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  category?: string;
  metadata?: any;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private enableFileLogging: boolean = false;
  private logDirectory: string = "logs";
  private maxLogFiles: number = 5;

  private constructor() {
    // Initialize log directory if file logging is enabled
    if (this.enableFileLogging) {
      this.ensureLogDirectory();
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public configure(options: {
    logLevel?: LogLevel;
    enableFileLogging?: boolean;
    logDirectory?: string;
    maxLogFiles?: number;
  }): void {
    if (options.logLevel !== undefined) {
      this.logLevel = options.logLevel;
    }
    if (options.enableFileLogging !== undefined) {
      this.enableFileLogging = options.enableFileLogging;
    }
    if (options.logDirectory) {
      this.logDirectory = options.logDirectory;
    }
    if (options.maxLogFiles) {
      this.maxLogFiles = options.maxLogFiles;
    }

    if (this.enableFileLogging) {
      this.ensureLogDirectory();
    }
  }

  public debug(message: string, category?: string, metadata?: any): void {
    this.log(LogLevel.DEBUG, message, category, metadata);
  }

  public info(message: string, category?: string, metadata?: any): void {
    this.log(LogLevel.INFO, message, category, metadata);
  }

  public warn(message: string, category?: string, metadata?: any): void {
    this.log(LogLevel.WARN, message, category, metadata);
  }

  public error(message: string, category?: string, metadata?: any): void {
    this.log(LogLevel.ERROR, message, category, metadata);
  }

  public logAnalysis(
    filePath: string,
    analysisTime: number,
    issueCount: number,
  ): void {
    this.info(`Analysis completed: ${path.basename(filePath)}`, "analysis", {
      filePath,
      analysisTime,
      issueCount,
    });
  }

  public logAIRequest(
    provider: string,
    model: string,
    tokens: number,
    duration: number,
  ): void {
    this.info(`AI request completed: ${provider}/${model}`, "ai", {
      provider,
      model,
      tokens,
      duration,
    });
  }

  public logError(error: Error, context?: string): void {
    this.error(`${context ? `[${context}] ` : ""}${error.message}`, "error", {
      name: error.name,
      stack: error.stack,
      context,
    });
  }

  public logPerformance(operation: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.debug(`Performance: ${operation} took ${duration}ms`, "performance", {
      operation,
      duration,
    });
  }

  private log(
    level: LogLevel,
    message: string,
    category?: string,
    metadata?: any,
  ): void {
    if (level < this.logLevel) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      category,
      metadata,
    };

    // Console output
    this.logToConsole(logEntry);

    // File output
    if (this.enableFileLogging) {
      this.logToFile(logEntry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const levelColors = {
      [LogLevel.DEBUG]: chalk.gray,
      [LogLevel.INFO]: chalk.blue,
      [LogLevel.WARN]: chalk.yellow,
      [LogLevel.ERROR]: chalk.red,
    };

    const levelNames = {
      [LogLevel.DEBUG]: "DEBUG",
      [LogLevel.INFO]: "INFO ",
      [LogLevel.WARN]: "WARN ",
      [LogLevel.ERROR]: "ERROR",
    };

    const color = levelColors[entry.level];
    const levelName = levelNames[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const category = entry.category ? chalk.gray(`[${entry.category}]`) : "";

    console.log(
      `${chalk.gray(timestamp)} ${color(levelName)} ${category} ${entry.message}`,
    );

    // Log metadata for debug level or errors
    if (
      (entry.level === LogLevel.DEBUG || entry.level === LogLevel.ERROR) &&
      entry.metadata
    ) {
      console.log(chalk.gray("  Metadata:"), entry.metadata);
    }
  }

  private logToFile(entry: LogEntry): void {
    try {
      const logFileName = this.getLogFileName();
      const logLine = `${JSON.stringify(entry)  }\n`;

      fs.appendFileSync(logFileName, logLine, "utf-8");

      // Rotate logs if needed
      this.rotateLogsIfNeeded();
    } catch (error) {
      // Fallback to console if file logging fails
      console.error(chalk.red("Failed to write to log file:"), error);
    }
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return path.join(this.logDirectory, `cyrus-${date}.log`);
  }

  private rotateLogsIfNeeded(): void {
    try {
      const files = fs
        .readdirSync(this.logDirectory)
        .filter((file) => file.startsWith("cyrus-") && file.endsWith(".log"))
        .map((file) => ({
          name: file,
          path: path.join(this.logDirectory, file),
          stats: fs.statSync(path.join(this.logDirectory, file)),
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Remove old log files if we exceed the limit
      if (files.length > this.maxLogFiles) {
        const filesToDelete = files.slice(this.maxLogFiles);
        filesToDelete.forEach((file) => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error(chalk.red("Failed to rotate log files:"), error);
    }
  }

  public createChildLogger(category: string): ChildLogger {
    return new ChildLogger(this, category);
  }
}

export class ChildLogger {
  constructor(
    private parent: Logger,
    private category: string,
  ) {}

  public debug(message: string, metadata?: any): void {
    this.parent.debug(message, this.category, metadata);
  }

  public info(message: string, metadata?: any): void {
    this.parent.info(message, this.category, metadata);
  }

  public warn(message: string, metadata?: any): void {
    this.parent.warn(message, this.category, metadata);
  }

  public error(message: string, metadata?: any): void {
    this.parent.error(message, this.category, metadata);
  }

  public logError(error: Error, context?: string): void {
    this.parent.logError(
      error,
      `${this.category}${context ? `:${context}` : ""}`,
    );
  }
}

// Global logger instance
export const logger = Logger.getInstance();
