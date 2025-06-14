#!/usr/bin/env node

import { Command } from "commander";
import figlet from "figlet";
import { vice } from "gradient-string";
import chalk from "chalk";
import { ConfigCommand } from "./commands/config";
import { AnalyzeCommand } from "./commands/analyze";
import { MentorCommand } from "./commands/mentor";
import { GenerateCommand } from "./commands/generate";
import { HealthCommand } from "./commands/health";
import { DetectCommand } from "./commands/detect";
import { QualityCommand } from "./commands/quality";
import { CompareCommand } from "./commands/compare";
import { LearnCommand } from "./commands/learn";
import { ConfigManager } from "./config/config";

// Handle process termination gracefully
process.on("SIGINT", () => {
  console.log(chalk.yellow("\n\nOperation cancelled by user"));
  process.exit(0);
});

process.on("SIGTERM", () => {
  process.exit(0);
});

const program = new Command();

// Display banner only if not in quiet mode
if (!process.argv.includes("--quiet") && !process.argv.includes("-q")) {
  console.log();
  console.log(
    vice(
      figlet.textSync("CYRUS", {
        font: "ANSI Shadow",
        horizontalLayout: "default",
        verticalLayout: "default",
      }),
    ),
  );
  console.log();
  console.log(chalk.dim("  The Code Empire Analyzer"));
  console.log(
    chalk.dim("  AI-Powered Debugging & Analysis CLI for Modern Developers"),
  );
  console.log();
}

// Configure CLI
program
  .name("cyrus")
  .description("AI-Powered Code Debugging & Analysis for Developers")
  .version("1.0.0");

// Configuration command
program
  .command("config")
  .description("Configure Cyrus settings")
  .argument("[action]", "Action to perform: init, set, get, show, delete")
  .argument("[type]", "Configuration type (e.g., apikey, model, provider)")
  .argument("[value]", "Value to set")
  .action(async (action, type, value) => {
    const configCommand = new ConfigCommand();
    await configCommand.handle([action, type, value].filter(Boolean));
  });

// Detect command - NEW
program
  .command("detect <path>")
  .description("Detect programming languages, frameworks, and tools")
  .option("-d, --detailed", "Show detailed language features")
  .option("--json", "Output results in JSON format")
  .option("-o, --output <file>", "Output file for JSON results")
  .action(async (targetPath, options) => {
    const detectCommand = new DetectCommand();
    await detectCommand.handle(targetPath, options);
  });

// Analyze command
program
  .command("analyze <file>")
  .description("Analyze a source file for bugs, issues, and improvements")
  .option("-e, --explain", "Get AI explanation for errors")
  .option("-s, --security", "Include security vulnerability scan")
  .option("-m, --metrics", "Show detailed code metrics")
  .option("--json", "Output results in JSON format")
  .action(async (file, options) => {
    await checkConfig("analyze");
    const analyzeCommand = new AnalyzeCommand();
    await analyzeCommand.handle(file, options);
  });

// Mentor command
program
  .command("mentor <file>")
  .description("Get personalized code mentoring and learning guidance")
  .option("-i, --interactive", "Start interactive mentoring session")
  .option("--skip-setup", "Skip mentor session setup")
  .action(async (file, options) => {
    await checkConfig("mentor");
    const mentorCommand = new MentorCommand();
    await mentorCommand.handle(file, options);
  });

// Generate command group
const generateCommand = program
  .command("generate")
  .description("Generate code, tests, documentation, and more");

generateCommand
  .command("tests <file>")
  .description("Generate comprehensive unit tests")
  .option("--dry-run", "Preview without saving")
  .action(async (file, options) => {
    await checkConfig("generate");
    const generateCmd = new GenerateCommand();
    await generateCmd.handle("tests", file, options);
  });

generateCommand
  .command("docs <file>")
  .description("Generate comprehensive documentation")
  .option("--dry-run", "Preview without saving")
  .action(async (file, options) => {
    await checkConfig("generate");
    const generateCmd = new GenerateCommand();
    await generateCmd.handle("docs", file, options);
  });

