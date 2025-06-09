import fs from "fs";
import chalk from "chalk";
import type { Change } from "diff";
import { diffWords, diffLines } from "diff";
import { AIService } from "../services/ai-service";
import { LanguageDetector } from "../analyzers/language-detector";
import { ConfigManager } from "../config/config";
import { renderMarkdown } from "../utils/render-markdown";
import { createAIProgress } from "../utils/progress-bar";
import {
  validateFileExists,
  handleFileError,
  errorHandler,
  ConfigurationError,
  AnalysisError,
} from "../utils/error-handler";

interface ComparisonResult {
  similarities: string[];
  differences: string[];
  improvements: string[];
  securityImplications: string[];
  performanceNotes: string[];
  recommendations: string[];
}

export class CompareCommand {
  private aiService: AIService;
  private configManager: ConfigManager;

  constructor() {
    this.aiService = AIService.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  public async handle(
    firstTarget: string,
    secondTarget: string,
    options: any = {},
  ): Promise<void> {
    try {
      // Validate configuration
      if (!(await this.configManager.hasValidConfig())) {
        errorHandler.handle(
          new ConfigurationError(
            "No valid configuration found. Please run: cyrus config init",
          ),
          "compare-command",
        );
        return;
      }

      // Validate inputs
      const firstContent = await this.getContent(firstTarget);
      const secondContent = await this.getContent(secondTarget);

      if (!firstContent || !secondContent) {
        return;
      }

      const progressBar = createAIProgress("code comparison", {
        theme: "modern",
        showETA: true,
      });

      progressBar.start();

      try {
        // Step 1: Generate visual diff
        progressBar.updateStage("Generating visual diff", 25);
        this.displayVisualDiff(
          firstContent,
          secondContent,
          firstTarget,
          secondTarget,
          options,
        );

        // Step 2: AI-powered analysis
        progressBar.updateStage("Analyzing with AI", 50);
        const aiAnalysis = await this.generateAIAnalysis(
          firstContent,
          secondContent,
          firstTarget,
          secondTarget,
        );

        progressBar.updateStage("Processing results", 75);

        // Step 3: Display AI insights
        progressBar.updateStage("Finalizing comparison", 100);
        progressBar.complete("Comparison analysis completed");
        console.log(); // Add spacing after progress bar

        await this.displayAIAnalysis(aiAnalysis, options);

        // Additional analysis based on options
        if (options.detailed) {
          await this.displayDetailedAnalysis(
            firstContent,
            secondContent,
            firstTarget,
            secondTarget,
          );
        }

        if (options.security) {
          await this.displaySecurityComparison(
            firstContent,
            secondContent,
            firstTarget,
            secondTarget,
          );
        }
      } catch (error) {
        progressBar.fail("Comparison failed");
        console.log(); // Add spacing after progress bar
        errorHandler.handle(
          new AnalysisError(
            `Comparison failed: ${(error as Error).message}`,
            `${firstTarget} vs ${secondTarget}`,
          ),
          "compare-command",
        );
      }
    } catch (error) {
      errorHandler.handle(error as Error, "compare-command");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  private async getContent(target: string): Promise<string | null> {
    try {
      // Check if it's a file path
      if (fs.existsSync(target)) {
        validateFileExists(target);
        if (!LanguageDetector.isSupported(target)) {
          throw new AnalysisError(
            `Unsupported file type: ${target}. Supported extensions: ${LanguageDetector.getSupportedExtensions().join(", ")}`,
            target,
          );
        }
        return fs.readFileSync(target, "utf-8");
      } else {
        // Treat as raw code content
        return target;
      }
    } catch (error) {
      handleFileError(error as Error, target);
      return null;
    }
  }

  private displayVisualDiff(
    firstContent: string,
    secondContent: string,
    firstName: string,
    secondName: string,
    options: any,
  ): void {
    console.log(
      chalk.cyan(`\n🔍 Code Comparison: ${firstName} vs ${secondName}`),
    );
    console.log(chalk.gray("═".repeat(80)));

    if (options.words) {
      this.displayWordDiff(firstContent, secondContent);
    } else {
      this.displayLineDiff(firstContent, secondContent);
    }
  }

  private displayLineDiff(firstContent: string, secondContent: string): void {
    const diff = diffLines(firstContent, secondContent);
    let lineNumber1 = 1;
    let lineNumber2 = 1;

    console.log(chalk.cyan("\n📋 Line-by-line Comparison:"));
    console.log(chalk.gray("─".repeat(60)));

    diff.forEach((part: Change) => {
      const lines = part.value.split("\n");
      if (lines[lines.length - 1] === "") {
        lines.pop(); // Remove empty last line
      }

      lines.forEach((line) => {
        if (part.added) {
          console.log(
            chalk.green(`+ ${lineNumber2.toString().padStart(3)} │ ${line}`),
          );
          lineNumber2++;
        } else if (part.removed) {
          console.log(
            chalk.red(`- ${lineNumber1.toString().padStart(3)} │ ${line}`),
          );
          lineNumber1++;
        } else {
          console.log(
            chalk.gray(`  ${lineNumber1.toString().padStart(3)} │ ${line}`),
          );
          lineNumber1++;
          lineNumber2++;
        }
      });
    });
  }

  private displayWordDiff(firstContent: string, secondContent: string): void {
    const diff = diffWords(firstContent, secondContent);

    console.log(chalk.cyan("\n📝 Word-by-word Comparison:"));
    console.log(chalk.gray("─".repeat(60)));

    diff.forEach((part: Change) => {
      if (part.added) {
        process.stdout.write(chalk.green.bold(part.value));
      } else if (part.removed) {
        process.stdout.write(chalk.red.strikethrough(part.value));
      } else {
        process.stdout.write(chalk.white(part.value));
      }
    });
    console.log("\n");
  }

  private async generateAIAnalysis(
    firstContent: string,
    secondContent: string,
    firstName: string,
    secondName: string,
  ): Promise<ComparisonResult> {
    const prompt = `
You are an expert code analyst. Compare these two code snippets and provide detailed insights:

**First Code (${firstName}):**
\`\`\`
${firstContent}
\`\`\`

**Second Code (${secondName}):**
\`\`\`
${secondContent}
\`\`\`

Analyze and provide:

1. **Key Similarities**: What patterns, structures, or approaches are shared?
2. **Key Differences**: What are the main differences in implementation, style, or logic?
3. **Improvements**: Which version is better and why? What improvements does one have over the other?
4. **Security Implications**: Any security-related differences between the two versions?
5. **Performance Notes**: Performance implications of the differences?
6. **Recommendations**: Specific actionable recommendations for improving either version?

Format your response using markdown for better readability.
Provide specific line references where applicable.
Be detailed but concise, focusing on the most important insights.
    `;

    try {
      const response = await this.aiService.analyzeCode(
        prompt,
        "code-comparison",
      );

      // Parse the response into structured format
      return this.parseAIResponse(response);
    } catch (error) {
      throw new Error(`AI analysis failed: ${(error as Error).message}`);
    }
  }

  private parseAIResponse(response: string): ComparisonResult {
    // Simple parsing - in a real implementation, you might want more sophisticated parsing
    const similarities = this.extractSection(response, "similarities") || [];
    const differences = this.extractSection(response, "differences") || [];
    const improvements = this.extractSection(response, "improvements") || [];
    const securityImplications =
      this.extractSection(response, "security") || [];
    const performanceNotes = this.extractSection(response, "performance") || [];
    const recommendations =
      this.extractSection(response, "recommendations") || [];

    return {
      similarities,
      differences,
      improvements,
      securityImplications,
      performanceNotes,
      recommendations,
    };
  }

  private extractSection(text: string, sectionName: string): string[] {
    const lines = text.split("\n");
    const items: string[] = [];
    let inSection = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check if we're entering the section
      if (
        trimmedLine.toLowerCase().includes(sectionName.toLowerCase()) &&
        (trimmedLine.startsWith("#") || trimmedLine.startsWith("**"))
      ) {
        inSection = true;
        continue;
      }

      // Check if we're leaving the section (another header)
      if (
        inSection &&
        (trimmedLine.startsWith("#") || trimmedLine.startsWith("**")) &&
        !trimmedLine.toLowerCase().includes(sectionName.toLowerCase())
      ) {
        inSection = false;
        continue;
      }

      // Extract bullet points or numbered items
      if (
        inSection &&
        (trimmedLine.startsWith("-") ||
          trimmedLine.startsWith("*") ||
          trimmedLine.startsWith("•") ||
          /^\d+\./.test(trimmedLine))
      ) {
        const cleanItem = trimmedLine
          .replace(/^[-*•\d.]\s*/, "")
          .replace(/^\*\*(.+?)\*\*:?\s*/, "$1: ");
        if (cleanItem.length > 5) {
          items.push(cleanItem);
        }
      }
    }

    return items;
  }

  private async displayAIAnalysis(
    analysis: ComparisonResult,
    options: any,
  ): Promise<void> {
    if (options.json) {
      console.log(chalk.cyan("\n🤖 AI Comparison Analysis:"));
      console.log(JSON.stringify(analysis, null, 2));
      return;
    }

    // Create comprehensive markdown report
    const markdownReport = `
## 🤖 AI-Powered Comparison Analysis

### 🔗 Key Similarities
${analysis.similarities.map((item) => `• ${item}`).join("\n") || "• No significant similarities identified"}

### 🔄 Key Differences  
${analysis.differences.map((item) => `• ${item}`).join("\n") || "• No significant differences identified"}

### 🚀 Improvements & Recommendations
${analysis.improvements.map((item) => `• ${item}`).join("\n") || "• No specific improvements identified"}

### 🔒 Security Implications
${analysis.securityImplications.map((item) => `• ${item}`).join("\n") || "• No security implications identified"}

### ⚡ Performance Notes
${analysis.performanceNotes.map((item) => `• ${item}`).join("\n") || "• No performance implications identified"}

### 💡 Expert Recommendations
${analysis.recommendations.map((item) => `• ${item}`).join("\n") || "• No specific recommendations"}

---
*Analysis powered by AI - Review suggestions carefully before implementation*
    `;

    console.log(await renderMarkdown(markdownReport));
  }

  private async displayDetailedAnalysis(
    firstContent: string,
    secondContent: string,
    _firstName: string,
    _secondName: string,
  ): Promise<void> {
    console.log(chalk.cyan("\n📊 Detailed Code Metrics Comparison:"));
    console.log(chalk.gray("─".repeat(60)));

    // Basic metrics comparison
    const firstLines = firstContent.split("\n").length;
    const secondLines = secondContent.split("\n").length;
    const firstChars = firstContent.length;
    const secondChars = secondContent.length;

    console.log(chalk.white("Code Size Comparison:"));
    console.log(
      `  ${"First".padEnd(20)} │ ${firstLines.toString().padStart(6)} lines │ ${firstChars.toString().padStart(8)} chars`,
    );
    console.log(
      `  ${"Second".padEnd(20)} │ ${secondLines.toString().padStart(6)} lines │ ${secondChars.toString().padStart(8)} chars`,
    );

    const lineDiff = secondLines - firstLines;
    const charDiff = secondChars - firstChars;
    const diffColor = lineDiff > 0 ? chalk.red : chalk.green;

    console.log(
      `  ${"Difference".padEnd(20)} │ ${diffColor(`${lineDiff > 0 ? "+" : ""}${lineDiff}`).padStart(6)} lines │ ${diffColor(`${charDiff > 0 ? "+" : ""}${charDiff}`).padStart(8)} chars`,
    );

    // Complexity indicators
    const firstComplexity = this.calculateSimpleComplexity(firstContent);
    const secondComplexity = this.calculateSimpleComplexity(secondContent);

    console.log(chalk.white("\nComplexity Indicators:"));
    console.log(
      `  ${"First".padEnd(20)} │ ${firstComplexity.functions} functions │ ${firstComplexity.conditions} conditions │ ${firstComplexity.loops} loops`,
    );
    console.log(
      `  ${"Second".padEnd(20)} │ ${secondComplexity.functions} functions │ ${secondComplexity.conditions} conditions │ ${secondComplexity.loops} loops`,
    );
  }

  private calculateSimpleComplexity(content: string): {
    functions: number;
    conditions: number;
    loops: number;
  } {
    const functions = (content.match(/function\s+\w+|=>\s*\{|def\s+\w+/g) || [])
      .length;
    const conditions = (content.match(/if\s*\(|switch\s*\(|case\s+/g) || [])
      .length;
    const loops = (content.match(/for\s*\(|while\s*\(|forEach/g) || []).length;

    return { functions, conditions, loops };
  }

  private async displaySecurityComparison(
    firstContent: string,
    secondContent: string,
    _firstName: string,
    _secondName: string,
  ): Promise<void> {
    console.log(chalk.cyan("\n🔒 Security Comparison Analysis:"));
    console.log(chalk.gray("─".repeat(60)));

    const firstSecurity = this.analyzeSecurityPatterns(firstContent);
    const secondSecurity = this.analyzeSecurityPatterns(secondContent);

    console.log(chalk.white("Security Pattern Detection:"));

    const patterns = [
      "hardcodedSecrets",
      "sqlInjection",
      "xssVulnerable",
      "insecureHttp",
      "evalUsage",
    ];

    patterns.forEach((pattern) => {
      const first = firstSecurity[pattern] || 0;
      const second = secondSecurity[pattern] || 0;

      if (first > 0 || second > 0) {
        const patternName = pattern.replace(/([A-Z])/g, " $1").toLowerCase();
        console.log(
          `  ${patternName.padEnd(20)} │ ${first.toString().padStart(3)} │ ${second.toString().padStart(3)}`,
        );
      }
    });

    if (
      Object.values(firstSecurity).every((v) => v === 0) &&
      Object.values(secondSecurity).every((v) => v === 0)
    ) {
      console.log(chalk.green("  ✅ No obvious security patterns detected"));
    }
  }

  private analyzeSecurityPatterns(content: string): Record<string, number> {
    return {
      hardcodedSecrets: (
        content.match(
          /password\s*=\s*["'][^"']+["']|api_key\s*=\s*["'][^"']+["']|secret\s*=\s*["'][^"']+["']/gi,
        ) || []
      ).length,
      sqlInjection: (content.match(/\+.*SELECT|query\s*\+|sql\s*\+/gi) || [])
        .length,
      xssVulnerable: (content.match(/innerHTML\s*=|eval\s*\(/gi) || []).length,
      insecureHttp: (content.match(/http:\/\/(?!localhost)/gi) || []).length,
      evalUsage: (content.match(/eval\s*\(/gi) || []).length,
    };
  }
}
