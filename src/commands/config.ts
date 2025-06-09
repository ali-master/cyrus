import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { ConfigManager } from "../config/config";
import type { AIProviderType } from "../types";
import {
  ValidationError,
  validateRequired,
  errorHandler,
  ConfigurationError,
} from "../utils/error-handler";

export class ConfigCommand {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  public async handle(args: string[]): Promise<void> {
    return await errorHandler.handleAsync(async () => {
      const [action, type, value] = args;

      switch (action) {
        case "set":
          await this.setConfig(type, value);
          break;
        case "get":
          await this.getConfig(type);
          break;
        case "show":
          await this.showConfig();
          break;
        case "delete":
          await this.deleteConfig();
          break;
        case "init":
          await this.initConfig();
          break;
        default:
          await this.showInteractiveMenu();
      }
    }, "config-command");
  }

  private async setConfig(type: string, value: string): Promise<void> {
    if (!type || !value) {
      console.log(chalk.yellow("Usage: cyrus config set <type> <value>"));
      console.log(
        chalk.white(
          "Available types: apikey, model, provider, output-format, baseurl",
        ),
      );
      return;
    }

    const config =
      (await this.configManager.getConfig()) ||
      this.configManager.getDefaultConfig();

    switch (type.toLowerCase()) {
      case "apikey":
        config.aiProvider.apiKey = value;
        break;
      case "model":
        config.aiProvider.model = value;
        break;
      case "provider": {
        const validProviders: AIProviderType[] = [
          "openai",
          "anthropic",
          "google",
          "xai",
          "ollama",
          "lmstudio",
          "local",
        ];
        try {
          validateRequired(value, "provider value");
        } catch {
          throw new ValidationError(`Provider value is required`);
        }
        if (!validProviders.includes(value.toLowerCase() as AIProviderType)) {
          throw new ConfigurationError(
            `Invalid provider: ${value}. Supported providers: ${validProviders.join(", ")}`,
          );
        }
        config.aiProvider.name = value.toLowerCase() as AIProviderType;
        break;
      }
      case "baseurl":
        config.aiProvider.baseURL = value;
        break;
      case "output-format":
        try {
          validateRequired(value, "output format value");
        } catch {
          throw new ValidationError(`Output format value is required`);
        }
        if (!["text", "json", "markdown"].includes(value.toLowerCase())) {
          throw new ConfigurationError(
            `Invalid output format: ${value}. Supported formats: text, json, markdown`,
          );
        }
        config.outputFormat = value.toLowerCase() as
          | "text"
          | "json"
          | "markdown";
        break;
      default:
        throw new ConfigurationError(
          `Unknown configuration type: ${type}. Supported types: provider, model, apikey, baseurl, output-format`,
        );
    }

    await this.configManager.saveConfig(config);
    console.log(chalk.green("✅ Configuration updated successfully"));
  }

  private async getConfig(type: string): Promise<void> {
    const config = await this.configManager.getConfig();

    if (!config) {
      console.log(
        chalk.yellow("No configuration found. Run: cyrus config init"),
      );
      return;
    }

    switch (type?.toLowerCase()) {
      case "apikey":
        console.log(config.aiProvider.apiKey ? "***configured***" : "not set");
        break;
      case "model":
        console.log(config.aiProvider.model);
        break;
      case "provider":
        console.log(config.aiProvider.name);
        break;
      case "baseurl":
        console.log(config.aiProvider.baseURL || "not set");
        break;
      case "output-format":
        console.log(config.outputFormat);
        break;
      default:
        console.log(
          chalk.yellow(
            "Available config types: apikey, model, provider, baseurl, output-format",
          ),
        );
    }
  }

  private async showConfig(): Promise<void> {
    const config = await this.configManager.getConfig();

    if (!config) {
      console.log(
        chalk.yellow("No configuration found. Run: cyrus config init"),
      );
      return;
    }

    console.log(chalk.cyan("\n🔧 Current Configuration:"));
    console.log(chalk.white("Provider:"), chalk.yellow(config.aiProvider.name));
    console.log(chalk.white("Model:"), chalk.yellow(config.aiProvider.model));

    // Show appropriate config based on provider type
    if (["ollama", "lmstudio", "local"].includes(config.aiProvider.name)) {
      console.log(
        chalk.white("Base URL:"),
        config.aiProvider.baseURL
          ? chalk.green(config.aiProvider.baseURL)
          : chalk.red("❌ Not set"),
      );
    } else {
      console.log(
        chalk.white("API Key:"),
        config.aiProvider.apiKey
          ? chalk.green("✅ Set")
          : chalk.red("❌ Not set"),
      );
    }

    console.log(
      chalk.white("Output Format:"),
      chalk.yellow(config.outputFormat),
    );
    console.log(
      chalk.white("Config File:"),
      chalk.gray(this.configManager.getConfigPath() || "Using defaults"),
    );

    console.log(chalk.cyan("\n🎯 Features:"));
    Object.entries(config.features).forEach(([feature, enabled]) => {
      console.log(
        chalk.white(`${feature}:`),
        enabled ? chalk.green("✅ Enabled") : chalk.red("❌ Disabled"),
      );
    });

    console.log(chalk.cyan("\n📝 Supported Languages:"));
    console.log(chalk.white(config.languages.join(", ")));

    if (config.localModels) {
      console.log(chalk.cyan("\n🤖 Local Models:"));
      if (config.localModels.ollama) {
        console.log(
          chalk.white("Ollama:"),
          config.localModels.ollama.models.join(", "),
        );
      }
      if (config.localModels.lmstudio) {
        console.log(
          chalk.white("LM Studio:"),
          config.localModels.lmstudio.models.join(", "),
        );
      }
    }
  }