generateCommand
  .command("refactor <file>")
  .description("Generate refactoring suggestions with before/after examples")
  .option("--dry-run", "Preview without saving")
  .option("-i, --interactive", "Interactively apply suggestions")
  .action(async (file, options) => {
    await checkConfig("generate");
    const generateCmd = new GenerateCommand();
    await generateCmd.handle("refactor", file, options);
  });

generateCommand
  .command("project <description>")
  .description("Generate complete project structure from description")
  .option("--dry-run", "Preview without creating files")
  .action(async (description, options) => {
    await checkConfig("generate");
    const generateCmd = new GenerateCommand();
    await generateCmd.handle("project", description, options);
  });

generateCommand
  .command("component <name>")
  .description("Generate code components (React, Vue, etc.)")
  .option("--dry-run", "Preview without saving")
  .action(async (name, options) => {
    await checkConfig("generate");
    const generateCmd = new GenerateCommand();
    await generateCmd.handle("component", name, options);
  });

generateCommand
  .command("config <type>")
  .description("Generate configuration files (eslint, prettier, etc.)")
  .option("--dry-run", "Preview without saving")
  .action(async (type, options) => {
    const generateCmd = new GenerateCommand();
    await generateCmd.handle("config", type, options);
  });

// Health scan command
program
  .command("health")
  .description("Comprehensive codebase health analysis")
  .option("-p, --path <path>", "Path to analyze (default: current directory)")
  .option("--detailed", "Show detailed analysis for each file")
  .option("--security", "Include security vulnerability scanning")
  .option("--parallel", "Process files in parallel for faster analysis")
  .option("--save", "Save health report to file")
  .option(
    "-o, --output <file>",
    "Output file for health report",
    "health-report.json",
  )
  .option("--trends", "Show health trends (requires historical data)")
  .action(async (options) => {
    await checkConfig("health");
    const healthCommand = new HealthCommand();
    await healthCommand.handle(options);
  });

// Quality score command
program
  .command("quality <target>")
  .description(
    "Calculate comprehensive code quality score with AI-powered recommendations",
  )
  .option("--max-files <number>", "Maximum number of files to analyze", "50")
  .option("--json", "Output results in JSON format")
  .action(async (target, options) => {
    await checkConfig("quality");
    const qualityCommand = new QualityCommand();
    await qualityCommand.handle(target, options);
  });

// Compare command - Compare two code files or snippets
program
  .command("compare <first> <second>")
  .description("Compare two code files or snippets with AI-powered analysis")
  .option("-w, --words", "Show word-by-word diff instead of line-by-line")
  .option("-d, --detailed", "Show detailed metrics comparison")
  .option("-s, --security", "Include security comparison analysis")
  .option("--json", "Output results in JSON format")
  .action(async (first, second, options) => {
    await checkConfig("compare");
    const compareCommand = new CompareCommand();
    await compareCommand.handle(first, second, options);
  });

// Learning Assistant command
program
  .command("learn")
  .description(
    "Interactive AI-powered learning assistant with tutorials and challenges",
  )
  .option("-a, --assessment", "Start with skill assessment")
  .option(
    "-c, --challenge [difficulty]",
    "Start coding challenge (easy/medium/hard)",
  )
  .option("-t, --tutorial [topic]", "Start interactive tutorial")
  .option("-p, --progress", "Show learning progress and achievements")
  .action(async (options) => {
    await checkConfig("learn");
    const learnCommand = new LearnCommand();
    await learnCommand.handle(options);
  });

// Quick commands for common tasks
program
  .command("fix <file>")
  .description("Quick fix: analyze and explain the most critical issues")
  .action(async (file) => {
    await checkConfig("fix");
    const analyzeCommand = new AnalyzeCommand();
    await analyzeCommand.handle(file, { explain: true, metrics: true });
  });

program
  .command("review <file>")
  .description("Code review: comprehensive analysis with suggestions")
  .action(async (file) => {
    await checkConfig("review");
    console.log(chalk.cyan("🔍 Comprehensive Code Review\n"));

    const analyzeCommand = new AnalyzeCommand();
    const generateCommand = new GenerateCommand();

    await analyzeCommand.handle(file, { security: true, metrics: true });
    console.log(`\n${chalk.gray("─".repeat(60))}\n`);
    await generateCommand.handle("refactor", file, { dryRun: true });
  });

