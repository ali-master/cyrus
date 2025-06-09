import fs from "fs";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { AIService } from "../services/ai-service";
import { LanguageDetector } from "../analyzers/language-detector";
import { ConfigManager } from "../config/config";
import type { MentorContext } from "../types";

export class MentorCommand {
  private aiService: AIService;
  private configManager: ConfigManager;
  private mentorContext: MentorContext;

  constructor() {
    this.aiService = AIService.getInstance();
    this.configManager = ConfigManager.getInstance();
    this.mentorContext = {
      codeHistory: [],
      userLevel: "intermediate",
      focusAreas: [],
      learningGoals: [],
    };
  }

  public async handle(filePath: string, options: any = {}): Promise<void> {
    try {
      // Validate configuration
      if (!(await this.configManager.hasValidConfig())) {
        console.log(chalk.red("❌ No valid configuration found."));
        console.log(chalk.yellow("Please run: cyrus config init"));
        return;
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(chalk.red(`❌ File not found: ${filePath}`));
        return;
      }

      // Check if file is supported
      if (!LanguageDetector.isSupported(filePath)) {
        console.log(chalk.red(`❌ Unsupported file type: ${filePath}`));
        return;
      }

      console.log(chalk.cyan("🎓 Welcome to Cyrus Mentor Mode!\n"));

      // Initialize mentor session
      if (!options.skipSetup) {
        await this.setupMentorSession();
      }

      // Start mentoring
      await this.startMentoring(filePath, options);
    } catch (error) {
      console.error(chalk.red("❌ Mentor mode error:"), error);
      process.exit(1);
    }
  }

