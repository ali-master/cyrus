export interface CodeDiagnostic {
  message: string;
  line: number;
  column: number;
  severity: "error" | "warning" | "info";
  rule?: string;
  source?: string;
}

export interface AnalysisResult {
  diagnostics: CodeDiagnostic[];
  metrics?: CodeMetrics;
  suggestions?: RefactorSuggestion[];
}

export interface CodeMetrics {
  complexity: number;
  maintainabilityIndex: number;
  linesOfCode: number;
  technicalDebt: number;
  duplicateLines: number;
  testCoverage?: number;
}

export interface RefactorSuggestion {
  id: string;
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  category: "performance" | "readability" | "maintainability" | "security";
  before: string;
  after: string;
  line: number;
  confidence: number;
}

export interface SecurityVulnerability {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  line: number;
  file: string;
  cwe?: string;
  owasp?: string;
  fix?: string;
}

export type AIProviderType =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "ollama"
  | "lmstudio"
  | "local";

export interface AIProvider {
  name: AIProviderType;
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LocalAIProvider extends AIProvider {
  name: "ollama" | "lmstudio" | "local";
  baseURL: string;
  apiKey?: never;
}

export interface Config {
  $schema?: string;
  aiProvider: AIProvider;
  features: {
    securityScan: boolean;
    performanceAnalysis: boolean;
    codeGeneration: boolean;
    refactorSuggestions: boolean;
    mentorMode: boolean;
  };
  languages: string[];
  outputFormat: "text" | "json" | "markdown";
  detectLanguage?: {
    enabled: boolean;
    confidence: number;
  };
  localModels?: {
    ollama?: {
      models: string[];
      defaultModel: string;
    };
    lmstudio?: {
      models: string[];
      defaultModel: string;
    };
  };
}

export interface MentorContext {
  codeHistory: string[];
  userLevel: "beginner" | "intermediate" | "advanced";
  focusAreas: string[];
  learningGoals: string[];
}

export interface GeneratedCode {
  type: "test" | "documentation" | "refactor" | "implementation";
  content: string;
  language: string;
  framework?: string;
  dependencies?: string[];
  explanation: string;
}

export type SupportedLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "go"
  | "rust"
  | "csharp"
  | "php"
  | "ruby"
  | "jsx"
  | "tsx";

export interface FileAnalysis {
  filePath: string;
  language: SupportedLanguage;
  size: number;
  lastModified: Date;
  analysis: AnalysisResult;
  healthScore: number;
  issues: SecurityVulnerability[];
}

export interface ProjectHealth {
  overallScore: number;
  fileAnalyses: FileAnalysis[];
  summary: {
    totalFiles: number;
    totalIssues: number;
    criticalIssues: number;
    technicalDebt: number;
    testCoverage: number;
  };
  recommendations: string[];
}

// Export config types for JS/TS config files
export type CyrusConfig = Config;
export type CyrusAIProvider = AIProvider;
export type CyrusAIProviderType = AIProviderType;
export type CyrusLocalAIProvider = LocalAIProvider;
export type CyrusSupportedLanguage = SupportedLanguage;