  private async deleteConfig(): Promise<void> {
    const confirm = await inquirer.prompt([
      {
        type: "confirm",
        name: "delete",
        message: "Are you sure you want to delete the configuration?",
        default: false,
      },
    ]);

    if (confirm.delete) {
      await this.configManager.deleteConfig();
      console.log(chalk.green("✅ Configuration deleted successfully"));
    } else {
      console.log(chalk.yellow("Configuration deletion cancelled"));
    }
  }

  private async initConfig(): Promise<void> {
    console.log(chalk.cyan("\n🚀 Welcome to Cyrus Configuration Setup!\n"));

    // First check for local models
    const spinner = ora("Detecting local AI models...").start();
    const localModels = await this.configManager.detectLocalModels();
    spinner.stop();

    const hasLocalModels =
      localModels.ollama.length > 0 || localModels.lmstudio.length > 0;

    if (hasLocalModels) {
      console.log(chalk.green("✓ Found local AI models:"));
      if (localModels.ollama.length > 0) {
        console.log(chalk.white(`  Ollama: ${localModels.ollama.join(", ")}`));
      }
      if (localModels.lmstudio.length > 0) {
        console.log(
          chalk.white(`  LM Studio: ${localModels.lmstudio.join(", ")}`),
        );
      }
      console.log();
    }

    // Provider selection with local options
    const providerChoices = [
      { name: "OpenAI (GPT-4, GPT-3.5)", value: "openai" },
      { name: "Anthropic (Claude)", value: "anthropic" },
      { name: "Google (Gemini)", value: "google" },
      { name: "X.AI (Grok)", value: "xai" },
    ];

    if (localModels.ollama.length > 0) {
      providerChoices.push({
        name: chalk.green("Ollama (Local) - No API key required"),
        value: "ollama",
      });
    }
    if (localModels.lmstudio.length > 0) {
      providerChoices.push({
        name: chalk.green("LM Studio (Local) - No API key required"),
        value: "lmstudio",
      });
    }
    providerChoices.push({
      name: "Custom OpenAI-compatible API",
      value: "local",
    });

    const providerAnswer = await inquirer.prompt({
      type: "list",
      name: "provider",
      message: "Choose your AI provider:",
      choices: providerChoices,
      default: hasLocalModels ? "ollama" : "openai",
    });

    let apiKey = "";
    let baseURL = "";
    let model = "";

    // Handle provider-specific configuration
    if (["ollama", "lmstudio", "local"].includes(providerAnswer.provider)) {
      // Local providers
      if (providerAnswer.provider === "local") {
        const baseURLAnswer = await inquirer.prompt({
          type: "input",
          name: "baseURL",
          message: "Enter the base URL for your OpenAI-compatible API:",
          default: "http://localhost:8080/v1",
          validate: (input: string) => {
            try {
              const _ = new URL(input);
              return true;
            } catch {
              return "Please enter a valid URL";
            }
          },
        });
        baseURL = baseURLAnswer.baseURL;
      }

      // Model selection for local providers
      if (
        providerAnswer.provider === "ollama" &&
        localModels.ollama.length > 0
      ) {
        const modelAnswer = await inquirer.prompt({
          type: "list",
          name: "model",
          message: "Choose your Ollama model:",
          choices: localModels.ollama,
          default: localModels.ollama[0],
        });
        model = modelAnswer.model;
      } else if (
        providerAnswer.provider === "lmstudio" &&
        localModels.lmstudio.length > 0
      ) {
        const modelAnswer = await inquirer.prompt({
          type: "list",
          name: "model",
          message: "Choose your LM Studio model:",
          choices: localModels.lmstudio,
          default: localModels.lmstudio[0],
        });
        model = modelAnswer.model;
      } else {
        const modelAnswer = await inquirer.prompt({
          type: "input",
          name: "model",
          message: "Enter the model name:",
          default: "llama3.2",
          validate: (input: string) =>
            input.length > 0 || "Model name is required",
        });
        model = modelAnswer.model;
      }
    } else {
      // Cloud providers
      const apiKeyAnswer = await inquirer.prompt({
        type: "input",
        name: "apiKey",
        message: `Enter your ${providerAnswer.provider.toUpperCase()} API key:`,
        validate: (input: string) => input.length > 0 || "API key is required",
      });
      apiKey = apiKeyAnswer.apiKey;

      // Get model based on provider
      const modelChoices = this.getModelChoices(providerAnswer.provider);
      const modelAnswer = await inquirer.prompt({
        type: "list",
        name: "model",
        message: "Choose your model:",
        choices: modelChoices,
      });
      model = modelAnswer.model;
    }

    // Get output format
    const outputFormatAnswer = await inquirer.prompt({
      type: "list",
      name: "outputFormat",
      message: "Choose output format:",
      choices: [
        { name: "Text (Human-readable)", value: "text" },
        { name: "JSON (Machine-readable)", value: "json" },
        { name: "Markdown (Documentation)", value: "markdown" },
      ],
      default: "text",
    });

    // Get languages
    const languagesAnswer = await inquirer.prompt({
      type: "checkbox",
      name: "languages",
      message: "Select languages you want to analyze:",
      choices: [
        { name: "JavaScript", value: "javascript", checked: true },
        { name: "TypeScript", value: "typescript", checked: true },
        { name: "Python", value: "python", checked: true },
        { name: "Java", value: "java" },
        { name: "Go", value: "go" },
        { name: "Rust", value: "rust" },
        { name: "C#", value: "csharp" },
        { name: "PHP", value: "php" },
        { name: "Ruby", value: "ruby" },
      ],
      validate: (input: any) =>
        Array.isArray(input) && input.length > 0
          ? true
          : "Select at least one language",
    });

    // Build configuration
    const config: any = {
      $schema: "https://cyrus.dev/schema.json",
      aiProvider: {
        name: providerAnswer.provider,
        model,
      },
      features: {
        securityScan: true,
        performanceAnalysis: true,
        codeGeneration: true,
        refactorSuggestions: true,
        mentorMode: true,
      },
      languages: languagesAnswer.languages,
      outputFormat: outputFormatAnswer.outputFormat,
      detectLanguage: {
        enabled: true,
        confidence: 0.7,
      },
    };

    // Add provider-specific fields
    if (["ollama", "lmstudio", "local"].includes(providerAnswer.provider)) {
      config.aiProvider.baseURL =
        baseURL || this.getDefaultBaseURL(providerAnswer.provider);
    } else {
      config.aiProvider.apiKey = apiKey;
    }

    // Add detected local models to config
    if (hasLocalModels) {
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

    await this.configManager.saveConfig(config);
    console.log(chalk.green("\n✅ Configuration saved successfully!"));
    console.log(chalk.white("You can now use all Cyrus features."));
    console.log(
      chalk.gray(`Config saved to: ${this.configManager.getConfigPath()}`),
    );
  }

  private getModelChoices(provider: string): string[] {
    switch (provider) {
      case "openai":
        return ["gpt-4-turbo-preview", "gpt-4", "gpt-3.5-turbo"];
      case "anthropic":
        return [
          "claude-3-opus-20240229",
          "claude-3-sonnet-20240229",
          "claude-3-haiku-20240307",
        ];
      case "google":
        return ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"];
      case "xai":
        return ["grok-beta"];
      default:
        return ["gpt-4"];
    }
  }

  private getDefaultBaseURL(provider: string): string {
    const urls: Record<string, string> = {
      ollama: "http://localhost:11434/v1",
      lmstudio: "http://localhost:1234/v1",
      local: "http://localhost:8080/v1",
    };
    return urls[provider] || "http://localhost:8080/v1";
  }

  private async showInteractiveMenu(): Promise<void> {
    const choices = [
      { name: "🚀 Initialize configuration", value: "init" },
      { name: "👀 Show current configuration", value: "show" },
      { name: "🔧 Set configuration value", value: "set" },
      { name: "🔍 Get configuration value", value: "get" },
      { name: "🗑️  Delete configuration", value: "delete" },
      { name: "❌ Exit", value: "exit" },
    ];

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices,
      },
    ]);

    if (action === "exit") {
      return;
    }

    if (action === "set") {
      const { type, value } = await inquirer.prompt([
        {
          type: "list",
          name: "type",
          message: "What would you like to set?",
          choices: ["apikey", "model", "provider", "baseurl", "output-format"],
        },
        {
          type: "input",
          name: "value",
          message: "Enter the value:",
          validate: (input: string) => input.length > 0 || "Value is required",
        },
      ]);

      await this.setConfig(type, value);
    } else if (action === "get") {
      const { type } = await inquirer.prompt([
        {
          type: "list",
          name: "type",
          message: "What would you like to get?",
          choices: ["apikey", "model", "provider", "baseurl", "output-format"],
        },
      ]);

      await this.getConfig(type);
    } else {
      await this.handle([action]);
    }
  }
}
