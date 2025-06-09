import ora from "ora";
import type { Ora } from "ora";
import chalk from "chalk";
import path from "path";
import fs from "fs/promises";
import { LanguageDetector } from "../analyzers/language-detector";
import { Logger } from "../utils/logger";

export class DetectCommand {
  private logger = Logger.getInstance();

  async handle(targetPath: string, options: any): Promise<void> {
    const spinner = ora();

    try {
      const resolvedPath = path.resolve(targetPath);
      const stats = await fs.stat(resolvedPath);

      if (stats.isFile()) {
        await this.detectFile(resolvedPath, spinner, options);
      } else if (stats.isDirectory()) {
        await this.detectProject(resolvedPath, spinner, options);
      }
    } catch (error) {
      this.logger.error(`Failed to analyze: ${error}`);
      process.exit(1);
    }
  }

  private async detectFile(
    filePath: string,
    spinner: Ora,
    options: any,
  ): Promise<void> {
    spinner.start(chalk.gray("Analyzing file..."));

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const result = await LanguageDetector.detectLanguage(filePath, content);

      spinner.stop();

      // Display results
      console.log(chalk.bold("\n📄 File Analysis"));
      console.log(chalk.gray("─".repeat(50)));

      console.log(`${chalk.cyan("File:")} ${path.basename(filePath)}`);

      if (result.language) {
        const languageInfo = LanguageDetector.getLanguageInfo(result.language);
        console.log(`${chalk.cyan("Language:")} ${languageInfo.name}`);
        console.log(
          `${chalk.cyan("Confidence:")} ${this.getConfidenceBar(result.confidence)} ${(result.confidence * 100).toFixed(1)}%`,
        );

        if (result.frameworks && result.frameworks.length > 0) {
          console.log(
            `${chalk.cyan("Frameworks:")} ${result.frameworks.join(", ")}`,
          );
        }

        if (result.testFrameworks && result.testFrameworks.length > 0) {
          console.log(
            `${chalk.cyan("Test Frameworks:")} ${result.testFrameworks.join(", ")}`,
          );
        }
      } else {
        console.log(chalk.yellow("⚠️  Unable to detect language"));
      }

      if (options.detailed) {
        console.log(`\n${chalk.bold("Language Features")}`);
        console.log(chalk.gray("─".repeat(50)));

        if (result.language) {
          const info = LanguageDetector.getLanguageInfo(result.language);
          console.log(
            `${chalk.cyan("Extensions:")} ${info.extensions.join(", ")}`,
          );
          console.log(
            `${chalk.cyan("Static Analysis:")} ${info.hasStaticAnalysis ? "✓" : "✗"}`,
          );
          console.log(
            `${chalk.cyan("Security Rules:")} ${info.hasSecurityRules ? "✓" : "✗"}`,
          );
          console.log(
            `${chalk.cyan("Test Frameworks:")} ${info.testFrameworks.join(", ")}`,
          );
        }
      }
    } catch (error) {
      spinner.fail(chalk.red("Failed to analyze file"));
      throw error;
    }
  }

  private async detectProject(
    projectPath: string,
    spinner: Ora,
    options: any,
  ): Promise<void> {
    spinner.start(chalk.gray("Scanning project..."));

    try {
      const projectInfo =
        await LanguageDetector.detectProjectLanguages(projectPath);

      spinner.stop();

      // Display results
      console.log(chalk.bold("\n🗂️  Project Analysis"));
      console.log(chalk.gray("─".repeat(50)));

      console.log(`${chalk.cyan("Total Files:")} ${projectInfo.totalFiles}`);

      if (projectInfo.primaryLanguage) {
        const primaryInfo = LanguageDetector.getLanguageInfo(
          projectInfo.primaryLanguage,
        );
        console.log(`${chalk.cyan("Primary Language:")} ${primaryInfo.name}`);
      }

      if (projectInfo.languages.size > 0) {
        console.log(`\n${chalk.bold("Language Distribution")}`);
        console.log(chalk.gray("─".repeat(50)));

        const sortedLanguages = Array.from(
          projectInfo.languages.entries(),
        ).sort((a, b) => b[1] - a[1]);

        const maxCount = Math.max(...projectInfo.languages.values());

        for (const [lang, count] of sortedLanguages) {
          const info = LanguageDetector.getLanguageInfo(lang);
          const percentage = (count / projectInfo.totalFiles) * 100;
          const barLength = Math.round((count / maxCount) * 30);
          const bar = "█".repeat(barLength) + "░".repeat(30 - barLength);

          console.log(
            `${info.name.padEnd(15)} ${chalk.cyan(bar)} ${count.toString().padStart(4)} files (${percentage.toFixed(1)}%)`,
          );
        }
      }

      if (projectInfo.frameworks.length > 0) {
        console.log(`\n${chalk.bold("Detected Frameworks")}`);
        console.log(chalk.gray("─".repeat(50)));
        console.log(projectInfo.frameworks.map((f) => `• ${f}`).join("\n"));
      }

      if (projectInfo.packageManagers.length > 0) {
        console.log(`\n${chalk.bold("Package Managers")}`);
        console.log(chalk.gray("─".repeat(50)));
        console.log(
          projectInfo.packageManagers.map((pm) => `• ${pm}`).join("\n"),
        );
      }

      if (projectInfo.buildTools.length > 0) {
        console.log(`\n${chalk.bold("Build Tools")}`);
        console.log(chalk.gray("─".repeat(50)));
        console.log(projectInfo.buildTools.map((bt) => `• ${bt}`).join("\n"));
      }

      if (projectInfo.testFrameworks.length > 0) {
        console.log(`\n${chalk.bold("Test Frameworks")}`);
        console.log(chalk.gray("─".repeat(50)));
        console.log(
          projectInfo.testFrameworks.map((tf) => `• ${tf}`).join("\n"),
        );
      }

      if (options.json) {
        const outputPath = options.output || "language-detection.json";
        await fs.writeFile(
          outputPath,
          JSON.stringify(
            {
              ...projectInfo,
              languages: Object.fromEntries(projectInfo.languages),
            },
            null,
            2,
          ),
        );
        console.log(`\n${chalk.green("✓")} Results saved to ${outputPath}`);
      }
    } catch (error) {
      spinner.fail(chalk.red("Failed to analyze project"));
      throw error;
    }
  }

  private getConfidenceBar(confidence: number): string {
    const filled = Math.round(confidence * 10);
    const empty = 10 - filled;

    let color = chalk.red;
    if (confidence > 0.8) color = chalk.green;
    else if (confidence > 0.6) color = chalk.yellow;

    return color("●".repeat(filled)) + chalk.gray("○".repeat(empty));
  }
}