  private async setupMentorSession(): Promise<void> {
    console.log(chalk.yellow("Let's customize your learning experience:\n"));

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "userLevel",
        message: "What's your programming experience level?",
        choices: [
          { name: "🌱 Beginner - New to programming", value: "beginner" },
          { name: "🌿 Intermediate - Some experience", value: "intermediate" },
          { name: "🌳 Advanced - Experienced developer", value: "advanced" },
        ],
        default: "intermediate",
      },
      {
        type: "checkbox",
        name: "focusAreas",
        message: "What areas would you like to focus on? (Select multiple)",
        choices: [
          { name: "Code Quality & Best Practices", value: "quality" },
          { name: "Performance Optimization", value: "performance" },
          { name: "Security Considerations", value: "security" },
          { name: "Design Patterns", value: "patterns" },
          { name: "Testing Strategies", value: "testing" },
          { name: "Debugging Techniques", value: "debugging" },
          { name: "Architecture & Structure", value: "architecture" },
        ],
        default: ["quality", "performance"],
      },
      {
        type: "input",
        name: "learningGoals",
        message: "Any specific learning goals or questions? (optional)",
        filter: (input: string) =>
          input
            .split(",")
            .map((goal) => goal.trim())
            .filter(Boolean),
      },
    ]);

    this.mentorContext = {
      ...this.mentorContext,
      userLevel: answers.userLevel,
      focusAreas: answers.focusAreas,
      learningGoals: answers.learningGoals || [],
    };

    console.log(chalk.green("\n✅ Mentor session configured!\n"));
  }

  private async startMentoring(filePath: string, options: any): Promise<void> {
    const code = fs.readFileSync(filePath, "utf-8");
    const detection = await LanguageDetector.detectLanguage(filePath, code);

    if (!detection.language) {
      console.log(chalk.red("❌ Could not detect programming language"));
      return;
    }

    const languageInfo = LanguageDetector.getLanguageInfo(detection.language);
    console.log(
      chalk.cyan(`📚 Analyzing ${languageInfo.name} code: ${filePath}`),
    );
    console.log(chalk.gray("─".repeat(60)));

    // Add to context
    this.mentorContext.codeHistory.push(code);

    if (options.interactive) {
      await this.runInteractiveMentoring(code, detection.language, filePath);
    } else {
      await this.runBasicMentoring(code, detection.language, filePath);
    }
  }

  private async runBasicMentoring(
    code: string,
    language: string,
    filePath: string,
  ): Promise<void> {
    const spinner = ora("🤖 Analyzing code and preparing mentoring...").start();

    try {
      const mentoring = await this.aiService.provideMentoring(
        code,
        language,
        this.mentorContext.userLevel,
      );

      spinner.succeed("Mentoring analysis completed");

      console.log(chalk.cyan("\n🎓 Code Mentoring:\n"));
      console.log(chalk.white(mentoring));

      // Provide additional insights based on focus areas
      await this.provideFocusedInsights(code, language);

      // Suggest next steps
      this.suggestNextSteps(language);
    } catch (error) {
      spinner.fail("Mentoring failed");
      throw error;
    }
  }

  private async runInteractiveMentoring(
    code: string,
    language: string,
    filePath: string,
  ): Promise<void> {
    console.log(
      chalk.yellow("🔄 Interactive Mentoring Mode - Ask questions anytime!\n"),
    );

    let continueSession = true;

    while (continueSession) {
      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "What would you like to do?",
          choices: [
            { name: "📖 Get overall code explanation", value: "explain" },
            { name: "🔍 Focus on specific lines", value: "focus" },
            { name: "🎯 Ask specific question", value: "question" },
            { name: "🔧 Get improvement suggestions", value: "improve" },
            { name: "🧪 Learn about testing", value: "testing" },
            { name: "🔒 Security review", value: "security" },
            { name: "⚡ Performance tips", value: "performance" },
            { name: "❌ Exit mentor mode", value: "exit" },
          ],
        },
      ]);

      switch (action) {
        case "explain":
          await this.explainCode(code, language);
          break;
        case "focus":
          await this.focusOnLines(code, language);
          break;
        case "question":
          await this.answerQuestion(code, language);
          break;
        case "improve":
          await this.suggestImprovements(code, language);
          break;
        case "testing":
          await this.explainTesting(code, language);
          break;
        case "security":
          await this.reviewSecurity(code, language);
          break;
        case "performance":
          await this.reviewPerformance(code, language);
          break;
        case "exit":
          continueSession = false;
          break;
      }

      if (continueSession) {
        console.log(chalk.gray(`\n${"─".repeat(40)}\n`));
      }
    }

    console.log(chalk.green("\n👋 Thanks for using Cyrus Mentor Mode!"));
    console.log(chalk.white("Keep coding and learning! 🚀"));
  }

  private async explainCode(code: string, language: string): Promise<void> {
    const spinner = ora("Analyzing code structure...").start();

    try {
      const explanation = await this.aiService.provideMentoring(
        code,
        language,
        this.mentorContext.userLevel,
      );
      spinner.succeed("Code explanation ready");
      console.log(chalk.cyan("\n📖 Code Explanation:\n"));
      console.log(chalk.white(explanation));
    } catch (error) {
      spinner.fail("Failed to explain code");
      console.error(chalk.red("Error:"), error);
    }
  }

  private async focusOnLines(code: string, language: string): Promise<void> {
    const lines = code.split("\n");

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "startLine",
        message: `Enter start line number (1-${lines.length}):`,
        validate: (input: string) => {
          const num = Number.parseInt(input);
          return (
            (num >= 1 && num <= lines.length) ||
            `Must be between 1 and ${lines.length}`
          );
        },
      },
      {
        type: "input",
        name: "endLine",
        message: `Enter end line number (1-${lines.length}):`,
        validate: (input: string) => {
          const num = Number.parseInt(input);
          return (
            (num >= 1 && num <= lines.length) ||
            `Must be between 1 and ${lines.length}`
          );
        },
      },
    ]);

    const startLine = Number.parseInt(answers.startLine);
    const endLine = Number.parseInt(answers.endLine);

    const focusedCode = lines.slice(startLine - 1, endLine).join("\n");
    const spinner = ora(`Analyzing lines ${startLine}-${endLine}...`).start();

    try {
      const explanation = await this.aiService.provideMentoring(
        focusedCode,
        language,
        this.mentorContext.userLevel,
      );
      spinner.succeed("Line analysis completed");

      console.log(
        chalk.cyan(`\n🔍 Analysis of lines ${startLine}-${endLine}:\n`),
      );
      console.log(chalk.gray(focusedCode));
      console.log(chalk.cyan("\nExplanation:\n"));
      console.log(chalk.white(explanation));
    } catch (error) {
      spinner.fail("Line analysis failed");
      console.error(chalk.red("Error:"), error);
    }
  }

  private async answerQuestion(code: string, language: string): Promise<void> {
    const { question } = await inquirer.prompt([
      {
        type: "input",
        name: "question",
        message: "What would you like to know about this code?",
        validate: (input: string) =>
          input.length > 0 || "Please enter a question",
      },
    ]);

    const spinner = ora("Thinking about your question...").start();

    try {
      // Create a focused prompt for the specific question
      const prompt = `
User Level: ${this.mentorContext.userLevel}
Focus Areas: ${this.mentorContext.focusAreas.join(", ")}
Question: ${question}

Code:
\`\`\`${language}
${code}
\`\`\`

Please provide a detailed, educational answer appropriate for a ${this.mentorContext.userLevel} developer.
      `;

      // This would be a more specific AI call, but using existing method for now
      const answer = await this.aiService.provideMentoring(
        `Question: ${question}\n\n${code}`,
        language,
        this.mentorContext.userLevel,
      );

      spinner.succeed("Question answered");

      console.log(chalk.cyan(`\n❓ Question: ${question}\n`));
      console.log(chalk.white(answer));
    } catch (error) {
      spinner.fail("Failed to answer question");
      console.error(chalk.red("Error:"), error);
    }
  }

  private async suggestImprovements(
    code: string,
    language: string,
  ): Promise<void> {
    const spinner = ora("Generating improvement suggestions...").start();

    try {
      const suggestions = await this.aiService.generateRefactorSuggestions(
        code,
        language,
      );
      spinner.succeed("Improvement suggestions ready");

      console.log(chalk.cyan("\n🔧 Improvement Suggestions:\n"));

      if (suggestions.length === 0) {
        console.log(
          chalk.green("✅ Your code looks good! No major improvements needed."),
        );
        return;
      }

      suggestions.forEach((suggestion, index) => {
        const impactColor = {
          low: chalk.blue,
          medium: chalk.yellow,
          high: chalk.red,
        }[suggestion.impact];

        console.log(`${index + 1}. ${chalk.bold(suggestion.title)}`);
        console.log(
          `   ${chalk.gray("Impact:")} ${impactColor(suggestion.impact)} | ${chalk.gray("Category:")} ${suggestion.category}`,
        );
        console.log(`   ${suggestion.description}`);

        if (suggestion.before && suggestion.after) {
          console.log(chalk.gray("   Before:"));
          console.log(chalk.red(`   ${suggestion.before}`));
          console.log(chalk.gray("   After:"));
          console.log(chalk.green(`   ${suggestion.after}`));
        }

        console.log();
      });
    } catch (error) {
      spinner.fail("Failed to generate suggestions");
      console.error(chalk.red("Error:"), error);
    }
  }

  private async explainTesting(code: string, language: string): Promise<void> {
    const spinner = ora("Preparing testing guidance...").start();

    try {
      const testCode = await this.aiService.generateTests(code, language);
      spinner.succeed("Testing guidance ready");

      const languageInfo = LanguageDetector.getLanguageInfo(language as any);

      console.log(chalk.cyan("\n🧪 Testing Strategy:\n"));
      console.log(
        chalk.white(
          `For ${languageInfo.name}, popular testing frameworks include:`,
        ),
      );
      console.log(
        chalk.yellow(`• ${languageInfo.testFrameworks.join(", ")}\n`),
      );

      console.log(chalk.cyan("Generated Tests:\n"));
      console.log(chalk.white(testCode.content));

      console.log(chalk.cyan("\nTesting Best Practices:"));
      console.log(
        chalk.white("• Write tests before or alongside your code (TDD)"),
      );
      console.log(chalk.white("• Test edge cases and error scenarios"));
      console.log(chalk.white("• Keep tests simple and focused"));
      console.log(chalk.white("• Use descriptive test names"));
      console.log(chalk.white("• Mock external dependencies"));
    } catch (error) {
      spinner.fail("Failed to generate testing guidance");
      console.error(chalk.red("Error:"), error);
    }
  }

  private async reviewSecurity(code: string, language: string): Promise<void> {
    const spinner = ora("Conducting security review...").start();

    try {
      const vulnerabilities = await this.aiService.scanForSecurity(
        code,
        language,
      );
      spinner.succeed("Security review completed");

      console.log(chalk.cyan("\n🔒 Security Review:\n"));

      if (vulnerabilities.length === 0) {
        console.log(chalk.green("✅ No obvious security issues detected!"));
        console.log(chalk.white("\nGeneral Security Tips:"));
        console.log(chalk.white("• Always validate and sanitize user input"));
        console.log(
          chalk.white("• Use parameterized queries for database operations"),
        );
        console.log(chalk.white("• Keep dependencies updated"));
        console.log(chalk.white("• Never hardcode secrets or credentials"));
        console.log(
          chalk.white("• Implement proper authentication and authorization"),
        );
        return;
      }

      vulnerabilities.forEach((vuln, index) => {
        const severityColor = {
          low: chalk.blue,
          medium: chalk.yellow,
          high: chalk.red,
          critical: chalk.bgRed.white,
        }[vuln.severity];

        console.log(
          `${index + 1}. ${severityColor(vuln.severity.toUpperCase())}: ${vuln.title}`,
        );
        console.log(`   ${vuln.description}`);
        if (vuln.fix) {
          console.log(chalk.green(`   🔧 Fix: ${vuln.fix}`));
        }
        console.log();
      });
    } catch (error) {
      spinner.fail("Security review failed");
      console.error(chalk.red("Error:"), error);
    }
  }

  private async reviewPerformance(
    code: string,
    language: string,
  ): Promise<void> {
    const spinner = ora("Analyzing performance...").start();

    try {
      // Use the existing AI service to get performance insights
      const analysis = await this.aiService.analyzeCode(
        code,
        `Performance analysis for ${language}`,
      );
      spinner.succeed("Performance analysis completed");

      console.log(chalk.cyan("\n⚡ Performance Review:\n"));
      console.log(chalk.white(analysis));

      console.log(chalk.cyan("\nGeneral Performance Tips:"));
      console.log(chalk.white("• Avoid premature optimization"));
      console.log(chalk.white("• Profile before optimizing"));
      console.log(chalk.white("• Consider algorithmic complexity (Big O)"));
      console.log(chalk.white("• Minimize memory allocations in loops"));
      console.log(chalk.white("• Use appropriate data structures"));
      console.log(chalk.white("• Cache expensive computations"));
    } catch (error) {
      spinner.fail("Performance analysis failed");
      console.error(chalk.red("Error:"), error);
    }
  }

  private async provideFocusedInsights(
    code: string,
    language: string,
  ): Promise<void> {
    if (this.mentorContext.focusAreas.length === 0) return;

    console.log(chalk.cyan("\n🎯 Focused Insights:"));
    console.log(chalk.gray("─".repeat(30)));

    for (const area of this.mentorContext.focusAreas) {
      const insight = this.getFocusAreaInsight(area, language);
      console.log(chalk.yellow(`\n${insight.title}:`));
      console.log(chalk.white(insight.content));
    }
  }

  private getFocusAreaInsight(
    area: string,
    language: string,
  ): { title: string; content: string } {
    const insights = {
      quality: {
        title: "📋 Code Quality",
        content:
          "Focus on consistent naming, proper indentation, and clear comments. Follow language-specific style guides.",
      },
      performance: {
        title: "⚡ Performance",
        content:
          "Look for O(n²) loops, unnecessary object creation, and blocking operations. Profile before optimizing.",
      },
      security: {
        title: "🔒 Security",
        content:
          "Validate all inputs, avoid eval(), use HTTPS, and never expose sensitive data in client-side code.",
      },
      patterns: {
        title: "🏗️ Design Patterns",
        content:
          "Consider SOLID principles, use appropriate design patterns, and maintain separation of concerns.",
      },
      testing: {
        title: "🧪 Testing",
        content:
          "Write unit tests for all functions, integration tests for workflows, and maintain good test coverage.",
      },
      debugging: {
        title: "🐛 Debugging",
        content:
          "Use debugger tools, add strategic console logs, and write defensive code with proper error handling.",
      },
      architecture: {
        title: "🏛️ Architecture",
        content:
          "Organize code in modules, minimize dependencies, and create clear interfaces between components.",
      },
    };

    return (
      insights[area as keyof typeof insights] || {
        title: "💡 General Tip",
        content:
          "Keep learning and practicing! Every developer journey is unique.",
      }
    );
  }

  private suggestNextSteps(language: string): void {
    console.log(chalk.cyan("\n🚀 Suggested Next Steps:"));
    console.log(chalk.gray("─".repeat(25)));

    const suggestions = [
      "Try refactoring a complex function into smaller, focused functions",
      "Add comprehensive error handling to your code",
      "Write unit tests for the main functionality",
      "Review and optimize any performance bottlenecks",
      "Document your code with clear comments and examples",
      "Consider implementing logging for better debugging",
    ];

    suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${chalk.white(suggestion)}`);
    });

    console.log(chalk.yellow("\n💡 Keep experimenting and asking questions!"));
  }
}
