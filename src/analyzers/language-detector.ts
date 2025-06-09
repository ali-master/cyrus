import path from "path";
import fs from "fs/promises";
import type { SupportedLanguage } from "../types";

export interface LanguageDetectionResult {
  language: SupportedLanguage | null;
  confidence: number;
  frameworks?: string[];
  packageManager?: string;
  buildTools?: string[];
  testFrameworks?: string[];
  dependencies?: string[];
}

export interface ProjectLanguageInfo {
  primaryLanguage: SupportedLanguage | null;
  languages: Map<SupportedLanguage, number>;
  frameworks: string[];
  packageManagers: string[];
  buildTools: string[];
  testFrameworks: string[];
  totalFiles: number;
}

export class LanguageDetector {
  private static readonly LANGUAGE_MAPPINGS: Record<string, SupportedLanguage> =
    {
      ".js": "javascript",
      ".mjs": "javascript",
      ".cjs": "javascript",
      ".jsx": "jsx",
      ".ts": "typescript",
      ".tsx": "tsx",
      ".py": "python",
      ".pyw": "python",
      ".pyi": "python",
      ".java": "java",
      ".go": "go",
      ".rs": "rust",
      ".cs": "csharp",
      ".php": "php",
      ".rb": "ruby",
      ".rake": "ruby",
    };

