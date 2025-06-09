import chalk from "chalk";

interface ProgressStage {
  name: string;
  emoji?: string;
  weight?: number; // Relative weight for timing (default: 1)
}

interface ProgressOptions {
  total?: number;
  showPercentage?: boolean;
  showETA?: boolean;
  showSpeed?: boolean;
  barLength?: number;
  theme?: "default" | "modern" | "minimal" | "gradient";
}

export class ProgressBar {
  private stages: ProgressStage[];
  private currentStage: number = 0;
  private currentProgress: number = 0;
  private startTime: number;
  private lastUpdateTime: number;
  private processedItems: number = 0;
  private options: Required<ProgressOptions>;
  private intervalId?: NodeJS.Timeout;
  private isActive: boolean = false;

  // Animation frames for different themes
  private readonly themes = {
    default: {
      frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
      completed: "█",
      incomplete: "░",
      colors: {
        progress: chalk.cyan,
        percentage: chalk.yellow,
        eta: chalk.gray,
        stage: chalk.green,
      },
    },
    modern: {
      frames: ["●", "○", "◐", "◓", "◑", "◒"],
      completed: "▓",
      incomplete: "▒",
      colors: {
        progress: chalk.magenta,
        percentage: chalk.cyan,
        eta: chalk.gray,
        stage: chalk.blue,
      },
    },
    minimal: {
      frames: ["-", "\\", "|", "/"],
      completed: "=",
      incomplete: "-",
      colors: {
        progress: chalk.white,
        percentage: chalk.white,
        eta: chalk.gray,
        stage: chalk.white,
      },
    },
    gradient: {
      frames: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"],
      completed: "🟩",
      incomplete: "⬜",
      colors: {
        progress: chalk.green,
        percentage: chalk.yellow,
        eta: chalk.gray,
        stage: chalk.blue,
      },
    },
  };

  private frameIndex: number = 0;

  constructor(stages: ProgressStage[], options: ProgressOptions = {}) {
    this.stages = stages.map((stage) => ({
      weight: 1,
      ...stage,
    }));

    this.options = {
      total: this.calculateTotalWeight(),
      showPercentage: true,
      showETA: true,
      showSpeed: false,
      barLength: 30,
      theme: "gradient",
      ...options,
    };

    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
  }

  private calculateTotalWeight(): number {
    return this.stages.reduce((sum, stage) => sum + (stage.weight || 1), 0);
  }

  public start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;

    // Start animation
    this.intervalId = setInterval(() => {
      this.frameIndex =
        (this.frameIndex + 1) % this.themes[this.options.theme].frames.length;
      this.render();
    }, 100);