program
  .command("study <file>")
  .description("Study mode: detailed mentoring with explanations")
  .action(async (file) => {
    await checkConfig("study");
    const mentorCommand = new MentorCommand();
    await mentorCommand.handle(file, { interactive: true });
  });

// Add version flag with custom handler
program
  .option("-q, --quiet", "Suppress banner output")
  .option("--no-color", "Disable colored output");

// Global error handler
program.on("command:*", () => {
  console.error(
    chalk.red("Invalid command. Use 'cyrus --help' for available commands."),
  );
  process.exit(1);
});

// Configuration validation function
async function checkConfig(commandName: string) {
  // Skip config check for config command itself and help
  if (commandName === "config" || commandName === "help") {
    return;
  }

  const configManager = ConfigManager.getInstance();
  if (!(await configManager.hasValidConfig())) {
    console.log(chalk.yellow("⚠️ No valid configuration found."));
    console.log(chalk.white("\nRun the following command to get started:\n"));
    console.log(chalk.cyan("cyrus config init"));
    console.log();
    process.exit(1);
  }
}

// Enhanced help
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name(),
});

// Add examples to help
program.addHelpText(
  "after",
  `
${chalk.bold("Examples:")}

  ${chalk.dim("Setup and configuration")}
  $ cyrus config init                    ${chalk.dim("# Setup Cyrus with your AI provider")}
  $ cyrus config set apikey sk-xxx...    ${chalk.dim("# Set your API key")}
  
  ${chalk.dim("Language detection")}
  $ cyrus detect .                       ${chalk.dim("# Detect languages in current directory")}
  $ cyrus detect src/app.ts --detailed   ${chalk.dim("# Detailed analysis of a file")}
  $ cyrus detect . --json -o langs.json  ${chalk.dim("# Export project language info")}
  
  ${chalk.dim("Code analysis")}
  $ cyrus analyze src/app.js             ${chalk.dim("# Analyze a JavaScript file")}
  $ cyrus fix src/buggy.py               ${chalk.dim("# Quick fix most critical issues")}
  $ cyrus review src/component.tsx       ${chalk.dim("# Comprehensive code review")}
  
  ${chalk.dim("Learning and mentoring")}
  $ cyrus mentor src/complex.ts          ${chalk.dim("# Get personalized code mentoring")}
  $ cyrus study src/algorithm.js         ${chalk.dim("# Study mode with detailed explanations")}
  $ cyrus learn                          ${chalk.dim("# Interactive learning assistant")}
  $ cyrus learn --challenge medium       ${chalk.dim("# Start coding challenge")}
  $ cyrus learn --tutorial               ${chalk.dim("# Interactive tutorial session")}
  
  ${chalk.dim("Code generation")}
  $ cyrus generate tests src/utils.js    ${chalk.dim("# Generate comprehensive unit tests")}
  $ cyrus generate docs src/api.py       ${chalk.dim("# Generate detailed documentation")}
  $ cyrus generate refactor src/old.js   ${chalk.dim("# Get refactoring suggestions")}
  
  ${chalk.dim("Code comparison")}
  $ cyrus compare old.js new.js          ${chalk.dim("# Compare two code files")}
  $ cyrus compare file1.py file2.py -d   ${chalk.dim("# Detailed comparison with metrics")}
  $ cyrus compare v1.ts v2.ts --security ${chalk.dim("# Include security analysis")}
  $ cyrus compare "old code" "new code"  ${chalk.dim("# Compare code snippets directly")}
  
  ${chalk.dim("Project health and quality")}
  $ cyrus health                         ${chalk.dim("# Scan entire codebase health")}
  $ cyrus health --detailed              ${chalk.dim("# Detailed health report")}
  $ cyrus quality .                      ${chalk.dim("# Calculate project quality score")}
  $ cyrus quality src/app.ts             ${chalk.dim("# Quality score for specific file")}

${chalk.dim("For more information:")} ${chalk.underline("https://github.com/ali-master/cyrus")}
`,
);

// Parse command line arguments
program
  .parseAsync(process.argv)
  .then(() => {
    // If no command was provided, show help
    if (!process.argv.slice(2).length) {
      program.outputHelp();
    }
  })
  .catch((error) => {
    console.error(chalk.red("Error:", error.message));
    process.exit(1);
  });