  private static readonly LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
    javascript: [
      /require\s*\(/,
      /module\.exports/,
      /export\s+(default\s+)?/,
      /import\s+(?:\S.*)?from/,
      /console\.(log|error|warn)/,
      /\bconst\s+\w+\s*=/,
      /\blet\s+\w+\s*=/,
      /\bvar\s+\w+\s*=/,
      /=>\s*\{/,
      /\.then\s*\(/,
      /async\s+(function|\()/,
    ],
    typescript: [
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
      /:\s*\w+(\[\]|<.*>)?/,
      /as\s+\w+/,
      /enum\s+\w+/,
      /namespace\s+\w+/,
      /declare\s+(module|namespace)/,
      /<\w+(?:,\s*\w+)*>/,
      /readonly\s+\w+/,
      /public\s+\w+/,
      /private\s+\w+/,
      /protected\s+\w+/,
    ],
    python: [
      /def\s+\w+\s*\(/,
      /class\s+\w+/,
      /import\s+\w+/,
      /from\s+\w+\s+import/,
      /__init__\s*\(/,
      /if\s+__name__\s*==\s*["']__main__["']/,
      /\bself\./,
      /@\w+[\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*def/,
      /\bprint\s*\(/,
      /\blambda\s+/,
      /\bawait\s+/,
      /\basync\s+def/,
    ],
    java: [
      /public\s+class\s+\w+/,
      /private\s+\w+/,
      /public\s+static\s+void\s+main/,
      /@\w+/,
      /package\s+[\w.]+;/,
      /import\s+[\w.*]+;/,
      /extends\s+\w+/,
      /implements\s+\w+/,
      /\bnew\s+\w+\s*\(/,
      /System\.out\.print/,
    ],
    go: [
      /package\s+\w+/,
      /func\s+\w+\s*\(/,
      /import\s+\(/,
      /type\s+\w+\s+struct/,
      /var\s+\w+\s+\w+/,
      /:\s*=\s*/,
      /defer\s+/,
      /go\s+\w+\(/,
      /chan\s+\w+/,
      /range\s+\w+/,
    ],
    rust: [
      /fn\s+\w+\s*\(/,
      /let\s+mut\s+/,
      /use\s+\w+::/,
      /struct\s+\w+/,
      /impl\s+\w+/,
      /pub\s+(fn|struct|enum)/,
      /match\s+\w+/,
      /Some\(|None/,
      /Ok\(|Err\(/,
      /\bmacro_rules!/,
    ],
    csharp: [
      /using\s+[\w.]+;/,
      /namespace\s+[\w.]+/,
      /class\s+\w+/,
      /public\s+(class|interface|enum)/,
      /private\s+\w+/,
      /static\s+void\s+Main/,
      /\[\w+\]/,
      /async\s+Task/,
      /=>\s*\{/,
      /var\s+\w+\s*=/,
    ],
    php: [
      /<\?php/,
      /\$\w+\s*=/,
      /function\s+\w+\s*\(/,
      /class\s+\w+/,
      /namespace\s+[\w\\]+;/,
      /use\s+[\w\\]+;/,
      /public\s+function/,
      /private\s+function/,
      /->\w+\(/,
      /::\w+\(/,
    ],
    ruby: [
      /def\s+\w+/,
      /class\s+\w+/,
      /module\s+\w+/,
      /require\s+["']/,
      /attr_(reader|writer|accessor)/,
      /\bdo\s*\|/,
      /\bend\b/,
      /\|\w+\|/,
      /@\w+\s*=/,
      /puts\s+/,
    ],
    jsx: [
      /<\w[^>]*>/,
      /<\/\w+>/,
      /className=/,
      /onClick=/,
      /useState\(/,
      /useEffect\(/,
      /return\s*\(/,
      /\.jsx/,
    ],
    tsx: [
      /<\w[^>]*>/,
      /<\/\w+>/,
      /interface\s+\w+Props/,
      /:\s*React\.FC/,
      /useState<\w+>\(/,
      /className=/,
      /\.tsx/,
    ],
  };

  private static readonly FRAMEWORK_PATTERNS: Record<string, RegExp[]> = {
    // JavaScript/TypeScript frameworks
    react: [
      /import.*from\s*["']react["']/,
      /React\./,
      /useState\(/,
      /useEffect\(/,
    ],
    vue: [/import.*from\s*["']vue["']/, /Vue\./, /<template>/, /v-model/],
    angular: [
      /@Component/,
      /@Injectable/,
      /import.*from\s*["']@angular/,
      /ngOnInit/,
    ],
    express: [/express\(\)/, /app\.(get|post|put|delete)/, /import.*express/],
    nextjs: [
      /next\//,
      /getServerSideProps/,
      /getStaticProps/,
      /_app\.(js|tsx)/,
    ],
    nestjs: [/@Module/, /@Controller/, /@Injectable/, /import.*@nestjs/],

    // Python frameworks
    django: [/from\s+django/, /models\.Model/, /views\.py/, /urls\.py/],
    flask: [/from\s+flask/, /Flask\(__name__\)/, /@app\.route/],
    fastapi: [/from\s+fastapi/, /FastAPI\(/, /@app\.(get|post)/],
    pytest: [/import\s+pytest/, /@pytest\./, /def\s+test_/],

    // Java frameworks
    spring: [
      /@SpringBootApplication/,
      /@RestController/,
      /@Service/,
      /import\s+org\.springframework/,
    ],
    junit: [/@Test/, /import\s+org\.junit/, /@Before/, /@After/],

    // Other frameworks
    rails: [
      /class\s+\w+\s*<\s*ApplicationController/,
      /ActiveRecord::Base/,
      /Rails\.application/,
    ],
  };

  private static readonly BUILD_TOOL_PATTERNS: Record<string, string[]> = {
    // JavaScript/TypeScript
    npm: ["package.json", "package-lock.json"],
    yarn: ["yarn.lock", ".yarnrc"],
    pnpm: ["pnpm-lock.yaml", ".pnpmfile.cjs"],
    bun: ["bun.lockb", "bunfig.toml"],

    // Python
    pip: ["requirements.txt", "setup.py"],
    pipenv: ["Pipfile", "Pipfile.lock"],
    poetry: ["pyproject.toml", "poetry.lock"],

    // Java
    maven: ["pom.xml"],
    gradle: ["build.gradle", "build.gradle.kts", "settings.gradle"],

    // Go
    gomod: ["go.mod", "go.sum"],

    // Rust
    cargo: ["Cargo.toml", "Cargo.lock"],

    // Ruby
    bundler: ["Gemfile", "Gemfile.lock"],

    // PHP
    composer: ["composer.json", "composer.lock"],

    // C#
    nuget: ["packages.config", "*.csproj"],
  };

  public static async detectLanguage(
    filePath: string,
    content?: string,
  ): Promise<LanguageDetectionResult> {
    const ext = path.extname(filePath).toLowerCase();
    const result: LanguageDetectionResult = {
      language: null,
      confidence: 0,
      frameworks: [],
      testFrameworks: [],
    };

    // First, try to detect by file extension
    if (this.LANGUAGE_MAPPINGS[ext]) {
      result.language = this.LANGUAGE_MAPPINGS[ext];
      result.confidence = 0.8; // High confidence for extension match
    }

    // If no extension match or content is provided, analyze content
    if (!result.language || content) {
      const contentResult = await this.detectByContent(content || "", filePath);
      if (contentResult.language) {
        if (!result.language) {
          result.language = contentResult.language;
          result.confidence = contentResult.confidence;
        } else if (result.language === contentResult.language) {
          // Boost confidence if both methods agree
          result.confidence = Math.min(1.0, result.confidence + 0.2);
        }
      }

      // Merge framework detection
      result.frameworks = contentResult.frameworks || [];
      result.testFrameworks = contentResult.testFrameworks || [];
    }

    return result;
  }

  private static async detectByContent(
    content: string,
    filePath: string,
  ): Promise<LanguageDetectionResult> {
    const scores: Map<SupportedLanguage, number> = new Map();
    const detectedFrameworks: Set<string> = new Set();
    const testFrameworks: Set<string> = new Set();

    // Analyze language patterns
    for (const [language, patterns] of Object.entries(this.LANGUAGE_PATTERNS)) {
      let matches = 0;
      const totalPatterns = patterns.length;

      for (const pattern of patterns) {
        const matchCount = (content.match(pattern) || []).length;
        if (matchCount > 0) {
          matches += Math.min(matchCount / 10, 1); // Normalize frequent matches
        }
      }

      const score = matches / totalPatterns;
      if (score > 0) {
        scores.set(language as SupportedLanguage, score);
      }
    }

    // Detect frameworks
    for (const [framework, patterns] of Object.entries(
      this.FRAMEWORK_PATTERNS,
    )) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          detectedFrameworks.add(framework);

          // Categorize test frameworks
          if (
            ["pytest", "junit", "jest", "mocha", "vitest"].includes(framework)
          ) {
            testFrameworks.add(framework);
          }
          break;
        }
      }
    }

    // Special file name patterns
    const fileName = path.basename(filePath);
    if (fileName.match(/test|spec/i)) {
      // Boost confidence for test files
      if (fileName.match(/\.spec\.(js|ts|jsx|tsx)$/)) {
        detectedFrameworks.add("jest");
        testFrameworks.add("jest");
      } else if (fileName.match(/test_.*\.py$/)) {
        detectedFrameworks.add("pytest");
        testFrameworks.add("pytest");
      }
    }

    // Find the language with highest score
    let maxScore = 0;
    let detectedLanguage: SupportedLanguage | null = null;

    for (const [lang, score] of scores.entries()) {
      if (score > maxScore) {
        maxScore = score;
        detectedLanguage = lang;
      }
    }

    // Calculate confidence based on score and pattern matches
    let confidence = 0;
    if (detectedLanguage) {
      confidence = Math.min(maxScore * 0.8, 0.95); // Cap at 0.95 for content-only detection

      // Boost confidence if frameworks match the language
      const languageFrameworks = this.getLanguageFrameworks(detectedLanguage);
      const matchingFrameworks = Array.from(detectedFrameworks).filter((f) =>
        languageFrameworks.includes(f),
      );

      if (matchingFrameworks.length > 0) {
        confidence = Math.min(confidence + 0.1, 0.99);
      }
    }

    return {
      language: confidence > 0.3 ? detectedLanguage : null, // Minimum threshold
      confidence,
      frameworks: Array.from(detectedFrameworks),
      testFrameworks: Array.from(testFrameworks),
    };
  }

  private static getLanguageFrameworks(language: SupportedLanguage): string[] {
    const frameworkMap: Record<SupportedLanguage, string[]> = {
      javascript: [
        "react",
        "vue",
        "angular",
        "express",
        "nextjs",
        "jest",
        "mocha",
        "vitest",
      ],
      typescript: [
        "react",
        "vue",
        "angular",
        "express",
        "nextjs",
        "nestjs",
        "jest",
        "vitest",
      ],
      jsx: ["react", "nextjs", "jest"],
      tsx: ["react", "nextjs", "jest"],
      python: ["django", "flask", "fastapi", "pytest"],
      java: ["spring", "junit"],
      go: [],
      rust: [],
      csharp: [],
      php: [],
      ruby: ["rails"],
    };

    return frameworkMap[language] || [];
  }

  public static getSupportedExtensions(): string[] {
    return Object.keys(this.LANGUAGE_MAPPINGS);
  }

  public static isSupported(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext in this.LANGUAGE_MAPPINGS;
  }

  public static async detectProjectLanguages(
    projectPath: string,
  ): Promise<ProjectLanguageInfo> {
    const languageCounts = new Map<SupportedLanguage, number>();
    const allFrameworks = new Set<string>();
    const allTestFrameworks = new Set<string>();
    const packageManagers = new Set<string>();
    const buildTools = new Set<string>();
    let totalFiles = 0;

    try {
      // Detect build tools and package managers
      for (const [tool, files] of Object.entries(this.BUILD_TOOL_PATTERNS)) {
        for (const file of files) {
          try {
            await fs.access(path.join(projectPath, file));
            if (
              [
                "npm",
                "yarn",
                "pnpm",
                "bun",
                "pip",
                "pipenv",
                "poetry",
                "bundler",
                "composer",
              ].includes(tool)
            ) {
              packageManagers.add(tool);
            } else {
              buildTools.add(tool);
            }
          } catch {
            // File doesn't exist, continue
          }
        }
      }

      // Scan project files (simplified for this example)
      const scanDirectory = async (dir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          // Skip common directories
          if (entry.isDirectory()) {
            if (
              ![
                "node_modules",
                ".git",
                "dist",
                "build",
                "target",
                "__pycache__",
              ].includes(entry.name)
            ) {
              await scanDirectory(fullPath);
            }
          } else if (entry.isFile() && this.isSupported(fullPath)) {
            totalFiles++;

            try {
              const content = await fs.readFile(fullPath, "utf-8");
              const result = await this.detectLanguage(fullPath, content);

              if (result.language) {
                languageCounts.set(
                  result.language,
                  (languageCounts.get(result.language) || 0) + 1,
                );

                result.frameworks?.forEach((f) => allFrameworks.add(f));
                result.testFrameworks?.forEach((f) => allTestFrameworks.add(f));
              }
            } catch {
              // Error reading file, skip
            }
          }
        }
      };

      await scanDirectory(projectPath);
    } catch (error) {
      // Handle error
    }

    // Determine primary language
    let primaryLanguage: SupportedLanguage | null = null;
    let maxCount = 0;

    for (const [lang, count] of languageCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        primaryLanguage = lang;
      }
    }

    return {
      primaryLanguage,
      languages: languageCounts,
      frameworks: Array.from(allFrameworks),
      packageManagers: Array.from(packageManagers),
      buildTools: Array.from(buildTools),
      testFrameworks: Array.from(allTestFrameworks),
      totalFiles,
    };
  }

  public static getLanguageInfo(language: SupportedLanguage): LanguageInfo {
    const info: Record<SupportedLanguage, LanguageInfo> = {
      javascript: {
        name: "JavaScript",
        extensions: [".js", ".mjs", ".cjs"],
        hasStaticAnalysis: true,
        hasSecurityRules: true,
        testFrameworks: ["jest", "mocha", "vitest", "bun"],
      },
      typescript: {
        name: "TypeScript",
        extensions: [".ts"],
        hasStaticAnalysis: true,
        hasSecurityRules: true,
        testFrameworks: ["jest", "vitest", "deno", "bun"],
      },
      jsx: {
        name: "React JSX",
        extensions: [".jsx"],
        hasStaticAnalysis: true,
        hasSecurityRules: true,
        testFrameworks: ["jest", "testing-library"],
      },
      tsx: {
        name: "React TSX",
        extensions: [".tsx"],
        hasStaticAnalysis: true,
        hasSecurityRules: true,
        testFrameworks: ["jest", "testing-library"],
      },
      python: {
        name: "Python",
        extensions: [".py", ".pyw"],
        hasStaticAnalysis: true,
        hasSecurityRules: true,
        testFrameworks: ["pytest", "unittest"],
      },
      java: {
        name: "Java",
        extensions: [".java"],
        hasStaticAnalysis: true,
        hasSecurityRules: true,
        testFrameworks: ["junit", "testng"],
      },
      go: {
        name: "Go",
        extensions: [".go"],
        hasStaticAnalysis: true,
        hasSecurityRules: true,
        testFrameworks: ["go test"],
      },
      rust: {
        name: "Rust",
        extensions: [".rs"],
        hasStaticAnalysis: true,
        hasSecurityRules: true,
        testFrameworks: ["cargo test"],
      },
      csharp: {
        name: "C#",
        extensions: [".cs"],
        hasStaticAnalysis: true,
        hasSecurityRules: true,
        testFrameworks: ["nunit", "xunit"],
      },
      php: {
        name: "PHP",
        extensions: [".php"],
        hasStaticAnalysis: true,
        hasSecurityRules: true,
        testFrameworks: ["phpunit"],
      },
      ruby: {
        name: "Ruby",
        extensions: [".rb"],
        hasStaticAnalysis: true,
        hasSecurityRules: true,
        testFrameworks: ["rspec", "minitest"],
      },
    };

    return info[language];
  }
}

interface LanguageInfo {
  name: string;
  extensions: string[];
  hasStaticAnalysis: boolean;
  hasSecurityRules: boolean;
  testFrameworks: string[];
}