    this.render();
  }

  public updateStage(stageName: string, progress: number = 0): void {
    const stageIndex = this.stages.findIndex((s) => s.name === stageName);
    if (stageIndex === -1) return;

    this.currentStage = stageIndex;
    this.currentProgress = Math.max(0, Math.min(100, progress));
    this.lastUpdateTime = Date.now();

    if (this.isActive) {
      this.render();
    }
  }

  public updateProgress(progress: number, itemsProcessed?: number): void {
    this.currentProgress = Math.max(0, Math.min(100, progress));
    if (itemsProcessed !== undefined) {
      this.processedItems = itemsProcessed;
    }
    this.lastUpdateTime = Date.now();

    if (this.isActive) {
      this.render();
    }
  }

  public incrementStage(progress: number = 100): void {
    if (this.currentStage < this.stages.length - 1) {
      this.currentStage++;
      this.currentProgress = Math.max(0, Math.min(100, progress));
      this.lastUpdateTime = Date.now();

      if (this.isActive) {
        this.render();
      }
    }
  }

  public complete(message?: string): void {
    if (!this.isActive) return;

    this.isActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Clear current line and show completion
    process.stdout.write("\r\x1B[K");

    const theme = this.themes[this.options.theme];
    const completionEmoji = this.getCompletionEmoji();
    const finalMessage = message || "Complete!";
    const totalTime = this.formatTime((Date.now() - this.startTime) / 1000);

    console.log(
      `${completionEmoji} ${theme.colors.stage.bold(finalMessage)} ${theme.colors.eta(`(${totalTime})`)}`,
    );
  }

  public fail(message?: string): void {
    if (!this.isActive) return;

    this.isActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Clear current line and show failure
    process.stdout.write("\r\x1B[K");

    const theme = this.themes[this.options.theme];
    const failMessage = message || "Failed!";
    const totalTime = this.formatTime((Date.now() - this.startTime) / 1000);

    console.log(
      `❌ ${chalk.red.bold(failMessage)} ${theme.colors.eta(`(${totalTime})`)}`,
    );
  }

  private render(): void {
    if (!this.isActive) return;

    const theme = this.themes[this.options.theme];
    const currentStage = this.stages[this.currentStage];

    // Calculate overall progress
    const stageWeight = this.stages
      .slice(0, this.currentStage)
      .reduce((sum, s) => sum + (s.weight || 1), 0);
    const currentStageProgress =
      ((currentStage?.weight || 1) * this.currentProgress) / 100;
    const overallProgress =
      ((stageWeight + currentStageProgress) / this.options.total) * 100;

    // Build progress bar
    const completed = Math.floor(
      (overallProgress / 100) * this.options.barLength,
    );
    const progressBar =
      theme.completed.repeat(completed) +
      theme.incomplete.repeat(this.options.barLength - completed);

    // Build components
    const spinner = theme.frames[this.frameIndex];
    const stageEmoji = currentStage?.emoji || "📋";
    const stageName = currentStage?.name || "Processing";
    const percentage = this.options.showPercentage
      ? ` ${Math.floor(overallProgress)}%`
      : "";
    const eta = this.options.showETA ? ` ${this.getETA()}` : "";
    const speed = this.options.showSpeed ? ` ${this.getSpeed()}` : "";

    // Create styled output
    const output = [
      spinner,
      stageEmoji,
      theme.colors.stage(stageName),
      theme.colors.progress(`[${progressBar}]`),
      theme.colors.percentage(percentage),
      theme.colors.eta(eta),
      speed && theme.colors.eta(speed),
    ]
      .filter(Boolean)
      .join(" ");

    // Update current line
    process.stdout.write(`\r\x1B[K${output}`);
  }

  private getETA(): string {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const currentStage = this.stages[this.currentStage];

    if (elapsed < 1 || !currentStage) return "";

    // Calculate progress-based ETA
    const stageWeight = this.stages
      .slice(0, this.currentStage)
      .reduce((sum, s) => sum + (s.weight || 1), 0);
    const currentStageProgress =
      ((currentStage.weight || 1) * this.currentProgress) / 100;
    const overallProgress =
      (stageWeight + currentStageProgress) / this.options.total;

    if (overallProgress <= 0) return "";

    const totalEstimated = elapsed / overallProgress;
    const remaining = Math.max(0, totalEstimated - elapsed);

    return `ETA: ${this.formatTime(remaining)}`;
  }

  private getSpeed(): string {
    const elapsed = (Date.now() - this.startTime) / 1000;
    if (elapsed < 1 || this.processedItems === 0) return "";

    const itemsPerSecond = this.processedItems / elapsed;
    if (itemsPerSecond < 1) {
      return `${(itemsPerSecond * 60).toFixed(1)}/min`;
    }
    return `${itemsPerSecond.toFixed(1)}/s`;
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }

  private getCompletionEmoji(): string {
    const emojis = ["✅", "🎉", "🚀", "⭐", "💯"];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }
}

// Convenience function for simple progress bars
export function createProgressBar(
  stages: (string | ProgressStage)[],
  options: ProgressOptions = {},
): ProgressBar {
  const formattedStages: ProgressStage[] = stages.map((stage) =>
    typeof stage === "string" ? { name: stage } : stage,
  );

  return new ProgressBar(formattedStages, options);
}

// Convenience function for file processing progress
export function createFileProcessingProgress(
  totalFiles: number,
  options: ProgressOptions = {},
): ProgressBar {
  const stages: ProgressStage[] = [
    { name: "Scanning files", emoji: "🔍", weight: 1 },
    { name: "Analyzing code", emoji: "⚙️", weight: totalFiles * 2 },
    { name: "Generating insights", emoji: "🧠", weight: 2 },
    { name: "Finalizing report", emoji: "📊", weight: 1 },
  ];

  return new ProgressBar(stages, {
    theme: "modern",
    showETA: true,
    ...options,
  });
}

// Convenience function for AI processing progress
export function createAIProgress(
  operation: string,
  options: ProgressOptions = {},
): ProgressBar {
  const stages: ProgressStage[] = [
    { name: `Preparing ${operation}`, emoji: "🔧", weight: 1 },
    { name: "Processing with AI", emoji: "🤖", weight: 5 },
    { name: "Formatting results", emoji: "✨", weight: 1 },
  ];

  return new ProgressBar(stages, {
    theme: "gradient",
    showETA: true,
    ...options,
  });
}

// Network/download progress
export function createNetworkProgress(
  operation: string,
  options: ProgressOptions = {},
): ProgressBar {
  const stages: ProgressStage[] = [
    { name: "Connecting", emoji: "🔗", weight: 1 },
    { name: `${operation}`, emoji: "⬇️", weight: 8 },
    { name: "Completing", emoji: "✅", weight: 1 },
  ];

  return new ProgressBar(stages, {
    theme: "modern",
    showETA: true,
    showSpeed: true,
    ...options,
  });
}

// Build/compilation progress
export function createBuildProgress(
  _buildType: string = "build",
  options: ProgressOptions = {},
): ProgressBar {
  const stages: ProgressStage[] = [
    { name: "Preparing", emoji: "🔧", weight: 1 },
    { name: "Compiling", emoji: "⚙️", weight: 6 },
    { name: "Optimizing", emoji: "⚡", weight: 2 },
    { name: "Finalizing", emoji: "📦", weight: 1 },
  ];

  return new ProgressBar(stages, {
    theme: "gradient",
    showETA: true,
    ...options,
  });
}
