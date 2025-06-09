import fs from "fs";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { AIService } from "../services/ai-service";
import { LanguageDetector } from "../analyzers/language-detector";
import { ConfigManager } from "../config/config";
import type { SupportedLanguage, GeneratedCode } from "../types";

export class GenerateCommand {
  private aiService: AIService;
  private configManager: ConfigManager;

  constructor() {
    this.aiService = AIService.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  public async handle(
    subCommand: string,
    target: string,
    options: any = {},
  ): Promise<void> {
    try {
      // Validate configuration
      if (!(await this.configManager.hasValidConfig())) {
        console.log(chalk.red("❌ No valid configuration found."));
        console.log(chalk.yellow("Please run: cyrus config init"));
        return;
      }

      switch (subCommand) {
        case "tests":
          await this.generateTests(target, options);
          break;
        case "docs":
          await this.generateDocumentation(target, options);
          break;
        case "refactor":
          await this.generateRefactor(target, options);
          break;
        case "project":
          await this.generateProject(target, options);
          break;
        case "component":
          await this.generateComponent(target, options);
          break;
        case "config":
          await this.generateConfig(target, options);
          break;
        default:
          await this.showGenerateMenu();
      }
    } catch (error) {
      console.error(chalk.red("❌ Generation error:"), error);
      process.exit(1);
    }
  }

  private async generateTests(filePath: string, options: any): Promise<void> {
    if (!fs.existsSync(filePath)) {
      console.log(chalk.red(`❌ File not found: ${filePath}`));
      return;
    }

    if (!LanguageDetector.isSupported(filePath)) {
      console.log(chalk.red(`❌ Unsupported file type: ${filePath}`));
      return;
    }

    const spinner = ora("🧪 Generating comprehensive tests...").start();

    try {
      const code = fs.readFileSync(filePath, "utf-8");
      const detection = await LanguageDetector.detectLanguage(filePath, code);

      if (!detection.language) {
        spinner.fail("Could not detect language");
        return;
      }

      const testCode = await this.aiService.generateTests(
        code,
        detection.language,
      );
      spinner.succeed("Tests generated successfully");

      console.log(chalk.cyan("\n🧪 Generated Unit Tests:\n"));
      console.log(chalk.gray("─".repeat(60)));
      console.log(chalk.white(testCode.content));

      // Offer to save tests to file
      if (!options.dryRun) {
        await this.offerToSaveTests(filePath, testCode, detection.language);
      }

      console.log(chalk.cyan("\n💡 Test Explanation:"));
      console.log(chalk.white(testCode.explanation));
    } catch (error) {
      spinner.fail("Test generation failed");
      throw error;
    }
  }

  private async generateDocumentation(
    filePath: string,
    options: any,
  ): Promise<void> {
    if (!fs.existsSync(filePath)) {
      console.log(chalk.red(`❌ File not found: ${filePath}`));
      return;
    }

    const spinner = ora("📚 Generating documentation...").start();

    try {
      const code = fs.readFileSync(filePath, "utf-8");
      const detection = await LanguageDetector.detectLanguage(filePath, code);

      if (!detection.language) {
        spinner.fail("Could not detect language");
        return;
      }

      const docs = await this.aiService.generateDocumentation(
        code,
        detection.language,
      );
      spinner.succeed("Documentation generated successfully");

      console.log(chalk.cyan("\n📚 Generated Documentation:\n"));
      console.log(chalk.gray("─".repeat(60)));
      console.log(chalk.white(docs.content));

      // Offer to save documentation
      if (!options.dryRun) {
        await this.offerToSaveDocumentation(filePath, docs);
      }
    } catch (error) {
      spinner.fail("Documentation generation failed");
      throw error;
    }
  }

  private async generateRefactor(
    filePath: string,
    options: any,
  ): Promise<void> {
    if (!fs.existsSync(filePath)) {
      console.log(chalk.red(`❌ File not found: ${filePath}`));
      return;
    }

    const spinner = ora(
      "⚡ Analyzing and generating refactor suggestions...",
    ).start();

    try {
      const code = fs.readFileSync(filePath, "utf-8");
      const detection = await LanguageDetector.detectLanguage(filePath, code);

      if (!detection.language) {
        spinner.fail("Could not detect language");
        return;
      }

      const suggestions = await this.aiService.generateRefactorSuggestions(
        code,
        detection.language,
      );
      spinner.succeed(`Generated ${suggestions.length} refactor suggestions`);

      if (suggestions.length === 0) {
        console.log(
          chalk.green("\n✅ No refactoring needed! Your code looks good."),
        );
        return;
      }

      console.log(chalk.cyan("\n⚡ Refactor Suggestions:\n"));
      console.log(chalk.gray("─".repeat(60)));

      suggestions.forEach((suggestion, index) => {
        const impactColor = {
          low: chalk.blue,
          medium: chalk.yellow,
          high: chalk.red,
        }[suggestion.impact];

        const categoryIcon = {
          performance: "⚡",
          readability: "📖",
          maintainability: "🔧",
          security: "🔒",
        }[suggestion.category];

        console.log(
          `${index + 1}. ${categoryIcon} ${chalk.bold(suggestion.title)}`,
        );
        console.log(
          `   ${chalk.gray("Impact:")} ${impactColor(suggestion.impact)} | ${chalk.gray("Confidence:")} ${suggestion.confidence}%`,
        );
        console.log(`   ${suggestion.description}\n`);

        if (suggestion.before && suggestion.after) {
          console.log(chalk.red("   Before:"));
          console.log(`   ${suggestion.before}\n`);
          console.log(chalk.green("   After:"));
          console.log(`   ${suggestion.after}\n`);
        }

        console.log(chalk.gray("─".repeat(40)));
      });

      // Offer to apply refactoring
      if (!options.dryRun && options.interactive) {
        await this.offerToApplyRefactoring(filePath, suggestions, code);
      }
    } catch (error) {
      spinner.fail("Refactor generation failed");
      throw error;
    }
  }

  private async generateProject(
    description: string,
    options: any,
  ): Promise<void> {
    const spinner = ora("🏗️ Generating project structure...").start();

    try {
      const projectCode = await this.aiService.generateProject(description);
      spinner.succeed("Project structure generated");

      console.log(chalk.cyan("\n🏗️ Generated Project Structure:\n"));
      console.log(chalk.gray("─".repeat(60)));
      console.log(chalk.white(projectCode.content));

      if (!options.dryRun) {
        await this.offerToCreateProject(description, projectCode);
      }
    } catch (error) {
      spinner.fail("Project generation failed");
      throw error;
    }
  }

  private async generateComponent(name: string, options: any): Promise<void> {
    console.log(chalk.cyan("🧩 Component Generator\n"));

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "language",
        message: "Choose component language/framework:",
        choices: [
          { name: "React (TypeScript)", value: "react-ts" },
          { name: "React (JavaScript)", value: "react-js" },
          { name: "Vue.js", value: "vue" },
          { name: "Angular", value: "angular" },
          { name: "Svelte", value: "svelte" },
          { name: "Node.js Module", value: "node" },
          { name: "Python Class", value: "python" },
        ],
      },
      {
        type: "input",
        name: "description",
        message: "Describe the component functionality:",
        validate: (input: string) =>
          input.length > 0 || "Description is required",
      },
      {
        type: "checkbox",
        name: "features",
        message: "Select features to include:",
        choices: [
          { name: "Props/Parameters validation", value: "validation" },
          { name: "Error handling", value: "errorHandling" },
          { name: "TypeScript types", value: "types" },
          { name: "Unit tests", value: "tests" },
          { name: "Documentation/Comments", value: "docs" },
          { name: "Styling/CSS", value: "styling" },
        ],
      },
    ]);

    const spinner = ora(`Generating ${answers.language} component...`).start();

    try {
      const componentPrompt = this.buildComponentPrompt(name, answers);
      const component = await this.generateCustomCode(
        componentPrompt,
        answers.language,
      );

      spinner.succeed("Component generated successfully");

      console.log(chalk.cyan(`\n🧩 Generated ${name} Component:\n`));
      console.log(chalk.gray("─".repeat(60)));
      console.log(chalk.white(component.content));

      if (!options.dryRun) {
        await this.offerToSaveComponent(name, component, answers.language);
      }
    } catch (error) {
      spinner.fail("Component generation failed");
      throw error;
    }
  }

  private async generateConfig(type: string, options: any): Promise<void> {
    console.log(chalk.cyan("⚙️ Configuration Generator\n"));

    const configTypes = {
      eslint: "ESLint configuration with best practices",
      prettier: "Prettier code formatting configuration",
      tsconfig: "TypeScript configuration for modern development",
      jest: "Jest testing framework configuration",
      webpack: "Webpack bundler configuration",
      vite: "Vite build tool configuration",
      docker: "Docker containerization setup",
      github: "GitHub Actions CI/CD workflow",
    };

    let selectedType = type;

    if (!type || !configTypes[type as keyof typeof configTypes]) {
      const { configType } = await inquirer.prompt([
        {
          type: "list",
          name: "configType",
          message: "Choose configuration type:",
          choices: Object.entries(configTypes).map(([key, desc]) => ({
            name: `${key} - ${desc}`,
            value: key,
          })),
        },
      ]);
      selectedType = configType;
    }

    const spinner = ora(`Generating ${selectedType} configuration...`).start();

    try {
      const configPrompt = this.buildConfigPrompt(selectedType);
      const config = await this.generateCustomCode(configPrompt, "json");

      spinner.succeed("Configuration generated successfully");

      console.log(
        chalk.cyan(`\n⚙️ Generated ${selectedType} Configuration:\n`),
      );
      console.log(chalk.gray("─".repeat(60)));
      console.log(chalk.white(config.content));

      if (!options.dryRun) {
        await this.offerToSaveConfig(selectedType, config);
      }
    } catch (error) {
      spinner.fail("Configuration generation failed");
      throw error;
    }
  }

  private async showGenerateMenu(): Promise<void> {
    const choices = [
      { name: "🧪 Generate tests for a file", value: "tests" },
      { name: "📚 Generate documentation", value: "docs" },
      { name: "⚡ Generate refactor suggestions", value: "refactor" },
      { name: "🏗️ Generate entire project", value: "project" },
      { name: "🧩 Generate component/module", value: "component" },
      { name: "⚙️ Generate configuration files", value: "config" },
      { name: "❌ Exit", value: "exit" },
    ];

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to generate?",
        choices,
      },
    ]);

    if (action === "exit") {
      return;
    }

    let target = "";

    if (["tests", "docs", "refactor"].includes(action)) {
      const { filePath } = await inquirer.prompt([
        {
          type: "input",
          name: "filePath",
          message: "Enter file path:",
          validate: (input: string) => {
            if (!input) return "File path is required";
            if (!fs.existsSync(input)) return "File does not exist";
            return true;
          },
        },
      ]);
      target = filePath;
    } else if (action === "project") {
      const { description } = await inquirer.prompt([
        {
          type: "input",
          name: "description",
          message: "Describe the project you want to generate:",
          validate: (input: string) =>
            input.length > 0 || "Description is required",
        },
      ]);
      target = description;
    } else if (action === "component") {
      const { name } = await inquirer.prompt([
        {
          type: "input",
          name: "name",
          message: "Enter component name:",
          validate: (input: string) =>
            input.length > 0 || "Component name is required",
        },
      ]);
      target = name;
    }

    await this.handle(action, target, { interactive: true });
  }

  private async offerToSaveTests(
    originalFile: string,
    testCode: GeneratedCode,
    language: SupportedLanguage,
  ): Promise<void> {
    const testExtensions: Record<SupportedLanguage, string> = {
      javascript: ".test.js",
      typescript: ".test.ts",
      jsx: ".test.jsx",
      tsx: ".test.tsx",
      python: "_test.py",
      java: "Test.java",
      go: "_test.go",
      rust: "_test.rs",
      csharp: ".Tests.cs",
      php: ".test.php",
      ruby: ".test.rb",
    };

    const ext = testExtensions[language] || ".test.js";
    const dir = path.dirname(originalFile);
    const basename = path.basename(originalFile, path.extname(originalFile));
    const testFile = path.join(dir, `${basename}${ext}`);

    const { save } = await inquirer.prompt([
      {
        type: "confirm",
        name: "save",
        message: `Save tests to ${testFile}?`,
        default: true,
      },
    ]);

    if (save) {
      fs.writeFileSync(testFile, testCode.content, "utf-8");
      console.log(chalk.green(`\n✅ Tests saved to: ${testFile}`));
    }
  }

  private async offerToSaveDocumentation(
    originalFile: string,
    docs: GeneratedCode,
  ): Promise<void> {
    const dir = path.dirname(originalFile);
    const basename = path.basename(originalFile, path.extname(originalFile));
    const docFile = path.join(dir, `${basename}.docs.md`);

    const { save } = await inquirer.prompt([
      {
        type: "confirm",
        name: "save",
        message: `Save documentation to ${docFile}?`,
        default: true,
      },
    ]);

    if (save) {
      fs.writeFileSync(docFile, docs.content, "utf-8");
      console.log(chalk.green(`\n✅ Documentation saved to: ${docFile}`));
    }
  }

  private async offerToApplyRefactoring(
    filePath: string,
    suggestions: any[],
    originalCode: string,
  ): Promise<void> {
    const { apply } = await inquirer.prompt([
      {
        type: "confirm",
        name: "apply",
        message:
          "Would you like to apply any of these refactoring suggestions?",
        default: false,
      },
    ]);

    if (!apply) return;

    const { selectedSuggestions } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedSuggestions",
        message: "Select suggestions to apply:",
        choices: suggestions.map((s, index) => ({
          name: `${index + 1}. ${s.title} (${s.impact} impact)`,
          value: index,
        })),
      },
    ]);

    if (selectedSuggestions.length === 0) return;

    // Create backup
    const backupFile = `${filePath}.backup.${Date.now()}`;
    fs.writeFileSync(backupFile, originalCode, "utf-8");
    console.log(chalk.yellow(`\n💾 Backup created: ${backupFile}`));

    // Apply suggestions (simplified - in real implementation, this would be more sophisticated)
    let refactoredCode = originalCode;

    for (const index of selectedSuggestions) {
      const suggestion = suggestions[index];
      if (suggestion.before && suggestion.after) {
        refactoredCode = refactoredCode.replace(
          suggestion.before,
          suggestion.after,
        );
      }
    }

    fs.writeFileSync(filePath, refactoredCode, "utf-8");
    console.log(chalk.green(`\n✅ Refactoring applied to: ${filePath}`));
    console.log(chalk.gray(`Backup available at: ${backupFile}`));
  }

  private async offerToCreateProject(
    description: string,
    projectCode: GeneratedCode,
  ): Promise<void> {
    const { create } = await inquirer.prompt([
      {
        type: "confirm",
        name: "create",
        message: "Create this project structure in the current directory?",
        default: false,
      },
    ]);

    if (!create) return;

    const { projectName } = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "Enter project directory name:",
        default: "generated-project",
        validate: (input: string) =>
          input.length > 0 || "Project name is required",
      },
    ]);

    // This is a simplified implementation
    // In reality, you'd parse the AI response and create the actual file structure
    if (!fs.existsSync(projectName)) {
      fs.mkdirSync(projectName, { recursive: true });
    }

    const readmeContent = `# ${projectName}

${description}

## Generated Project

${projectCode.content}

## Setup Instructions

1. Install dependencies
2. Configure environment variables
3. Run the application

Generated by Cyrus AI Code Assistant
`;

    fs.writeFileSync(
      path.join(projectName, "README.md"),
      readmeContent,
      "utf-8",
    );
    console.log(
      chalk.green(`\n✅ Project structure created in: ${projectName}/`),
    );
    console.log(chalk.yellow("📝 Review the README.md file for next steps"));
  }

  private async offerToSaveComponent(
    name: string,
    component: GeneratedCode,
    framework: string,
  ): Promise<void> {
    const extensions = {
      "react-ts": ".tsx",
      "react-js": ".jsx",
      vue: ".vue",
      angular: ".component.ts",
      svelte: ".svelte",
      node: ".js",
      python: ".py",
    };

    const ext = extensions[framework as keyof typeof extensions] || ".js";
    const fileName = `${name}${ext}`;

    const { save } = await inquirer.prompt([
      {
        type: "confirm",
        name: "save",
        message: `Save component to ${fileName}?`,
        default: true,
      },
    ]);

    if (save) {
      fs.writeFileSync(fileName, component.content, "utf-8");
      console.log(chalk.green(`\n✅ Component saved to: ${fileName}`));
    }
  }

  private async offerToSaveConfig(
    type: string,
    config: GeneratedCode,
  ): Promise<void> {
    const fileNames = {
      eslint: ".eslintrc.json",
      prettier: ".prettierrc",
      tsconfig: "tsconfig.json",
      jest: "jest.config.js",
      webpack: "webpack.config.js",
      vite: "vite.config.js",
      docker: "Dockerfile",
      github: ".github/workflows/ci.yml",
    };

    const fileName =
      fileNames[type as keyof typeof fileNames] || `${type}.config.json`;

    const { save } = await inquirer.prompt([
      {
        type: "confirm",
        name: "save",
        message: `Save configuration to ${fileName}?`,
        default: true,
      },
    ]);

    if (save) {
      const dir = path.dirname(fileName);
      if (dir !== "." && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fileName, config.content, "utf-8");
      console.log(chalk.green(`\n✅ Configuration saved to: ${fileName}`));
    }
  }

  private buildComponentPrompt(name: string, answers: any): string {
    return `
Generate a ${answers.language} component named "${name}".

Description: ${answers.description}

Include these features: ${answers.features.join(", ")}

Requirements:
- Follow best practices for ${answers.language}
- Include proper error handling if requested
- Add TypeScript types if applicable
- Generate clean, maintainable code
- Include JSDoc comments for documentation

Please provide complete, production-ready code.
    `;
  }

  private buildConfigPrompt(type: string): string {
    const prompts = {
      eslint:
        "Generate a comprehensive ESLint configuration with modern JavaScript/TypeScript rules, including recommended practices for code quality.",
      prettier:
        "Generate a Prettier configuration for consistent code formatting with sensible defaults.",
      tsconfig:
        "Generate a TypeScript configuration for a modern project with strict type checking and latest ES features.",
      jest: "Generate a Jest testing configuration with coverage reporting and TypeScript support.",
      webpack:
        "Generate a Webpack configuration for a modern web application with optimization and development server.",
      vite: "Generate a Vite configuration for fast development and optimized production builds.",
      docker:
        "Generate a Dockerfile for a Node.js application with multi-stage build and security best practices.",
      github:
        "Generate a GitHub Actions workflow for CI/CD with testing, linting, and deployment stages.",
    };

    return (
      prompts[type as keyof typeof prompts] ||
      `Generate a ${type} configuration file with best practices.`
    );
  }

  private async generateCustomCode(
    prompt: string,
    language: string,
  ): Promise<GeneratedCode> {
    // Use the existing AI service method for custom code generation
    const projectCode = await this.aiService.generateProject(prompt);

    return {
      type: "implementation",
      content: projectCode.content,
      language,
      explanation: "Generated based on custom specifications",
    };
  }
}
