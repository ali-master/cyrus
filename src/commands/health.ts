import fs from "fs";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import { glob } from "glob";
import { CodeAnalyzer } from "../analyzers/code-analyzer";
import { AIService } from "../services/ai-service";
import { LanguageDetector } from "../analyzers/language-detector";
import { ConfigManager } from "../config/config";
import type {
  SecurityVulnerability,
  ProjectHealth,
  FileAnalysis,
} from "../types";

export class HealthCommand {
  private codeAnalyzer: CodeAnalyzer;
  private aiService: AIService;
  private configManager: ConfigManager;

  constructor() {
    this.codeAnalyzer = CodeAnalyzer.getInstance();
    this.aiService = AIService.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  public async handle(options: any = {}): Promise<void> {
    try {
      // Validate configuration
      if (!this.configManager.hasValidConfig()) {
        console.log(chalk.red("❌ No valid configuration found."));
        console.log(chalk.yellow("Please run: cyrus config init"));
        return;
      }

      console.log(
        chalk.cyan("🔍 Starting comprehensive codebase health scan...\n"),
      );

      const spinner = ora("Discovering source files...").start();

      // Discover source files
      const files = await this.discoverSourceFiles(
        options.path || process.cwd(),
      );

      if (files.length === 0) {
        spinner.fail("No source files found");
        console.log(
          chalk.yellow(
            "No supported source files found in the current directory.",
          ),
        );
        return;
      }

      spinner.succeed(`Found ${files.length} source files to analyze`);

      // Analyze files
      const fileAnalyses = await this.analyzeFiles(files, options);

      // Generate project health report
      const projectHealth = this.generateProjectHealth(fileAnalyses);

      // Display results
      await this.displayHealthReport(projectHealth, options);

      // Save report if requested
      if (options.save) {
        await this.saveHealthReport(
          projectHealth,
          options.output || "health-report.json",
        );
      }
    } catch (error) {
      console.error(chalk.red("❌ Health scan error:"), error);
      process.exit(1);
    }
  }

  private async discoverSourceFiles(basePath: string): Promise<string[]> {
    const patterns = [
      "**/*.js",
      "**/*.jsx",
      "**/*.ts",
      "**/*.tsx",
      "**/*.py",
      "**/*.java",
      "**/*.go",
      "**/*.rs",
      "**/*.cs",
      "**/*.php",
      "**/*.rb",
    ];

    const ignorePatterns = [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".git/**",
      "coverage/**",
      "*.min.js",
      "*.bundle.js",
      "__pycache__/**",
      "*.pyc",
      "target/**",
      "vendor/**",
    ];

    try {
      const files = await glob(patterns, {
        cwd: basePath,
        absolute: true,
        ignore: ignorePatterns,
      });

      return files.filter((file) => {
        const stat = fs.statSync(file);
        return stat.isFile() && stat.size > 0 && stat.size < 1024 * 1024; // Skip empty and very large files
      });
    } catch (error) {
      throw new Error(`Failed to discover files: ${error}`);
    }
  }

  private async analyzeFiles(
    files: string[],
    options: any,
  ): Promise<FileAnalysis[]> {
    const analyses: FileAnalysis[] = [];
    const spinner = ora();

    const batchSize = options.parallel ? 5 : 1; // Process files in parallel or sequentially

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(async (file) => {
        try {
          spinner.text = `Analyzing ${path.basename(file)} (${i + 1}/${files.length})`;
          spinner.start();

          const content = fs.readFileSync(file, "utf-8");
          const detection = await LanguageDetector.detectLanguage(
            file,
            content,
          );

          if (!detection.language) {
            return null;
          }

          // Static analysis
          const analysisResult = await this.codeAnalyzer.analyzeFile(file);

          // Security scan
          let securityIssues: SecurityVulnerability[] = [];
          if (options.security !== false) {
            try {
              securityIssues = await this.aiService.scanForSecurity(
                content,
                detection.language,
              );
            } catch (error) {
              console.warn(
                chalk.yellow(`⚠️ Security scan failed for ${file}: ${error}`),
              );
            }
          }

          // Calculate health score
          const healthScore = this.calculateHealthScore(
            analysisResult,
            securityIssues,
          );

          const stat = fs.statSync(file);

          const fileAnalysis: FileAnalysis = {
            filePath: file,
            language: detection.language,
            size: stat.size,
            lastModified: stat.mtime,
            analysis: analysisResult,
            healthScore,
            issues: securityIssues,
          };

          return fileAnalysis;
        } catch (error) {
          console.warn(chalk.yellow(`⚠️ Failed to analyze ${file}: ${error}`));
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      analyses.push(...(batchResults.filter(Boolean) as FileAnalysis[]));

      spinner.succeed(
        `Analyzed batch ${Math.ceil((i + 1) / batchSize)}/${Math.ceil(files.length / batchSize)}`,
      );
    }

    return analyses;
  }

  private calculateHealthScore(
    analysis: any,
    securityIssues: SecurityVulnerability[],
  ): number {
    let score = 100;

    // Deduct points for diagnostics
    const errorCount = analysis.diagnostics.filter(
      (d: any) => d.severity === "error",
    ).length;
    const warningCount = analysis.diagnostics.filter(
      (d: any) => d.severity === "warning",
    ).length;

    score -= errorCount * 10; // 10 points per error
    score -= warningCount * 2; // 2 points per warning

    // Deduct points for metrics
    if (analysis.metrics) {
      const { complexity, maintainabilityIndex, technicalDebt } =
        analysis.metrics;

      if (complexity > 20) score -= (complexity - 20) * 2;
      if (maintainabilityIndex < 50) score -= 50 - maintainabilityIndex;
      if (technicalDebt > 60) score -= (technicalDebt - 60) / 2;
    }

    // Deduct points for security issues
    const criticalIssues = securityIssues.filter(
      (issue) => issue.severity === "critical",
    ).length;
    const highIssues = securityIssues.filter(
      (issue) => issue.severity === "high",
    ).length;
    const mediumIssues = securityIssues.filter(
      (issue) => issue.severity === "medium",
    ).length;

    score -= criticalIssues * 20;
    score -= highIssues * 10;
    score -= mediumIssues * 5;

    return Math.max(0, Math.min(100, score));
  }

  private generateProjectHealth(fileAnalyses: FileAnalysis[]): ProjectHealth {
    const totalFiles = fileAnalyses.length;
    const totalIssues = fileAnalyses.reduce(
      (sum, file) => sum + file.analysis.diagnostics.length,
      0,
    );
    const criticalIssues = fileAnalyses.reduce((sum, file) => {
      return (
        sum +
        file.issues.filter((issue) => issue.severity === "critical").length
      );
    }, 0);

    const avgHealthScore =
      fileAnalyses.reduce((sum, file) => sum + file.healthScore, 0) /
      totalFiles;
    const avgTechnicalDebt =
      fileAnalyses.reduce((sum, file) => {
        return sum + (file.analysis.metrics?.technicalDebt || 0);
      }, 0) / totalFiles;

    const testCoverage = this.estimateTestCoverage(fileAnalyses);

    const recommendations = this.generateRecommendations(fileAnalyses);

    return {
      overallScore: Math.round(avgHealthScore),
      fileAnalyses,
      summary: {
        totalFiles,
        totalIssues,
        criticalIssues,
        technicalDebt: Math.round(avgTechnicalDebt),
        testCoverage: Math.round(testCoverage),
      },
      recommendations,
    };
  }

  private estimateTestCoverage(fileAnalyses: FileAnalysis[]): number {
    // Simple heuristic: count test files vs source files
    const testFiles = fileAnalyses.filter(
      (file) =>
        file.filePath.includes(".test.") ||
        file.filePath.includes(".spec.") ||
        file.filePath.includes("__tests__") ||
        file.filePath.includes("test/"),
    ).length;

    const sourceFiles = fileAnalyses.length - testFiles;

    if (sourceFiles === 0) return 0;

    // Rough estimate: each test file covers about 2-3 source files
    return Math.min(100, ((testFiles * 2.5) / sourceFiles) * 100);
  }

  private generateRecommendations(fileAnalyses: FileAnalysis[]): string[] {
    const recommendations: string[] = [];

    // High complexity files
    const highComplexityFiles = fileAnalyses.filter(
      (file) => file.analysis.metrics && file.analysis.metrics.complexity > 20,
    );
    if (highComplexityFiles.length > 0) {
      recommendations.push(
        `Refactor ${highComplexityFiles.length} files with high complexity (>20)`,
      );
    }

    // Low maintainability
    const lowMaintainabilityFiles = fileAnalyses.filter(
      (file) =>
        file.analysis.metrics &&
        file.analysis.metrics.maintainabilityIndex < 50,
    );
    if (lowMaintainabilityFiles.length > 0) {
      recommendations.push(
        `Improve maintainability of ${lowMaintainabilityFiles.length} files`,
      );
    }

    // Security issues
    const filesWithCriticalSecurity = fileAnalyses.filter((file) =>
      file.issues.some((issue) => issue.severity === "critical"),
    );
    if (filesWithCriticalSecurity.length > 0) {
      recommendations.push(
        `Address critical security issues in ${filesWithCriticalSecurity.length} files`,
      );
    }

    // Technical debt
    const avgDebt =
      fileAnalyses.reduce(
        (sum, file) => sum + (file.analysis.metrics?.technicalDebt || 0),
        0,
      ) / fileAnalyses.length;
    if (avgDebt > 60) {
      recommendations.push(
        "Prioritize technical debt reduction across the codebase",
      );
    }

    // Test coverage
    const testCoverage = this.estimateTestCoverage(fileAnalyses);
    if (testCoverage < 60) {
      recommendations.push("Increase test coverage to at least 60%");
    }

    // Error handling
    const filesWithErrors = fileAnalyses.filter((file) =>
      file.analysis.diagnostics.some((d) => d.severity === "error"),
    );
    if (filesWithErrors.length > 0) {
      recommendations.push(
        `Fix syntax errors in ${filesWithErrors.length} files`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("Great job! Your codebase is in good health 🎉");
    }

    return recommendations;
  }

  private async displayHealthReport(
    projectHealth: ProjectHealth,
    options: any,
  ): Promise<void> {
    const { overallScore, summary, fileAnalyses, recommendations } =
      projectHealth;

    console.log(chalk.cyan("\n📊 Codebase Health Report"));
    console.log(chalk.gray("═".repeat(60)));

    // Overall score
    const scoreColor = this.getScoreColor(overallScore);
    console.log(
      `\n${chalk.bold("Overall Health Score:")} ${scoreColor(`${overallScore}/100`)} ${this.getScoreEmoji(overallScore)}`,
    );

    // Summary statistics
    console.log(chalk.cyan("\n📈 Summary Statistics:"));
    console.log(chalk.gray("─".repeat(30)));
    console.log(
      `${chalk.white("Total Files:")} ${chalk.blue(summary.totalFiles)}`,
    );
    console.log(
      `${chalk.white("Total Issues:")} ${summary.totalIssues > 0 ? chalk.yellow(summary.totalIssues) : chalk.green("0")}`,
    );
    console.log(
      `${chalk.white("Critical Issues:")} ${summary.criticalIssues > 0 ? chalk.red(summary.criticalIssues) : chalk.green("0")}`,
    );
    console.log(
      `${chalk.white("Technical Debt:")} ${this.getTechnicalDebtColor(summary.technicalDebt)(`${summary.technicalDebt} minutes`)}`,
    );
    console.log(
      `${chalk.white("Est. Test Coverage:")} ${this.getCoverageColor(summary.testCoverage)(`${summary.testCoverage}%`)}`,
    );

    // Top issues
    await this.displayTopIssues(fileAnalyses);

    // Language breakdown
    this.displayLanguageBreakdown(fileAnalyses);

    // Recommendations
    console.log(chalk.cyan("\n💡 Recommendations:"));
    console.log(chalk.gray("─".repeat(20)));
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${chalk.white(rec)}`);
    });

    // Detailed file results
    if (options.detailed) {
      await this.displayDetailedResults(fileAnalyses);
    } else if (fileAnalyses.length > 10) {
      console.log(
        chalk.gray(
          `\n💡 Use --detailed flag to see analysis for all ${fileAnalyses.length} files`,
        ),
      );
    }

    // Health trends (if available)
    if (options.trends) {
      await this.displayHealthTrends();
    }
  }

  private async displayTopIssues(fileAnalyses: FileAnalysis[]): Promise<void> {
    console.log(chalk.cyan("\n🔍 Top Issues:"));
    console.log(chalk.gray("─".repeat(15)));

    // Worst health scores
    const worstFiles = fileAnalyses
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, 5);

    console.log(chalk.red("\n🔥 Files needing attention:"));
    worstFiles.forEach((file, index) => {
      const scoreColor = this.getScoreColor(file.healthScore);
      const relativePath = path.relative(process.cwd(), file.filePath);
      console.log(
        `${index + 1}. ${scoreColor(`${file.healthScore}/100`)} ${chalk.white(relativePath)}`,
      );
    });

    // Most complex files
    const complexFiles = fileAnalyses
      .filter((file) => file.analysis.metrics)
      .sort(
        (a, b) =>
          (b.analysis.metrics?.complexity || 0) -
          (a.analysis.metrics?.complexity || 0),
      )
      .slice(0, 3);

    if (complexFiles.length > 0) {
      console.log(chalk.yellow("\n🌀 Most complex files:"));
      complexFiles.forEach((file, index) => {
        const complexity = file.analysis.metrics?.complexity || 0;
        const relativePath = path.relative(process.cwd(), file.filePath);
        console.log(
          `${index + 1}. ${chalk.red(complexity)} ${chalk.white(relativePath)}`,
        );
      });
    }
  }

  private displayLanguageBreakdown(fileAnalyses: FileAnalysis[]): void {
    const languageStats = fileAnalyses.reduce(
      (stats, file) => {
        const lang = file.language;
        if (!stats[lang]) {
          stats[lang] = { count: 0, avgHealth: 0, totalHealth: 0 };
        }
        stats[lang].count++;
        stats[lang].totalHealth += file.healthScore;
        stats[lang].avgHealth = stats[lang].totalHealth / stats[lang].count;
        return stats;
      },
      {} as Record<
        string,
        { count: number; avgHealth: number; totalHealth: number }
      >,
    );

    console.log(chalk.cyan("\n🌐 Language Breakdown:"));
    console.log(chalk.gray("─".repeat(25)));

    Object.entries(languageStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .forEach(([language, stats]) => {
        const healthColor = this.getScoreColor(Math.round(stats.avgHealth));
        console.log(
          `${chalk.white(language.padEnd(12))} ${chalk.blue(stats.count.toString().padStart(3))} files  avg: ${healthColor(Math.round(stats.avgHealth))}`,
        );
      });
  }

  private async displayDetailedResults(
    fileAnalyses: FileAnalysis[],
  ): Promise<void> {
    console.log(chalk.cyan("\n📋 Detailed File Analysis:"));
    console.log(chalk.gray("═".repeat(40)));

    for (const file of fileAnalyses.slice(0, 20)) {
      // Limit to first 20 for readability
      const relativePath = path.relative(process.cwd(), file.filePath);
      const scoreColor = this.getScoreColor(file.healthScore);

      console.log(`\n${chalk.bold(relativePath)}`);
      console.log(
        `${chalk.gray("Score:")} ${scoreColor(`${file.healthScore}/100`)} | ${chalk.gray("Language:")} ${file.language}`,
      );

      if (file.analysis.metrics) {
        const { complexity, maintainabilityIndex, technicalDebt } =
          file.analysis.metrics;
        console.log(
          `${chalk.gray("Complexity:")} ${this.getComplexityColor(complexity)(complexity)} | ${chalk.gray("Maintainability:")} ${this.getMaintainabilityColor(maintainabilityIndex)(maintainabilityIndex.toFixed(1))} | ${chalk.gray("Tech Debt:")} ${this.getTechnicalDebtColor(technicalDebt)(technicalDebt.toFixed(1))}min`,
        );
      }

      if (file.analysis.diagnostics.length > 0) {
        console.log(
          `${chalk.red("Issues:")} ${file.analysis.diagnostics.length}`,
        );
      }

      if (file.issues.length > 0) {
        const critical = file.issues.filter(
          (i) => i.severity === "critical",
        ).length;
        const high = file.issues.filter((i) => i.severity === "high").length;
        console.log(
          `${chalk.red("Security:")} ${critical} critical, ${high} high`,
        );
      }
    }

    if (fileAnalyses.length > 20) {
      console.log(
        chalk.gray(`\n... and ${fileAnalyses.length - 20} more files`),
      );
    }
  }

  private async displayHealthTrends(): Promise<void> {
    // Placeholder for health trends - would require historical data
    console.log(chalk.cyan("\n📈 Health Trends:"));
    console.log(chalk.gray("─".repeat(20)));
    console.log(
      chalk.yellow(
        "💡 Trends require historical data. Run health scans regularly to track progress.",
      ),
    );
  }

  private async saveHealthReport(
    projectHealth: ProjectHealth,
    outputPath: string,
  ): Promise<void> {
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        overallScore: projectHealth.overallScore,
        summary: projectHealth.summary,
        recommendations: projectHealth.recommendations,
        files: projectHealth.fileAnalyses.map((file) => ({
          path: path.relative(process.cwd(), file.filePath),
          language: file.language,
          healthScore: file.healthScore,
          complexity: file.analysis.metrics?.complexity,
          maintainability: file.analysis.metrics?.maintainabilityIndex,
          technicalDebt: file.analysis.metrics?.technicalDebt,
          issueCount: file.analysis.diagnostics.length,
          securityIssues: file.issues.length,
        })),
      };

      fs.writeFileSync(
        outputPath,
        JSON.stringify(reportData, null, 2),
        "utf-8",
      );
      console.log(chalk.green(`\n💾 Health report saved to: ${outputPath}`));
    } catch (error) {
      console.error(chalk.red("Failed to save health report:"), error);
    }
  }

  private getScoreColor(score: number) {
    if (score >= 80) return chalk.green;
    if (score >= 60) return chalk.yellow;
    return chalk.red;
  }

  private getScoreEmoji(score: number): string {
    if (score >= 90) return "🎉";
    if (score >= 80) return "✅";
    if (score >= 70) return "👍";
    if (score >= 60) return "⚠️";
    if (score >= 50) return "😐";
    return "🚨";
  }

  private getComplexityColor(complexity: number) {
    if (complexity <= 10) return chalk.green;
    if (complexity <= 20) return chalk.yellow;
    return chalk.red;
  }

  private getMaintainabilityColor(index: number) {
    if (index >= 70) return chalk.green;
    if (index >= 50) return chalk.yellow;
    return chalk.red;
  }

  private getTechnicalDebtColor(debt: number) {
    if (debt <= 30) return chalk.green;
    if (debt <= 60) return chalk.yellow;
    return chalk.red;
  }

  private getCoverageColor(coverage: number) {
    if (coverage >= 80) return chalk.green;
    if (coverage >= 60) return chalk.yellow;
    return chalk.red;
  }
}
