import chalk from "chalk";
import { logger } from "./logger";

export class CyrusError extends Error {
  public readonly code: string;
  public readonly category: string;
  public readonly metadata?: any;

  constructor(
    message: string,
    code: string = "UNKNOWN_ERROR",
    category: string = "general",
    metadata?: any,
  ) {
    super(message);
    this.name = "CyrusError";
    this.code = code;
    this.category = category;
    this.metadata = metadata;
  }
}

export class ConfigurationError extends CyrusError {
  constructor(message: string, metadata?: any) {
    super(message, "CONFIG_ERROR", "configuration", metadata);
    this.name = "ConfigurationError";
  }
}

export class AIServiceError extends CyrusError {
  constructor(message: string, provider?: string, metadata?: any) {
    super(message, "AI_SERVICE_ERROR", "ai", { provider, ...metadata });
    this.name = "AIServiceError";
  }
}

export class AnalysisError extends CyrusError {
  constructor(message: string, filePath?: string, metadata?: any) {
    super(message, "ANALYSIS_ERROR", "analysis", { filePath, ...metadata });
    this.name = "AnalysisError";
  }
}

export class FileSystemError extends CyrusError {
  constructor(message: string, filePath?: string, metadata?: any) {
    super(message, "FILESYSTEM_ERROR", "filesystem", { filePath, ...metadata });
    this.name = "FileSystemError";
  }
}

export class ValidationError extends CyrusError {
  constructor(message: string, field?: string, metadata?: any) {
    super(message, "VALIDATION_ERROR", "validation", { field, ...metadata });
    this.name = "ValidationError";
  }
}

