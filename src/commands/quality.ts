import fs from "fs";
import path from "path";
import chalk from "chalk";
import { glob } from "glob";
import { AIService } from "../services/ai-service";
import { CodeAnalyzer } from "../analyzers/code-analyzer";
import { LanguageDetector } from "../analyzers/language-detector";
import { ConfigManager } from "../config/config";
import { renderMarkdown } from "../utils/render-markdown";
import { createFileProcessingProgress } from "../utils/progress-bar";
import {
  validateFileExists,
  errorHandler,
  ConfigurationError,
  AnalysisError,
} from "../utils/error-handler";
import type { CodeMetrics, AnalysisResult } from "../types";

interface QualityMetrics {
  overallScore: number;
  codeHealth: number;
  maintainability: number;
  complexity: number;
  testCoverage: number;
  documentation: number;
  security: number;
  recommendations: string[];
  files: FileQuality[];
}

interface FileQuality {
  path: string;
  score: number;
  issues: number;
  metrics?: CodeMetrics;
}

export class QualityCommand {
  private aiService: AIService;
  private codeAnalyzer: CodeAnalyzer;
  private configManager: ConfigManager;

  constructor() {
    this.aiService = AIService.getInstance();
    this.codeAnalyzer = CodeAnalyzer.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  public async handle(target: string, options: any = {}): Promise<void> {
    try {
      // Validate configuration
      if (!(await this.configManager.hasValidConfig())) {
        errorHandler.handle(
          new ConfigurationError(
            "No valid configuration found. Please run: cyrus config init",
          ),
          "quality-command",
        );
        return;
      }

      try {
        const qualityMetrics = await this.analyzeQuality(target, options);
        await this.displayQualityReport(qualityMetrics);
      } catch (error) {
        console.log(); // Add newline after progress bar
        errorHandler.handle(
          new AnalysisError(
            `Quality analysis failed: ${(error as Error).message}`,
            target,
          ),
          "quality-command",
        );
      }
    } catch (error) {
      errorHandler.handle(error as Error, "quality-command");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  private async analyzeQuality(
    target: string,
    options: any,
  ): Promise<QualityMetrics> {
    const isDirectory =
      fs.existsSync(target) && fs.statSync(target).isDirectory();
    let files: string[] = [];

    // Create progress bar
    const progressBar = createFileProcessingProgress(1, {
      // Initial estimate, will update
      theme: "modern",
      showETA: true,
      showSpeed: true,
    });

    progressBar.start();
    progressBar.updateStage("Scanning files", 0);

    if (isDirectory) {
      // Analyze directory
      const pattern = path.join(
        target,
        "**/*.{ts,js,tsx,jsx,py,java,cpp,c,cs,go,rs,rb,php}",
      );
      files = await glob(pattern, {
        ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
      });
    } else {
      // Analyze single file
      validateFileExists(target);
      if (!LanguageDetector.isSupported(target)) {
        throw new AnalysisError(
          `Unsupported file type: ${target}. Supported extensions: ${LanguageDetector.getSupportedExtensions().join(", ")}`,
          target,
        );
      }
      files = [target];
    }

    if (files.length === 0) {
      progressBar.fail("No supported files found for analysis");
      throw new AnalysisError("No supported files found for analysis", target);
    }

    const filesToAnalyze = files.slice(0, options.maxFiles || 50);
    progressBar.updateStage("Scanning files", 100);

    // Analyze each file
    const fileQualities: FileQuality[] = [];
    let totalLines = 0;
    let totalIssues = 0;
    let totalComplexity = 0;

    progressBar.incrementStage(0); // Move to "Analyzing code" stage

    for (let i = 0; i < filesToAnalyze.length; i++) {
      const file = filesToAnalyze[i];
      const progress = ((i + 1) / filesToAnalyze.length) * 100;

      progressBar.updateProgress(progress, i + 1);

      try {
        const result = await this.codeAnalyzer.analyzeFile(file);
        const fileScore = this.calculateFileScore(result);

        fileQualities.push({
          path: path.relative(process.cwd(), file),
          score: fileScore,
          issues: result.diagnostics.length,
          metrics: result.metrics,
        });

        if (result.metrics) {
          totalLines += result.metrics.linesOfCode;
          totalComplexity += result.metrics.complexity;
        }
        totalIssues += result.diagnostics.length;
      } catch {
        // Skip files that can't be analyzed
      }
    }

    // Move to insights generation stage
    progressBar.incrementStage(25);

    // Calculate overall metrics
    const averageScore =
      fileQualities.reduce((sum, f) => sum + f.score, 0) / fileQualities.length;
    const codeHealth = Math.max(0, 100 - (totalIssues / files.length) * 10);
    const maintainability = this.calculateMaintainability(fileQualities);
    const complexity = this.calculateComplexityScore(
      totalComplexity,
      totalLines,
    );

    progressBar.updateStage("Generating insights", 50);
    const testCoverage = await this.estimateTestCoverage(target, files);
    const documentation = this.calculateDocumentationScore(target);
    const security = await this.calculateSecurityScore(files.slice(0, 10));

    progressBar.updateStage("Generating insights", 80);

    // Generate AI recommendations
    const recommendations = await this.generateRecommendations({
      overallScore: averageScore,
      codeHealth,
      maintainability,
      complexity,
      testCoverage,
      documentation,
      security,
      fileCount: files.length,
      totalIssues,
    });

    // Finalize report
    progressBar.updateStage("Finalizing report", 100);

    const result = {
      overallScore: Math.round(
        averageScore * 0.3 +
          codeHealth * 0.2 +
          maintainability * 0.15 +
          complexity * 0.15 +
          testCoverage * 0.1 +
          documentation * 0.05 +
          security * 0.05,
      ),
      codeHealth,
      maintainability,
      complexity,
      testCoverage,
      documentation,
      security,
      recommendations,
      files: fileQualities.sort((a, b) => a.score - b.score),
    };

    progressBar.complete(
      `Quality analysis completed for ${files.length} files`,
    );
    console.log(); // Add spacing after progress bar

    return result;
  }

  private calculateFileScore(result: AnalysisResult): number {
    let score = 100;

    // Deduct points for issues
    score -= result.diagnostics.length * 5;

    // Consider complexity
    if (result.metrics) {
      const complexity = result.metrics.complexity;
      if (complexity > 20) score -= 20;
      else if (complexity > 10) score -= 10;

      // Consider maintainability index
      if (result.metrics.maintainabilityIndex < 50) score -= 15;
      else if (result.metrics.maintainabilityIndex < 70) score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateMaintainability(files: FileQuality[]): number {
    const avgComplexity =
      files.reduce((sum, f) => sum + (f.metrics?.complexity || 0), 0) /
      files.length;

    if (avgComplexity <= 5) return 100;
    if (avgComplexity <= 10) return 80;
    if (avgComplexity <= 20) return 60;
    return 40;
  }

  private calculateComplexityScore(
    totalComplexity: number,
    totalLines: number,
  ): number {
    if (totalLines === 0) return 100;
    const complexityRatio = totalComplexity / totalLines;

    if (complexityRatio <= 0.1) return 100;
    if (complexityRatio <= 0.2) return 80;
    if (complexityRatio <= 0.3) return 60;
    return 40;
  }

  private async estimateTestCoverage(
    target: string,
    files: string[],
  ): Promise<number> {
    const isDirectory = fs.statSync(target).isDirectory();
    if (!isDirectory) return 50; // Default for single files

    const testFiles = await glob(
      path.join(target, "**/*.{test,spec}.{ts,js,tsx,jsx}"),
      {
        ignore: ["**/node_modules/**"],
      },
    );

    const sourceFiles = files.filter(
      (f) => !f.includes("test") && !f.includes("spec"),
    );
    const coverage = Math.min(
      100,
      (testFiles.length / sourceFiles.length) * 100,
    );

    return Math.round(coverage);
  }

  private calculateDocumentationScore(target: string): number {
    let score = 0;

    // Check for README
    const readmeExists =
      fs.existsSync(path.join(target, "README.md")) ||
      fs.existsSync(path.join(target, "readme.md"));
    if (readmeExists) score += 40;

    // Check for package.json with description
    const packageJsonPath = path.join(target, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        if (pkg.description && pkg.description.length > 10) score += 30;
      } catch {
        // Ignore parse errors
      }
    }

    // Check for docs directory
    const docsExists =
      fs.existsSync(path.join(target, "docs")) ||
      fs.existsSync(path.join(target, "documentation"));
    if (docsExists) score += 30;

    return Math.min(100, score);
  }

  private async calculateSecurityScore(files: string[]): Promise<number> {
    let score = 100;
    let securityIssues = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, "utf-8");

        // Check for common security issues
        if (content.includes("eval(") || content.includes("innerHTML"))
          securityIssues++;
        if (content.includes("password") && content.includes("="))
          securityIssues++;
        if (content.includes("api_key") || content.includes("secret"))
          securityIssues++;
        if (content.includes("http://") && !content.includes("localhost"))
          securityIssues++;
      } catch {
        // Skip files that can't be read
      }
    }

    score -= securityIssues * 15;
    return Math.max(0, score);
  }

  private async generateRecommendations(metrics: any): Promise<string[]> {
    try {
      const prompt = `
Based on the following code quality metrics, provide 5-7 specific, actionable recommendations for improvement:

Overall Score: ${metrics.overallScore}/100
Code Health: ${metrics.codeHealth}/100
Maintainability: ${metrics.maintainability}/100
Complexity: ${metrics.complexity}/100
Test Coverage: ${metrics.testCoverage}%
Documentation: ${metrics.documentation}/100
Security: ${metrics.security}/100

File Count: ${metrics.fileCount}
Total Issues: ${metrics.totalIssues}

Format as a bullet list with specific, actionable items. Focus on the lowest scoring areas.
`;

      const response = await this.aiService.analyzeCode(
        prompt,
        "quality-analysis",
      );
      return response
        .split("\n")
        .filter(
          (line: string) =>
            line.trim().startsWith("•") ||
            line.trim().startsWith("-") ||
            line.trim().startsWith("*"),
        )
        .map((line: string) => line.replace(/^[•\-*]\s*/, ""))
        .filter((line: string) => line.length > 10);
    } catch {
      return [
        "Address code issues to improve overall health",
        "Reduce complexity in high-complexity functions",
        "Add more comprehensive test coverage",
        "Improve code documentation",
        "Review security practices",
      ];
    }
  }

  private async displayQualityReport(metrics: QualityMetrics): Promise<void> {
    const getScoreColor = (score: number) => {
      if (score >= 80) return chalk.green;
      if (score >= 60) return chalk.yellow;
      return chalk.red;
    };

    const getGrade = (score: number): string => {
      if (score >= 90) return "A+";
      if (score >= 80) return "A";
      if (score >= 70) return "B";
      if (score >= 60) return "C";
      if (score >= 50) return "D";
      return "F";
    };

    // Overall score
    const overallColor = getScoreColor(metrics.overallScore);
    const grade = getGrade(metrics.overallScore);

    console.log(chalk.cyan("\n🎯 Code Quality Report"));
    console.log(chalk.gray("═".repeat(60)));

    console.log(
      `\n${overallColor.bold(`Overall Quality Score: ${metrics.overallScore}/100 (${grade})`)}`,
    );
    console.log(
      overallColor(
        `${"█".repeat(Math.floor(metrics.overallScore / 5))}${"░".repeat(20 - Math.floor(metrics.overallScore / 5))}`,
      ),
    );

    // Detailed metrics
    console.log(chalk.cyan("\n📊 Detailed Metrics:"));
    const metricsToShow = [
      ["Code Health", metrics.codeHealth],
      ["Maintainability", metrics.maintainability],
      ["Complexity", metrics.complexity],
      ["Test Coverage", metrics.testCoverage],
      ["Documentation", metrics.documentation],
      ["Security", metrics.security],
    ];

    metricsToShow.forEach(([name, score]) => {
      const nameStr = String(name);
      const scoreNum = Number(score);
      const color = getScoreColor(scoreNum);
      console.log(
        `  ${nameStr.padEnd(16)} ${color(`${scoreNum}/100`)} ${"█".repeat(Math.floor(scoreNum / 10))}${"░".repeat(10 - Math.floor(scoreNum / 10))}`,
      );
    });

    // File analysis summary
    if (metrics.files.length > 1) {
      console.log(chalk.cyan("\n📁 File Analysis:"));
      console.log(`  Total files analyzed: ${metrics.files.length}`);

      const worstFiles = metrics.files.slice(0, 3);
      if (worstFiles.length > 0) {
        console.log(chalk.yellow("\n  Files needing attention:"));
        worstFiles.forEach((file) => {
          const color = getScoreColor(file.score);
          console.log(
            `    ${color(file.path)} - Score: ${color(`${file.score}/100`)} (${file.issues} issues)`,
          );
        });
      }
    }

    // AI Recommendations
    if (metrics.recommendations.length > 0) {
      const recommendationsMarkdown = `
## 🚀 Improvement Recommendations

${metrics.recommendations.map((rec) => `• ${rec}`).join("\n")}

---
*Quality score calculated based on code health, maintainability, complexity, test coverage, documentation, and security factors.*
`;
      console.log(await renderMarkdown(recommendationsMarkdown));
    }
  }
}
