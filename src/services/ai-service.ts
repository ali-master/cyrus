import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { xai } from "@ai-sdk/xai";
import { createOpenAI } from "@ai-sdk/openai";
import chalk from "chalk";
import type {
  SecurityVulnerability,
  RefactorSuggestion,
  GeneratedCode,
  Config,
} from "../types";
import { ConfigManager } from "../config/config";
import { handleAIError, ConfigurationError } from "../utils/error-handler";

export class AIService {
  private static instance: AIService;
  private config!: Config;

  private constructor() {
    // Config will be initialized before use
  }

  private async ensureConfig() {
    if (!this.config) {
      try {
        this.config =
          (await ConfigManager.getInstance().getConfig()) ||
          ConfigManager.getInstance().getDefaultConfig();
      } catch (error) {
        throw new ConfigurationError(
          `Failed to load AI service configuration: ${(error as Error).message}`,
        );
      }
    }
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private getProvider() {
    const { aiProvider } = this.config;

    if (!aiProvider || !aiProvider.name) {
      throw new ConfigurationError(
        "AI provider not configured. Please run: cyrus config init",
      );
    }

    switch (aiProvider.name.toLowerCase()) {
      case "anthropic":
        return anthropic(aiProvider.model);
      case "google":
        return google(aiProvider.model);
      case "xai":
        return xai(aiProvider.model);
      case "ollama":
      case "lmstudio":
      case "local": {
        // Use OpenAI-compatible provider for local models
        const localProvider = createOpenAI({
          baseURL:
            aiProvider.baseURL || this.getDefaultLocalURL(aiProvider.name),
          apiKey: aiProvider.apiKey || "not-required", // Some local providers don't need API keys
        });
        return localProvider(aiProvider.model);
      }
      case "openai":
      default:
        return openai(aiProvider.model);
    }
  }

  private getDefaultLocalURL(provider: string): string {
    const urls: Record<string, string> = {
      ollama: "http://localhost:11434/v1",
      lmstudio: "http://localhost:1234/v1",
      local: "http://localhost:8080/v1",
    };
    return urls[provider] || "http://localhost:8080/v1";
  }

  public async analyzeCode(code: string, filePath: string): Promise<string> {
    await this.ensureConfig();

    // Check if the AI service is available for local providers
    if (["ollama", "lmstudio", "local"].includes(this.config.aiProvider.name)) {
      try {
        const testUrl = `${this.config.aiProvider.baseURL}/v1/models`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3 second test

        await fetch(testUrl, { signal: controller.signal });
        clearTimeout(timeout);
      } catch {
        console.log(
          chalk.yellow(
            `\n⚠️  AI service not available at ${this.config.aiProvider.baseURL}`,
          ),
        );
        console.log(
          chalk.gray("Returning mock analysis for demonstration purposes\n"),
        );

        // Return a mock analysis
        return `Code Analysis for ${filePath}:

1. Code Quality: The code appears to be well-structured.
2. Potential Issues: Found console.log statement that should be replaced with proper logging.
3. Best Practices: Consider adding more type annotations for better type safety.
4. Performance: No major performance concerns detected.
5. Security: No obvious security vulnerabilities found.

Note: This is a mock analysis. Please ensure your AI service is running at ${this.config.aiProvider.baseURL}`;
      }
    }

    const prompt = `
You are an expert code analyst. Analyze the following code for:
1. Logic errors and potential bugs
2. Performance issues
3. Code quality concerns
4. Best practice violations
5. Security vulnerabilities

File: ${filePath}
Code:
\`\`\`
${code}
\`\`\`

Provide a detailed analysis with specific line references where applicable.
Format your response using markdown for better readability in terminal output.
    `;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const { text } = await generateText({
        model: this.getProvider(),
        prompt,
        maxTokens: 1000,
        temperature: 0.3,
        abortSignal: controller.signal,
      });

      clearTimeout(timeout);
      return text;
    } catch (error) {
      if ((error as any).name === "AbortError") {
        throw new Error(
          "AI service request timed out after 30 seconds. Please check your AI provider configuration.",
        );
      }
      handleAIError(error as Error, this.config.aiProvider.name);
      throw error; // Re-throw to maintain the calling pattern
    }
  }

