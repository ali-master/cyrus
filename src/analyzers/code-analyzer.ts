import fs from "fs";
import * as ts from "typescript";
import type {
  SupportedLanguage,
  CodeMetrics,
  CodeDiagnostic,
  AnalysisResult,
} from "../types";
import { LanguageDetector } from "./language-detector";

export class CodeAnalyzer {
  private static instance: CodeAnalyzer;

  private constructor() {}

  public static getInstance(): CodeAnalyzer {
    if (!CodeAnalyzer.instance) {
      CodeAnalyzer.instance = new CodeAnalyzer();
    }
    return CodeAnalyzer.instance;
  }

  public async analyzeFile(filePath: string): Promise<AnalysisResult> {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const detection = await LanguageDetector.detectLanguage(
        filePath,
        content,
      );

      if (!detection.language) {
        throw new Error(`Unsupported file type: ${filePath}`);
      }

      const diagnostics = await this.getDiagnostics(
        content,
        filePath,
        detection.language,
      );
      const metrics = this.calculateMetrics(content, detection.language);

      return {
        diagnostics,
        metrics,
        suggestions: [], // Will be populated by AI service
      };
    } catch (error) {
      throw new Error(`Failed to analyze file ${filePath}: ${error}`);
    }
  }

  private async getDiagnostics(
    content: string,
    filePath: string,
    language: SupportedLanguage,
  ): Promise<CodeDiagnostic[]> {
    switch (language) {
      case "javascript":
      case "jsx":
        return this.getJavaScriptDiagnostics(content, filePath);
      case "typescript":
      case "tsx":
        return this.getTypeScriptDiagnostics(content, filePath);
      case "python":
        return this.getPythonDiagnostics(content, filePath);
      case "java":
        return this.getJavaDiagnostics(content, filePath);
      default:
        return this.getGenericDiagnostics(content, language);
    }
  }

  private getJavaScriptDiagnostics(
    content: string,
    filePath: string,
  ): CodeDiagnostic[] {
    const diagnostics: CodeDiagnostic[] = [];

    try {
      // Use TypeScript compiler for JavaScript analysis
      const compilerOptions: ts.CompilerOptions = {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
      };

      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
      );
      const compilerHost = this.createCompilerHost(
        filePath,
        content,
        compilerOptions,
      );
      const program = ts.createProgram(
        [filePath],
        compilerOptions,
        compilerHost,
      );

      const tsDiagnostics = [
        ...program.getSyntacticDiagnostics(sourceFile),
        ...program.getSemanticDiagnostics(sourceFile),
      ];

      for (const diagnostic of tsDiagnostics) {
        if (diagnostic.file) {
          const { line, character } =
            diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
          diagnostics.push({
            message: ts.flattenDiagnosticMessageText(
              diagnostic.messageText,
              "\n",
            ),
            line: line + 1,
            column: character + 1,
            severity:
              diagnostic.category === ts.DiagnosticCategory.Error
                ? "error"
                : "warning",
            source: "typescript",
          });
        }
      }
    } catch (error) {
      diagnostics.push({
        message: `Analysis error: ${error}`,
        line: 1,
        column: 1,
        severity: "error",
        source: "analyzer",
      });
    }

    return diagnostics;
  }

  private getTypeScriptDiagnostics(
    content: string,
    _filePath: string,
  ): CodeDiagnostic[] {
    const diagnostics: CodeDiagnostic[] = [];

    try {
      // For now, skip compiler-based diagnostics to avoid hanging
      // Just use pattern-based checks

      // Basic pattern-based checks for common issues
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Check for console.log statements
        if (trimmed.includes("console.log")) {
          diagnostics.push({
            message:
              "console.log statement found - consider using proper logging",
            line: i + 1,
            column: line.indexOf("console.log") + 1,
            severity: "warning",
            source: "typescript",
          });
        }

        // Check for any type
        if (trimmed.includes(": any") || trimmed.includes("<any>")) {
          diagnostics.push({
            message: "Avoid using 'any' type - use specific types instead",
            line: i + 1,
            column: line.indexOf("any") + 1,
            severity: "warning",
            source: "typescript",
          });
        }
      }
    } catch (error) {
      diagnostics.push({
        message: `TypeScript analysis error: ${error}`,
        line: 1,
        column: 1,
        severity: "error",
        source: "analyzer",
      });
    }

    return diagnostics;
  }

  private getPythonDiagnostics(
    content: string,
    _filePath: string,
  ): CodeDiagnostic[] {
    const diagnostics: CodeDiagnostic[] = [];

    try {
      // Basic Python syntax checking
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed === "" || trimmed.startsWith("#")) {
          continue;
        }

        // Check for syntax patterns
        if (trimmed.includes("print ") && !trimmed.includes("print(")) {
          diagnostics.push({
            message:
              "Use print() function instead of print statement (Python 3 syntax)",
            line: i + 1,
            column: line.indexOf("print") + 1,
            severity: "error",
            source: "python",
          });
        }

        // Check for common issues
        if (trimmed.match(/^(if|for|while|def|class).*[^:]$/)) {
          diagnostics.push({
            message: "Missing colon after control statement",
            line: i + 1,
            column: line.length,
            severity: "error",
            source: "python",
          });
        }
      }
    } catch (error) {
      diagnostics.push({
        message: `Python analysis error: ${error}`,
        line: 1,
        column: 1,
        severity: "error",
        source: "analyzer",
      });
    }

    return diagnostics;
  }

  private getJavaDiagnostics(
    content: string,
    _filePath: string,
  ): CodeDiagnostic[] {
    const diagnostics: CodeDiagnostic[] = [];

    try {
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Check for common Java syntax issues
        if (
          trimmed.match(/^(if|for|while)\\s*\\([^)]*\\)\\s*[^{]/) &&
          !trimmed.endsWith(";")
        ) {
          diagnostics.push({
            message: "Missing braces around control statement body",
            line: i + 1,
            column: 1,
            severity: "warning",
            source: "java",
          });
        }

        if (trimmed.includes("System.out.println") && !trimmed.endsWith(";")) {
          diagnostics.push({
            message: "Missing semicolon",
            line: i + 1,
            column: line.length,
            severity: "error",
            source: "java",
          });
        }
      }
    } catch (error) {
      diagnostics.push({
        message: `Java analysis error: ${error}`,
        line: 1,
        column: 1,
        severity: "error",
        source: "analyzer",
      });
    }

    return diagnostics;
  }

  private getGenericDiagnostics(
    content: string,
    _language: SupportedLanguage,
  ): CodeDiagnostic[] {
    const diagnostics: CodeDiagnostic[] = [];

    // Basic checks that apply to most languages
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for very long lines
      if (line.length > 120) {
        diagnostics.push({
          message: "Line too long (>120 characters)",
          line: i + 1,
          column: 121,
          severity: "warning",
          source: "style",
        });
      }

      // Check for trailing whitespace
      if (line.endsWith(" ") || line.endsWith("\\t")) {
        diagnostics.push({
          message: "Trailing whitespace",
          line: i + 1,
          column: line.length,
          severity: "info",
          source: "style",
        });
      }
    }

    return diagnostics;
  }

  private calculateMetrics(
    content: string,
    language: SupportedLanguage,
  ): CodeMetrics {
    const lines = content.split("\n");
    const nonEmptyLines = lines.filter((line) => line.trim() !== "").length;
    const commentLines = this.countCommentLines(content, language);
    const complexity = this.calculateComplexity(content, language);

    return {
      complexity,
      maintainabilityIndex: this.calculateMaintainabilityIndex(
        nonEmptyLines,
        complexity,
        commentLines,
      ),
      linesOfCode: nonEmptyLines,
      technicalDebt: this.calculateTechnicalDebt(complexity, nonEmptyLines),
      duplicateLines: this.findDuplicateLines(lines),
    };
  }

  private countCommentLines(
    content: string,
    language: SupportedLanguage,
  ): number {
    const lines = content.split("\n");
    let commentLines = 0;

    const commentPatterns = {
      javascript: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
      typescript: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
      jsx: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
      tsx: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
      python: [/^\s*#/],
      java: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
      go: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
      rust: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
      csharp: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
      php: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/, /^\s*#/],
      ruby: [/^\s*#/],
    };

    const patterns = commentPatterns[language] || [/^\s*\/\//, /^\s*#/];

    for (const line of lines) {
      if (patterns.some((pattern) => pattern.test(line))) {
        commentLines++;
      }
    }

    return commentLines;
  }

  private calculateComplexity(
    content: string,
    language: SupportedLanguage,
  ): number {
    let complexity = 1; // Base complexity

    const complexityPatterns = {
      javascript: [
        /\\bif\\b/,
        /\\belse\\b/,
        /\\bfor\\b/,
        /\\bwhile\\b/,
        /\\bswitch\\b/,
        /\\bcatch\\b/,
        /\\b\\?\\.*:\\s*/,
      ],
      typescript: [
        /\\bif\\b/,
        /\\belse\\b/,
        /\\bfor\\b/,
        /\\bwhile\\b/,
        /\\bswitch\\b/,
        /\\bcatch\\b/,
        /\\b\\?\\.*:\\s*/,
      ],
      python: [
        /\\bif\\b/,
        /\\belif\\b/,
        /\\belse\\b/,
        /\\bfor\\b/,
        /\\bwhile\\b/,
        /\\btry\\b/,
        /\\bexcept\\b/,
      ],
      java: [
        /\\bif\\b/,
        /\\belse\\b/,
        /\\bfor\\b/,
        /\\bwhile\\b/,
        /\\bswitch\\b/,
        /\\bcatch\\b/,
        /\\b\\?\\.*:\\s*/,
      ],
    };

    const patterns =
      complexityPatterns[language as keyof typeof complexityPatterns] ||
      complexityPatterns.javascript;

    for (const pattern of patterns) {
      const matches = content.match(new RegExp(pattern.source, "g"));
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private calculateMaintainabilityIndex(
    loc: number,
    complexity: number,
    commentLines: number,
  ): number {
    // Simplified maintainability index calculation
    const commentRatio = commentLines / loc;
    const complexityPenalty = complexity * 2;
    const sizePenalty = Math.log(loc) * 5;

    const index = 100 - complexityPenalty - sizePenalty + commentRatio * 10;
    return Math.max(0, Math.min(100, index));
  }

  private calculateTechnicalDebt(complexity: number, loc: number): number {
    // Estimate technical debt in minutes
    const complexityDebt = (complexity - 10) * 5; // 5 minutes per complexity point above 10
    const sizeDebt = Math.max(0, loc - 200) * 0.1; // 0.1 minutes per line above 200

    return Math.max(0, complexityDebt + sizeDebt);
  }

  private findDuplicateLines(lines: string[]): number {
    const lineMap = new Map<string, number>();
    let duplicates = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10) {
        // Only consider substantial lines
        const count = lineMap.get(trimmed) || 0;
        lineMap.set(trimmed, count + 1);
        if (count === 1) {
          // First duplicate found
          duplicates += 2; // Count original + duplicate
        } else if (count > 1) {
          // Additional duplicates
          duplicates += 1;
        }
      }
    }

    return duplicates;
  }

  private createCompilerHost(
    filePath: string,
    content: string,
    _options: ts.CompilerOptions,
  ): ts.CompilerHost {
    return {
      getSourceFile: (fileName, languageVersion) => {
        if (fileName === filePath) {
          return ts.createSourceFile(fileName, content, languageVersion, true);
        }
        // Return undefined for other files to avoid external dependencies
        return undefined;
      },
      writeFile: () => {},
      getDefaultLibFileName: () => "lib.d.ts",
      useCaseSensitiveFileNames: () => false,
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => "",
      getNewLine: () => "\n",
      fileExists: (fileName) => fileName === filePath,
      readFile: (fileName) => (fileName === filePath ? content : undefined),
      directoryExists: () => true,
      getDirectories: () => [],
    };
  }
}
