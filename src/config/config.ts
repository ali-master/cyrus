import { cosmiconfig } from "cosmiconfig";
import type { CosmiconfigResult } from "cosmiconfig";
import { TypeScriptLoader } from "cosmiconfig-typescript-loader";
import path from "path";
import fs from "fs/promises";
import type { Config, AIProviderType, AIProvider } from "../types";
import { handleFileError, ConfigurationError } from "../utils/error-handler";

export class ConfigManager {
  private static instance: ConfigManager;
  private explorer;
  private config: Config | null = null;
  private configResult: CosmiconfigResult | null = null;

  private constructor() {
    this.explorer = cosmiconfig("cyrus", {
      searchPlaces: [
        "package.json",
        ".cyrusrc",
        ".cyrusrc.json",
        ".cyrusrc.yaml",
        ".cyrusrc.yml",
        ".cyrusrc.js",
        ".cyrusrc.cjs",
        ".cyrusrc.mjs",
        ".cyrusrc.ts",
        "cyrus.config.js",
        "cyrus.config.cjs",
        "cyrus.config.mjs",
        "cyrus.config.ts",
      ],
      loaders: {
        ".ts": TypeScriptLoader(),
      },
    });
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public async getConfig(): Promise<Config | null> {
    if (this.config) {
      return this.config;
    }

    try {
      this.configResult = await this.explorer.search();
      if (this.configResult) {
        this.config = this.validateConfig(this.configResult.config);
        return this.config;
      }
    } catch (error) {
      console.error("Error reading config:", error);
    }

    return null;
  }

  private validateConfig(config: any): Config {
    // Basic validation and type checking
    const validatedConfig: Config = {
      aiProvider: this.validateAIProvider(config.aiProvider),
      features: {
        securityScan: config.features?.securityScan ?? true,
        performanceAnalysis: config.features?.performanceAnalysis ?? true,
        codeGeneration: config.features?.codeGeneration ?? true,
        refactorSuggestions: config.features?.refactorSuggestions ?? true,
        mentorMode: config.features?.mentorMode ?? true,
      },
      languages: config.languages || this.getDefaultConfig().languages,
      outputFormat: config.outputFormat || "text",
      detectLanguage: config.detectLanguage || {
        enabled: true,
        confidence: 0.7,
      },
      localModels: config.localModels,
    };

    if (config.$schema) {
      validatedConfig.$schema = config.$schema;
    }

    return validatedConfig;
  }

  private validateAIProvider(provider: any): AIProvider {
    if (!provider || !provider.name) {
      return this.getDefaultConfig().aiProvider;
    }

    const validProviders: AIProviderType[] = [
      "openai",
      "anthropic",
      "google",
      "xai",
      "ollama",
      "lmstudio",
      "local",
    ];

    if (!validProviders.includes(provider.name)) {
      throw new ConfigurationError(
        `Invalid AI provider: ${provider.name}. Supported providers: ${validProviders.join(", ")}`,
      );
    }

    const validatedProvider: AIProvider = {
      name: provider.name,
      model: provider.model || this.getDefaultModel(provider.name),
      temperature: provider.temperature,
      maxTokens: provider.maxTokens,
    };

    // Local providers require baseURL
    if (["ollama", "lmstudio", "local"].includes(provider.name)) {
      if (!provider.baseURL) {
        validatedProvider.baseURL = this.getDefaultBaseURL(provider.name);
      } else {
        validatedProvider.baseURL = provider.baseURL;
      }
    } else {
      // Cloud providers require apiKey
      validatedProvider.apiKey =
        provider.apiKey || this.getApiKeyFromEnv(provider.name);
      if (provider.baseURL) {
        validatedProvider.baseURL = provider.baseURL;
      }
    }

    return validatedProvider;
  }

  private getDefaultModel(provider: AIProviderType): string {
    const defaults: Record<AIProviderType, string> = {
      openai: "gpt-4-turbo-preview",
      anthropic: "claude-3-opus-20240229",
      google: "gemini-1.5-pro",
      xai: "grok-beta",
      ollama: "llama3.2",
      lmstudio: "local-model",
      local: "local-model",
    };
    return defaults[provider] || "gpt-4";
  }

  private getDefaultBaseURL(provider: AIProviderType): string {
    const defaults: Record<string, string> = {
      ollama: "http://localhost:11434",
      lmstudio: "http://localhost:1234",
      local: "http://localhost:8080",
    };
    return defaults[provider] || "";
  }

  private getApiKeyFromEnv(provider: AIProviderType): string {
    const envKeys: Record<string, string> = {
      openai: "OPENAI_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
      google: "GOOGLE_API_KEY",
      xai: "XAI_API_KEY",
    };

    const envKey = envKeys[provider];
    return envKey ? process.env[envKey] || "" : "";
  }

  public async saveConfig(config: Config): Promise<void> {
    try {
      this.config = config;

      // Determine where to save
      let configPath: string;
      if (this.configResult?.filepath) {
        configPath = this.configResult.filepath;
      } else {
        // Default to .cyrusrc.json in the current directory
        configPath = path.join(process.cwd(), ".cyrusrc.json");
      }

      // Add schema for better IDE support
      const configWithSchema = {
        $schema: "https://cyrus.dev/schema.json",
        ...config,
      };

      await fs.writeFile(
        configPath,
        JSON.stringify(configWithSchema, null, 2),
        "utf-8",
      );
    } catch (error) {
      handleFileError(error as Error, this.getConfigPath()!);
      throw new ConfigurationError(
        `Failed to save configuration: ${(error as Error).message}`,
      );
    }
  }

  public async updateAIProvider(provider: Partial<AIProvider>): Promise<void> {
    const config = (await this.getConfig()) || this.getDefaultConfig();
    config.aiProvider = { ...config.aiProvider, ...provider };
    await this.saveConfig(config);
  }

  public getDefaultConfig(): Config {
    return {
      $schema: "https://cyrus.dev/schema.json",
      aiProvider: {
        name: "openai",
        model: "gpt-4-turbo-preview",
        apiKey: process.env.OPENAI_API_KEY || "",
        temperature: 0.7,
        maxTokens: 4096,
      },
      features: {
        securityScan: true,
        performanceAnalysis: true,
        codeGeneration: true,
        refactorSuggestions: true,
        mentorMode: true,
      },
      languages: ["javascript", "typescript", "python", "java", "go", "rust"],
      outputFormat: "text",
      detectLanguage: {
        enabled: true,
        confidence: 0.7,
      },
    };
  }

  public async hasValidConfig(): Promise<boolean> {
    const config = await this.getConfig();
    if (!config) return false;

    // Check if it's a local provider (no API key needed)
    if (["ollama", "lmstudio", "local"].includes(config.aiProvider.name)) {
      return !!config.aiProvider.baseURL;
    }

    // For cloud providers, check API key
    return !!config.aiProvider.apiKey;
  }

  public async initializeConfig(): Promise<Config> {
    if (!(await this.hasValidConfig())) {
      const defaultConfig = this.getDefaultConfig();
      await this.saveConfig(defaultConfig);
      return defaultConfig;
    }
    return (await this.getConfig())!;
  }

  public async deleteConfig(): Promise<void> {
    try {
      if (this.configResult?.filepath) {
        await fs.unlink(this.configResult.filepath);
        this.config = null;
        this.configResult = null;
      }
    } catch (error) {
      handleFileError(error as Error, this.getConfigPath()!);
      throw new ConfigurationError(
        `Failed to delete configuration: ${(error as Error).message}`,
      );
    }
  }

  public getConfigPath(): string | null {
    return this.configResult?.filepath || null;
  }

  public async detectLocalModels(): Promise<{
    ollama: string[];
    lmstudio: string[];
  }> {
    const detectedModels = {
      ollama: [] as string[],
      lmstudio: [] as string[],
    };

    // Try to detect Ollama models
    try {
      const response = await fetch("http://localhost:11434/api/tags");
      if (response.ok) {
        const data = await response.json();
        detectedModels.ollama = data.models?.map((m: any) => m.name) || [];
      }
    } catch {
      // Ollama not running or not installed
    }

    // Try to detect LM Studio models
    try {
      const response = await fetch("http://localhost:1234/v1/models");
      if (response.ok) {
        const data = await response.json();
        detectedModels.lmstudio = data.data?.map((m: any) => m.id) || [];
      }
    } catch {
      // LM Studio not running or not installed
    }

    return detectedModels;
  }

  public async generateConfigFile(targetPath?: string): Promise<string> {
    const configPath = targetPath || path.join(process.cwd(), ".cyrusrc.json");
    const config = this.getDefaultConfig();

    // Try to detect local models
    const localModels = await this.detectLocalModels();
    if (localModels.ollama.length > 0 || localModels.lmstudio.length > 0) {
      config.localModels = {};

      if (localModels.ollama.length > 0) {
        config.localModels.ollama = {
          models: localModels.ollama,
          defaultModel: localModels.ollama[0],
        };
      }

      if (localModels.lmstudio.length > 0) {
        config.localModels.lmstudio = {
          models: localModels.lmstudio,
          defaultModel: localModels.lmstudio[0],
        };
      }
    }

    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");

    return configPath;
  }
}