  public async explainError(
    errorMessage: string,
    code: string,
  ): Promise<string> {
    await this.ensureConfig();
    const prompt = `
You are a helpful programming assistant. Explain this error and provide a solution:

Error: ${errorMessage}

Code:
\`\`\`
${code}
\`\`\`

Provide:
1. What the error means
2. Why it occurred
3. How to fix it
4. How to prevent it in the future
5. A corrected code example

Format as structured text without markdown.
    `;

    try {
      const { text } = await generateText({
        model: this.getProvider(),
        prompt,
        maxTokens: 800,
        temperature: 0.3,
      });

      return text;
    } catch (error) {
      handleAIError(error as Error, this.config.aiProvider.name);
      throw error;
    }
  }

  public async generateTests(
    code: string,
    language: string,
  ): Promise<GeneratedCode> {
    await this.ensureConfig();
    const prompt = `
Generate comprehensive unit tests for the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Include:
1. Test setup and teardown
2. Happy path tests
3. Edge cases
4. Error cases
5. Mock dependencies if needed

Use appropriate testing framework for ${language}.
Provide the test code and explain what each test does.
    `;

    try {
      const { text } = await generateText({
        model: this.getProvider(),
        prompt,
        maxTokens: 1500,
        temperature: 0.4,
      });

      return {
        type: "test",
        content: text,
        language,
        explanation:
          "Generated comprehensive unit tests covering happy paths, edge cases, and error scenarios.",
      };
    } catch (error) {
      handleAIError(error as Error, this.config.aiProvider.name);
      throw error;
    }
  }

  public async generateDocumentation(
    code: string,
    language: string,
  ): Promise<GeneratedCode> {
    await this.ensureConfig();
    const prompt = `
Generate comprehensive documentation for the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Include:
1. Overview and purpose
2. Function/class descriptions
3. Parameter documentation
4. Return value descriptions
5. Usage examples
6. Error handling notes

Use appropriate documentation format for ${language} (JSDoc, docstrings, etc.).
    `;

    try {
      const { text } = await generateText({
        model: this.getProvider(),
        prompt,
        maxTokens: 1200,
        temperature: 0.3,
      });

      return {
        type: "documentation",
        content: text,
        language,
        explanation:
          "Generated comprehensive documentation with usage examples and parameter descriptions.",
      };
    } catch (error) {
      handleAIError(error as Error, this.config.aiProvider.name);
      throw error;
    }
  }

  public async generateRefactorSuggestions(
    code: string,
    language: string,
  ): Promise<RefactorSuggestion[]> {
    await this.ensureConfig();
    const prompt = `
Analyze the following ${language} code and provide refactoring suggestions:

\`\`\`${language}
${code}
\`\`\`

For each suggestion, provide:
1. A clear title
2. Detailed description
3. Impact level (low/medium/high)
4. Category (performance/readability/maintainability/security)
5. Before and after code examples
6. Line number reference
7. Confidence score (0-100)

Return as JSON array of suggestions.
    `;

    try {
      const { text } = await generateText({
        model: this.getProvider(),
        prompt,
        maxTokens: 1500,
        temperature: 0.3,
      });

      // Try to parse as JSON, fallback to text parsing
      try {
        return JSON.parse(text);
      } catch {
        // Fallback: create suggestions from text response
        return this.parseRefactorSuggestionsFromText(text);
      }
    } catch (error) {
      throw new Error(`Refactor suggestions failed: ${error}`);
    }
  }

