import { ConfigManager } from "./config/config";
import { AIService } from "./services/ai-service";
import { CodeAnalyzer } from "./analyzers/code-analyzer";

export { CodeAnalyzer } from "./analyzers/code-analyzer";
export { LanguageDetector } from "./analyzers/language-detector";
export { AnalyzeCommand } from "./commands/analyze";
// Command exports
export { ConfigCommand } from "./commands/config";

export { GenerateCommand } from "./commands/generate";
export { HealthCommand } from "./commands/health";

export { MentorCommand } from "./commands/mentor";
// Main exports for programmatic usage
export { ConfigManager } from "./config/config";
export { AIService } from "./services/ai-service";
// Type exports
export type {
  AIProvider,
  AnalysisResult,
  CodeDiagnostic,
  CodeMetrics,
  Config,
  FileAnalysis,
  GeneratedCode,
  MentorContext,
  ProjectHealth,
  RefactorSuggestion,
  SecurityVulnerability,
  SupportedLanguage,
} from "./types";
export {
  AIServiceError,
  AnalysisError,
  ConfigurationError,
  CyrusError,
  errorHandler,
  ErrorHandler,
  FileSystemError,
  ValidationError,
} from "./utils/error-handler.js";

// Utility exports
export { logger, Logger, LogLevel } from "./utils/logger";

// Constants
export const SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "go",
  "rust",
  "csharp",
  "php",
  "ruby",
  "jsx",
  "tsx",
] as const;

export const AI_PROVIDERS = ["openai", "anthropic", "google"] as const;

// Utility functions
export const createCyrusInstance = () => {
  return {
    config: ConfigManager.getInstance(),
    ai: AIService.getInstance(),
    analyzer: CodeAnalyzer.getInstance(),
  };
};

// Version
export const VERSION = "1.0.0";