export interface ErrorHandlerOptions {
  showStackTrace?: boolean;
  logToFile?: boolean;
  exitOnError?: boolean;
  showHelp?: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private options: ErrorHandlerOptions = {
    showStackTrace: false,
    logToFile: true,
    exitOnError: true,
    showHelp: false,
  };

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public configure(options: Partial<ErrorHandlerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  public handle(error: Error, context?: string): void {
    // Log the error
    logger.logError(error, context);

    // Display user-friendly error message
    this.displayError(error, context);

    // Exit if configured to do so
    if (this.options.exitOnError) {
      process.exit(1);
    }
  }

  public handleAsync<T>(
    operation: () => Promise<T>,
    context?: string,
    fallback?: T,
  ): Promise<T | undefined> {
    return operation().catch((error) => {
      this.handle(error, context);
      return fallback;
    });
  }

  public wrap<T extends any[], R>(
    fn: (...args: T) => R,
    context?: string,
  ): (...args: T) => R | undefined {
    return (...args: T) => {
      try {
        return fn(...args);
      } catch (error) {
        this.handle(error as Error, context);
        return undefined;
      }
    };
  }

  public wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string,
  ): (...args: T) => Promise<R | undefined> {
    return async (...args: T) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error as Error, context);
        return undefined;
      }
    };
  }

  private displayError(error: Error, context?: string): void {
    console.error(); // Empty line for spacing

    if (error instanceof CyrusError) {
      this.displayCyrusError(error, context);
    } else {
      this.displayGenericError(error, context);
    }

    if (this.options.showStackTrace && error.stack) {
      console.error(chalk.gray("\nStack trace:"));
      console.error(chalk.gray(error.stack));
    }

    if (this.options.showHelp) {
      this.displayHelp();
    }

    console.error(); // Empty line for spacing
  }

  private displayCyrusError(error: CyrusError, context?: string): void {
    const categoryIcons = {
      configuration: "⚙️",
      ai: "🤖",
      analysis: "🔍",
      filesystem: "📁",
      validation: "✅",
      general: "❌",
    };

    const icon =
      categoryIcons[error.category as keyof typeof categoryIcons] || "❌";

    console.error(
      chalk.red(`${icon} ${error.name}${context ? ` (${context})` : ""}:`),
    );
    console.error(chalk.white(`   ${error.message}`));

    if (error.code !== "UNKNOWN_ERROR") {
      console.error(chalk.gray(`   Error Code: ${error.code}`));
    }

    // Display helpful metadata
    if (error.metadata) {
      this.displayErrorMetadata(error.metadata);
    }

    // Provide specific guidance based on error type
    this.displayErrorGuidance(error);
  }

  private displayGenericError(error: Error, context?: string): void {
    console.error(
      chalk.red(`❌ ${error.name}${context ? ` (${context})` : ""}:`),
    );
    console.error(chalk.white(`   ${error.message}`));
  }

  private displayErrorMetadata(metadata: any): void {
    if (metadata.filePath) {
      console.error(chalk.gray(`   File: ${metadata.filePath}`));
    }
    if (metadata.provider) {
      console.error(chalk.gray(`   AI Provider: ${metadata.provider}`));
    }
    if (metadata.field) {
      console.error(chalk.gray(`   Field: ${metadata.field}`));
    }
  }

  private displayErrorGuidance(error: CyrusError): void {
    const guidance = this.getErrorGuidance(error);
    if (guidance.length > 0) {
      console.error(chalk.yellow("\n💡 Suggestions:"));
      guidance.forEach((suggestion, index) => {
        console.error(chalk.white(`   ${index + 1}. ${suggestion}`));
      });
    }
  }

  private getErrorGuidance(error: CyrusError): string[] {
    const guidance: string[] = [];

    switch (error.category) {
      case "configuration":
        guidance.push('Run "cyrus config init" to set up your configuration');
        guidance.push(
          "Check if your API key is valid and has sufficient permissions",
        );
        guidance.push("Verify your AI provider settings");
        break;

      case "ai":
        guidance.push("Check your internet connection");
        guidance.push("Verify your API key is valid and not expired");
        guidance.push(
          "Try reducing the input size if the request is too large",
        );
        guidance.push(
          "Check if your AI provider has rate limits or usage quotas",
        );
        break;

      case "analysis":
        guidance.push("Ensure the file exists and is readable");
        guidance.push("Check if the file type is supported");
        guidance.push("Try with a smaller file to isolate the issue");
        break;

      case "filesystem":
        guidance.push("Check if the file or directory exists");
        guidance.push("Verify you have read/write permissions");
        guidance.push("Ensure the file is not locked by another process");
        break;

      case "validation":
        guidance.push("Check the input format and requirements");
        guidance.push("Refer to the documentation for valid values");
        break;
    }

    // Add common guidance
    if (guidance.length > 0) {
      guidance.push('Use "cyrus --help" for usage information');
    }

    return guidance;
  }

  private displayHelp(): void {
    console.error(chalk.cyan("\n📚 Need help?"));
    console.error(
      chalk.white(
        "   Documentation: https://github.com/ali-master/cyrus#readme",
      ),
    );
    console.error(
      chalk.white("   Issues: https://github.com/ali-master/cyrus/issues"),
    );
    console.error(chalk.white("   Discord: [Coming soon]"));
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();

// Setup global error handling
process.on("uncaughtException", (error) => {
  errorHandler.handle(error, "uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  errorHandler.handle(error, "unhandledRejection");
});

// Helper functions for common error scenarios
export const handleFileError = (error: Error, filePath: string): void => {
  if (error.message.includes("ENOENT")) {
    throw new FileSystemError(`File not found: ${filePath}`, filePath);
  } else if (error.message.includes("EACCES")) {
    throw new FileSystemError(`Permission denied: ${filePath}`, filePath);
  } else if (error.message.includes("EISDIR")) {
    throw new FileSystemError(
      `Expected file but found directory: ${filePath}`,
      filePath,
    );
  } else {
    throw new FileSystemError(`File system error: ${error.message}`, filePath);
  }
};

export const handleAIError = (error: Error, provider: string): void => {
  if (error.message.includes("API key")) {
    throw new AIServiceError("Invalid or missing API key", provider);
  } else if (error.message.includes("rate limit")) {
    throw new AIServiceError("API rate limit exceeded", provider);
  } else if (error.message.includes("quota")) {
    throw new AIServiceError("API quota exceeded", provider);
  } else if (
    error.message.includes("network") ||
    error.message.includes("ENOTFOUND")
  ) {
    throw new AIServiceError("Network connection failed", provider);
  } else {
    throw new AIServiceError(`AI service error: ${error.message}`, provider);
  }
};

export const validateRequired = (value: any, fieldName: string): void => {
  if (value === undefined || value === null || value === "") {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
};

export const validateFileExists = (filePath: string): void => {
  try {
    // eslint-disable-next-line ts/no-require-imports
    const fs = require("fs");
    if (!fs.existsSync(filePath)) {
      throw new FileSystemError(`File does not exist: ${filePath}`, filePath);
    }
  } catch (error) {
    handleFileError(error as Error, filePath);
  }
};