  public async provideMentoring(
    code: string,
    language: string,
    userLevel: string,
  ): Promise<string> {
    await this.ensureConfig();
    const prompt = `
You are an expert programming mentor. Provide detailed, educational guidance for this ${language} code.
User level: ${userLevel}

Code:
\`\`\`${language}
${code}
\`\`\`

Provide:
1. Line-by-line explanation appropriate for ${userLevel} level
2. Concept explanations
3. Best practices highlighted
4. Learning opportunities
5. Suggested improvements with explanations
6. Related concepts to explore

Be encouraging and educational in tone.
    `;

    try {
      const { text } = await generateText({
        model: this.getProvider(),
        prompt,
        maxTokens: 1500,
        temperature: 0.4,
      });

      return text;
    } catch (error) {
      throw new Error(`Mentoring failed: ${error}`);
    }
  }

  public async scanForSecurity(
    code: string,
    language: string,
  ): Promise<SecurityVulnerability[]> {
    await this.ensureConfig();
    const prompt = `
Perform a security analysis of the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Identify:
1. Security vulnerabilities
2. Common attack vectors
3. Input validation issues
4. Authentication/authorization problems
5. Data exposure risks

For each vulnerability, provide:
- Severity level
- Description
- Line number
- CWE/OWASP category if applicable
- Remediation advice

Return as JSON array of vulnerabilities.
    `;

    try {
      const { text } = await generateText({
        model: this.getProvider(),
        prompt,
        maxTokens: 1200,
        temperature: 0.2,
      });

      try {
        return JSON.parse(text);
      } catch {
        return this.parseSecurityVulnerabilitiesFromText(text);
      }
    } catch (error) {
      throw new Error(`Security scan failed: ${error}`);
    }
  }

  public async generateProject(description: string): Promise<GeneratedCode> {
    await this.ensureConfig();
    const prompt = `
Generate a complete project structure and implementation for:
${description}

Include:
1. Project structure (folders and files)
2. Package.json/requirements.txt
3. Main implementation files
4. Configuration files
5. README with setup instructions
6. Basic tests
7. Documentation

Provide comprehensive, production-ready code.
    `;

    try {
      const { text } = await generateText({
        model: this.getProvider(),
        prompt,
        maxTokens: 3000,
        temperature: 0.4,
      });

      return {
        type: "implementation",
        content: text,
        language: "multi",
        explanation:
          "Generated complete project structure with implementation, tests, and documentation.",
      };
    } catch (error) {
      throw new Error(`Project generation failed: ${error}`);
    }
  }

  private parseRefactorSuggestionsFromText(text: string): RefactorSuggestion[] {
    // Fallback parser for non-JSON responses
    const suggestions: RefactorSuggestion[] = [];
    const lines = text.split("\n");

    // Simple parsing logic - this could be enhanced
    let currentSuggestion: Partial<RefactorSuggestion> = {};

    lines.forEach((line) => {
      if (
        line.toLowerCase().includes("suggestion") ||
        line.toLowerCase().includes("refactor")
      ) {
        if (currentSuggestion.title) {
          suggestions.push(currentSuggestion as RefactorSuggestion);
        }
        currentSuggestion = {
          id: `suggestion-${suggestions.length + 1}`,
          title: line.trim(),
          description: "",
          impact: "medium",
          category: "maintainability",
          before: "",
          after: "",
          line: 1,
          confidence: 80,
        };
      } else if (currentSuggestion.title) {
        currentSuggestion.description += `${line} `;
      }
    });

    if (currentSuggestion.title) {
      suggestions.push(currentSuggestion as RefactorSuggestion);
    }

    return suggestions;
  }

  private parseSecurityVulnerabilitiesFromText(
    text: string,
  ): SecurityVulnerability[] {
    // Fallback parser for non-JSON responses
    const vulnerabilities: SecurityVulnerability[] = [];
    const lines = text.split("\n");

    lines.forEach((line) => {
      if (
        line.toLowerCase().includes("vulnerability") ||
        line.toLowerCase().includes("security") ||
        line.toLowerCase().includes("risk")
      ) {
        vulnerabilities.push({
          id: `vuln-${vulnerabilities.length + 1}`,
          title: line.trim(),
          severity: "medium",
          description: line.trim(),
          line: 1,
          file: "current",
        });
      }
    });

    return vulnerabilities;
  }
}
