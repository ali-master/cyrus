import fs from "fs";
import chalk from "chalk";
import { CodeAnalyzer } from "../analyzers/code-analyzer";
import { AIService } from "../services/ai-service";
import { LanguageDetector } from "../analyzers/language-detector";
import { ConfigManager } from "../config/config";
import { createAIProgress } from "../utils/progress-bar";
import {
  validateFileExists,
  handleFileError,
  errorHandler,
  ConfigurationError,
  AnalysisError,
} from "../utils/error-handler";
import type { CodeDiagnostic, AnalysisResult } from "../types";
import { renderMarkdown } from "../utils/render-markdown";

export class AnalyzeCommand {
  private codeAnalyzer: CodeAnalyzer;
  private aiService: AIService;
  private configManager: ConfigManager;

  constructor() {
    this.codeAnalyzer = CodeAnalyzer.getInstance();
    this.aiService = AIService.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  public async handle(filePath: string, options: any = {}): Promise<void> {
    try {
      // Validate configuration
      if (!(await this.configManager.hasValidConfig())) {
        errorHandler.handle(
          new ConfigurationError(
            "No valid configuration found. Please run: cyrus config init",
          ),
          "analyze-command",
        );
        return;
      }

      // Validate file exists
      try {
        validateFileExists(filePath);
      } catch (error) {
        handleFileError(error as Error, filePath);
        return;
      }

      // Check if file is supported
      if (!LanguageDetector.isSupported(filePath)) {
        errorHandler.handle(
          new AnalysisError(
            `Unsupported file type: ${filePath}. Supported extensions: ${LanguageDetector.getSupportedExtensions().join(", ")}`,
            filePath,
          ),
          "analyze-command",
        );
        return;
      }

      const progressBar = createAIProgress("code analysis", {
        theme: "default",
        showETA: true,
      });

      progressBar.start();

      try {
        // Step 1: Static analysis
        progressBar.updateStage("Preparing code analysis", 50);
        console.log(chalk.gray("\nStarting static analysis..."));
        const analysisResult = await this.codeAnalyzer.analyzeFile(filePath);
        console.log(chalk.gray("Static analysis completed."));

        // Step 2: AI-powered analysis
        progressBar.incrementStage(25);
        console.log(chalk.gray("Starting AI analysis..."));
        let code: string;
        try {
          code = fs.readFileSync(filePath, "utf-8");
        } catch (error) {
          progressBar.fail("Failed to read file");
          handleFileError(error as Error, filePath);
          return;
        }
        console.log(chalk.gray("Calling AI service..."));
        progressBar.updateStage("Processing with AI", 80);
        const aiAnalysis = await this.aiService.analyzeCode(code, filePath);
        console.log(chalk.gray("\nAI analysis completed."));

        progressBar.incrementStage(100);
        progressBar.complete("Analysis completed successfully");
        console.log(); // Add spacing after progress bar

        // Display results
        await this.displayResults(filePath, analysisResult, aiAnalysis);

        // Handle specific options
        if (options.explain && analysisResult.diagnostics.length > 0) {
          await this.explainErrors(analysisResult.diagnostics, code);
        }

        if (options.security) {
          await this.runSecurityScan(code, filePath);
        }

        if (options.metrics) {
          this.displayMetrics(analysisResult);
        }
      } catch (error) {
        progressBar.fail("Analysis failed");
        console.log(); // Add spacing after progress bar
        errorHandler.handle(
          new AnalysisError(
            `Analysis failed: ${(error as Error).message}`,
            filePath,
          ),
          "analyze-command",
        );
      }
    } catch (error) {
      // Handle error and ensure process doesn't exit immediately
      errorHandler.handle(error as Error, "analyze-command");
      // Give time for error output to be displayed
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  private async displayResults(
    filePath: string,
    analysisResult: AnalysisResult,
    aiAnalysis: string,
  ): Promise<void> {
    const config = await this.configManager.getConfig();

    console.log(chalk.cyan(`\n📊 Analysis Results for: ${filePath}`));
    console.log(chalk.gray("═".repeat(60)));

    // Static analysis results
    if (analysisResult.diagnostics.length === 0) {
      console.log(chalk.green("✅ No syntax errors found"));
    } else {
      console.log(
        chalk.red(`❌ Found ${analysisResult.diagnostics.length} issue(s):`),
      );
      this.displayDiagnostics(analysisResult.diagnostics);
    }

    // Code metrics
    if (analysisResult.metrics) {
      console.log(chalk.cyan("\n📈 Code Metrics:"));
      this.displayMetricsInline(analysisResult.metrics);
    }

    // AI analysis
    if (config?.outputFormat === "json") {
      console.log(chalk.cyan("\n🤖 AI Analysis:"));
      console.log(JSON.stringify({ aiAnalysis }, null, 2));
    } else {
      // Render AI analysis with Markdown formatting
      const markdownContent = `## 🤖 AI Analysis\n\n${aiAnalysis}`;
      console.log(await renderMarkdown(markdownContent));
    }
  }

  private displayDiagnostics(diagnostics: CodeDiagnostic[]): void {
    diagnostics.forEach((diagnostic, index) => {
      const severityColor = {
        error: chalk.red,
        warning: chalk.yellow,
        info: chalk.blue,
      }[diagnostic.severity];

      console.log(
        `${index + 1}. ${severityColor(diagnostic.severity.toUpperCase())}: ${diagnostic.message}`,
      );
      console.log(
        chalk.gray(`   Line ${diagnostic.line}, Column ${diagnostic.column}`),
      );
      if (diagnostic.source) {
        console.log(chalk.gray(`   Source: ${diagnostic.source}`));
      }
      console.log();
    });
  }

  private displayMetricsInline(metrics: any): void {
    console.log(
      chalk.white(
        `  Complexity: ${this.getComplexityColor(metrics.complexity)(metrics.complexity)}`,
      ),
    );
    console.log(
      chalk.white(
        `  Maintainability: ${this.getMaintainabilityColor(metrics.maintainabilityIndex)(metrics.maintainabilityIndex.toFixed(1))}`,
      ),
    );
    console.log(
      chalk.white(`  Lines of Code: ${chalk.blue(metrics.linesOfCode)}`),
    );
    console.log(
      chalk.white(
        `  Technical Debt: ${this.getTechnicalDebtColor(metrics.technicalDebt)(metrics.technicalDebt.toFixed(1))} minutes`,
      ),
    );
    if (metrics.duplicateLines > 0) {
      console.log(
        chalk.white(
          `  Duplicate Lines: ${chalk.yellow(metrics.duplicateLines)}`,
        ),
      );
    }
  }

  private displayMetrics(analysisResult: AnalysisResult): void {
    if (!analysisResult.metrics) return;

    const { metrics } = analysisResult;
    console.log(chalk.cyan("\n📊 Detailed Metrics:"));
    console.log(chalk.gray("─".repeat(40)));

    console.log(chalk.white("Code Quality Assessment:"));
    console.log(
      `  • Cyclomatic Complexity: ${this.getComplexityColor(metrics.complexity)(metrics.complexity)} ${this.getComplexityDescription(metrics.complexity)}`,
    );
    console.log(
      `  • Maintainability Index: ${this.getMaintainabilityColor(metrics.maintainabilityIndex)(metrics.maintainabilityIndex.toFixed(1))}/100 ${this.getMaintainabilityDescription(metrics.maintainabilityIndex)}`,
    );
    console.log(
      `  • Technical Debt: ${this.getTechnicalDebtColor(metrics.technicalDebt)(metrics.technicalDebt.toFixed(1))} minutes ${this.getTechnicalDebtDescription(metrics.technicalDebt)}`,
    );

    console.log(chalk.white("\nCode Statistics:"));
    console.log(`  • Total Lines: ${chalk.blue(metrics.linesOfCode)}`);
    console.log(
      `  • Duplicate Lines: ${metrics.duplicateLines > 0 ? chalk.yellow(metrics.duplicateLines) : chalk.green("0")}`,
    );

    if (metrics.testCoverage !== undefined) {
      console.log(
        `  • Test Coverage: ${this.getCoverageColor(metrics.testCoverage)(metrics.testCoverage.toFixed(1))}%`,
      );
    }
  }

  private async explainErrors(
    diagnostics: CodeDiagnostic[],
    code: string,
  ): Promise<void> {
    console.log(chalk.cyan("\n🔍 Error Explanations:"));
    console.log(chalk.gray("─".repeat(40)));

    for (let i = 0; i < Math.min(3, diagnostics.length); i++) {
      const diagnostic = diagnostics[i];
      console.log(
        chalk.yellow(`\nExplaining error ${i + 1}: ${diagnostic.message}`),
      );

      try {
        const explanation = await this.aiService.explainError(
          diagnostic.message,
          code,
        );
        console.log(chalk.white(explanation));
      } catch (error) {
        console.error(
          chalk.red(`Failed to explain error: ${(error as Error).message}`),
        );
      }
    }

    if (diagnostics.length > 3) {
      console.log(
        chalk.gray(
          `\n... and ${diagnostics.length - 3} more errors. Use --explain-all to see all explanations.`,
        ),
      );
    }
  }

  private async runSecurityScan(code: string, filePath: string): Promise<void> {
    const progressBar = createAIProgress("security scan", {
      theme: "default",
      showETA: false,
    });

    progressBar.start();

    try {
      progressBar.updateStage("Preparing security scan", 30);
      const detection = await LanguageDetector.detectLanguage(filePath, code);
      if (!detection.language) {
        progressBar.fail("Security scan failed: Unknown language");
        return;
      }

      progressBar.updateStage("Processing with AI", 80);
      const vulnerabilities = await this.aiService.scanForSecurity(
        code,
        detection.language,
      );
      progressBar.complete(
        `Security scan completed - found ${vulnerabilities.length} potential issues`,
      );

      if (vulnerabilities.length > 0) {
        console.log(chalk.cyan("\n🔒 Security Analysis:"));
        console.log(chalk.gray("─".repeat(40)));

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
          console.log(chalk.white(`   ${vuln.description}`));
          console.log(chalk.gray(`   Line ${vuln.line} in ${vuln.file}`));
          if (vuln.cwe) {
            console.log(chalk.gray(`   CWE: ${vuln.cwe}`));
          }
          if (vuln.fix) {
            console.log(chalk.green(`   Fix: ${vuln.fix}`));
          }
          console.log();
        });
      } else {
        console.log(chalk.green("\n✅ No security vulnerabilities detected"));
      }
    } catch (error) {
      progressBar.fail("Security scan failed");
      console.error(
        chalk.red(`Security scan failed: ${(error as Error).message}`),
      );
    }
  }

  private getComplexityColor(complexity: number) {
    if (complexity <= 10) return chalk.green;
    if (complexity <= 20) return chalk.yellow;
    return chalk.red;
  }

  private getComplexityDescription(complexity: number): string {
    if (complexity <= 10) return "(Low - Easy to maintain)";
    if (complexity <= 20) return "(Medium - Moderate complexity)";
    if (complexity <= 30) return "(High - Consider refactoring)";
    return "(Very High - Needs refactoring)";
  }

  private getMaintainabilityColor(index: number) {
    if (index >= 70) return chalk.green;
    if (index >= 50) return chalk.yellow;
    return chalk.red;
  }

  private getMaintainabilityDescription(index: number): string {
    if (index >= 70) return "(Good)";
    if (index >= 50) return "(Fair)";
    return "(Poor)";
  }

  private getTechnicalDebtColor(debt: number) {
    if (debt <= 30) return chalk.green;
    if (debt <= 60) return chalk.yellow;
    return chalk.red;
  }

  private getTechnicalDebtDescription(debt: number): string {
    if (debt <= 30) return "(Low debt)";
    if (debt <= 60) return "(Moderate debt)";
    return "(High debt)";
  }

  private getCoverageColor(coverage: number) {
    if (coverage >= 80) return chalk.green;
    if (coverage >= 60) return chalk.yellow;
    return chalk.red;
  }
}
