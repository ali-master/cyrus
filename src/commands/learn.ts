import fs from "fs";
import path from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import { AIService } from "../services/ai-service";
import { ConfigManager } from "../config/config";
import { renderMarkdown } from "../utils/render-markdown";
import { createAIProgress } from "../utils/progress-bar";
import { errorHandler, ConfigurationError } from "../utils/error-handler";

interface LearningProfile {
  userId: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  languages: string[];
  completedTopics: string[];
  strengths: string[];
  weaknesses: string[];
  preferences: {
    learningStyle: "visual" | "hands-on" | "theoretical" | "mixed";
    difficulty: "easy" | "medium" | "hard" | "adaptive";
    focus: string[];
  };
  progress: {
    totalSessions: number;
    totalChallenges: number;
    successRate: number;
    lastSessionDate: string;
  };
}

interface LearningTopic {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  language: string;
  concepts: string[];
  prerequisite?: string[];
  estimatedTime: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  language: string;
  startingCode: string;
  expectedOutput?: string;
  hints: string[];
  solution: string;
  testCases: Array<{ input: string; expected: string }>;
}

interface _LearningSession {
  topic: LearningTopic;
  challenges: Challenge[];
  userProgress: {
    currentChallenge: number;
    attempts: number;
    hintsUsed: number;
    startTime: Date;
  };
}

export class LearnCommand {
  private aiService: AIService;
  private configManager: ConfigManager;
  private profilePath: string;

  constructor() {
    this.aiService = AIService.getInstance();
    this.configManager = ConfigManager.getInstance();
    this.profilePath = path.join(process.cwd(), ".cyrus-learning-profile.json");
  }

  public async handle(options: any = {}): Promise<void> {
    try {
      // Validate configuration
      if (!(await this.configManager.hasValidConfig())) {
        errorHandler.handle(
          new ConfigurationError(
            "No valid configuration found. Please run: cyrus config init",
          ),
          "learn-command",
        );
        return;
      }

      console.log(chalk.cyan("🎓 Welcome to Cyrus Learning Assistant!"));
      console.log(chalk.gray("═".repeat(60)));

      // Load or create learning profile
      const profile = await this.loadOrCreateProfile();

      if (options.assessment) {
        await this.runSkillAssessment(profile);
      } else if (options.challenge) {
        await this.startCodingChallenge(profile, options.challenge);
      } else if (options.tutorial) {
        await this.startTutorial(profile, options.tutorial);
      } else if (options.progress) {
        await this.showProgress(profile);
      } else {
        await this.showLearningMenu(profile);
      }

      await this.saveProfile(profile);
    } catch (error) {
      errorHandler.handle(error as Error, "learn-command");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  private async loadOrCreateProfile(): Promise<LearningProfile> {
    try {
      if (fs.existsSync(this.profilePath)) {
        const data = fs.readFileSync(this.profilePath, "utf-8");
        return JSON.parse(data);
      }
    } catch {
      console.log(
        chalk.yellow("⚠️ Could not load existing profile, creating new one"),
      );
    }

    // Create new profile
    console.log(chalk.cyan("\n🚀 Let's create your learning profile!"));

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "skillLevel",
        message: "What's your programming skill level?",
        choices: [
          { name: "Beginner - Just starting out", value: "beginner" },
          {
            name: "Intermediate - Have some experience",
            value: "intermediate",
          },
          { name: "Advanced - Experienced developer", value: "advanced" },
        ],
      },
      {
        type: "checkbox",
        name: "languages",
        message: "Which programming languages are you interested in?",
        choices: [
          "JavaScript",
          "TypeScript",
          "Python",
          "Java",
          "Go",
          "Rust",
          "C#",
          "PHP",
          "Ruby",
        ],
        validate: (input) =>
          input.length > 0 || "Please select at least one language",
      },
      {
        type: "list",
        name: "learningStyle",
        message: "What's your preferred learning style?",
        choices: [
          {
            name: "Visual - Learn through examples and diagrams",
            value: "visual",
          },
          {
            name: "Hands-on - Learn by doing and practicing",
            value: "hands-on",
          },
          {
            name: "Theoretical - Learn concepts first, then practice",
            value: "theoretical",
          },
          { name: "Mixed - Combination of all styles", value: "mixed" },
        ],
      },
      {
        type: "checkbox",
        name: "focus",
        message: "What topics interest you most?",
        choices: [
          "Algorithms & Data Structures",
          "Web Development",
          "Backend Development",
          "Database Design",
          "Testing & Quality",
          "Performance Optimization",
          "Security Best Practices",
          "Design Patterns",
          "System Design",
        ],
      },
    ]);

    return {
      userId: `user-${Date.now()}`,
      skillLevel: answers.skillLevel,
      languages: answers.languages,
      completedTopics: [],
      strengths: [],
      weaknesses: [],
      preferences: {
        learningStyle: answers.learningStyle,
        difficulty: "adaptive",
        focus: answers.focus,
      },
      progress: {
        totalSessions: 0,
        totalChallenges: 0,
        successRate: 0,
        lastSessionDate: new Date().toISOString(),
      },
    };
  }

  private async saveProfile(profile: LearningProfile): Promise<void> {
    try {
      profile.progress.lastSessionDate = new Date().toISOString();
      fs.writeFileSync(this.profilePath, JSON.stringify(profile, null, 2));
    } catch {
      console.log(chalk.yellow("⚠️ Could not save learning profile"));
    }
  }

  private async showLearningMenu(profile: LearningProfile): Promise<void> {
    const choices = [
      { name: "📚 Start Interactive Tutorial", value: "tutorial" },
      { name: "🏆 Take Coding Challenge", value: "challenge" },
      { name: "📊 Skill Assessment", value: "assessment" },
      { name: "🎯 Personalized Learning Path", value: "path" },
      { name: "📈 View Progress & Achievements", value: "progress" },
      { name: "🔧 Update Learning Preferences", value: "preferences" },
    ];

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do today?",
        choices,
      },
    ]);

    switch (answer.action) {
      case "tutorial":
        await this.selectAndStartTutorial(profile);
        break;
      case "challenge":
        await this.selectAndStartChallenge(profile);
        break;
      case "assessment":
        await this.runSkillAssessment(profile);
        break;
      case "path":
        await this.generateLearningPath(profile);
        break;
      case "progress":
        await this.showProgress(profile);
        break;
      case "preferences":
        await this.updatePreferences(profile);
        break;
    }
  }

  private async selectAndStartTutorial(
    profile: LearningProfile,
  ): Promise<void> {
    const topics = await this.generatePersonalizedTopics(profile);

    const choices = topics.map((topic) => ({
      name: `${topic.title} (${topic.difficulty}) - ${topic.estimatedTime} min`,
      value: topic,
    }));

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "topic",
        message: "Choose a tutorial topic:",
        choices,
      },
    ]);

    await this.startTutorial(profile, answer.topic);
  }

  private async startTutorial(
    profile: LearningProfile,
    topic?: LearningTopic,
  ): Promise<void> {
    if (!topic) {
      const topics = await this.generatePersonalizedTopics(profile);
      topic = topics[0]; // Default to first recommended topic
    }

    console.log(chalk.cyan(`\n📚 Starting Tutorial: ${topic.title}`));
    console.log(chalk.gray("─".repeat(60)));

    const progressBar = createAIProgress("tutorial generation", {
      theme: "modern",
      showETA: true,
    });

    progressBar.start();

    try {
      progressBar.updateStage("Generating personalized tutorial", 25);

      const tutorialContent = await this.generateTutorialContent(
        profile,
        topic,
      );

      progressBar.updateStage("Preparing interactive session", 75);

      progressBar.complete("Tutorial ready!");
      console.log(); // Add spacing

      // Display tutorial content
      await this.displayTutorialContent(tutorialContent, profile);

      // Update profile
      if (!profile.completedTopics.includes(topic.id)) {
        profile.completedTopics.push(topic.id);
      }
      profile.progress.totalSessions++;
    } catch (error) {
      progressBar.fail("Tutorial generation failed");
      throw error;
    }
  }

  private async generatePersonalizedTopics(
    profile: LearningProfile,
  ): Promise<LearningTopic[]> {
    const prompt = `
Generate 5 personalized programming tutorial topics for a ${profile.skillLevel} developer.

User Profile:
- Skill Level: ${profile.skillLevel}
- Languages: ${profile.languages.join(", ")}
- Interests: ${profile.preferences.focus.join(", ")}
- Learning Style: ${profile.preferences.learningStyle}
- Completed Topics: ${profile.completedTopics.length} topics

Create topics that are:
1. Appropriate for their skill level
2. Focus on their interests
3. Progressive in difficulty
4. Include practical examples

Format as JSON array with fields: id, title, description, difficulty, language, concepts, estimatedTime
`;

    try {
      const response = await this.aiService.analyzeCode(
        prompt,
        "tutorial-generation",
      );

      // Try to parse JSON response
      try {
        const cleanResponse = response.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(cleanResponse);
      } catch {
        // Fallback topics
        return this.getDefaultTopics(profile);
      }
    } catch {
      return this.getDefaultTopics(profile);
    }
  }

  private getDefaultTopics(profile: LearningProfile): LearningTopic[] {
    const language = profile.languages[0] || "JavaScript";

    return [
      {
        id: "variables-basics",
        title: "Variables and Data Types",
        description: `Master ${language} variables and understand different data types`,
        difficulty:
          profile.skillLevel === "beginner" ? "beginner" : "intermediate",
        language,
        concepts: ["Variables", "Data Types", "Type Conversion"],
        estimatedTime: 15,
      },
      {
        id: "functions-intro",
        title: "Functions and Scope",
        description: `Learn how to write and use functions effectively in ${language}`,
        difficulty:
          profile.skillLevel === "beginner" ? "beginner" : "intermediate",
        language,
        concepts: [
          "Function Declaration",
          "Parameters",
          "Return Values",
          "Scope",
        ],
        estimatedTime: 20,
      },
    ];
  }

  private async generateTutorialContent(
    profile: LearningProfile,
    topic: LearningTopic,
  ): Promise<string> {
    const prompt = `
Create an interactive tutorial for: "${topic.title}"

Student Profile:
- Skill Level: ${profile.skillLevel}
- Learning Style: ${profile.preferences.learningStyle}
- Language: ${topic.language}

Tutorial Requirements:
1. Start with clear learning objectives
2. Include step-by-step explanations
3. Provide code examples with comments
4. Add interactive exercises
5. Include best practices and common pitfalls
6. End with a summary and next steps

Concepts to cover: ${topic.concepts.join(", ")}

Format using markdown for better readability.
Make it engaging and interactive!
`;

    return await this.aiService.analyzeCode(prompt, "tutorial-content");
  }

  private async displayTutorialContent(
    content: string,
    profile: LearningProfile,
  ): Promise<void> {
    // Render the tutorial content
    console.log(await renderMarkdown(content));

    // Interactive session
    console.log(chalk.cyan("\n🤔 Ready for some practice?"));

    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "practiceNow",
        message: "Would you like to try some practice exercises?",
        default: true,
      },
    ]);

    if (answer.practiceNow) {
      await this.startPracticeSession(profile);
    }
  }

  private async startPracticeSession(profile: LearningProfile): Promise<void> {
    console.log(chalk.cyan("\n🏋️ Practice Session"));
    console.log(chalk.gray("─".repeat(40)));

    // Generate a simple coding exercise
    const exercise = await this.generatePracticeExercise(profile);

    console.log(chalk.white(`\n📝 Exercise: ${exercise.title}`));
    console.log(chalk.gray(exercise.description));

    if (exercise.startingCode) {
      console.log(chalk.cyan("\n💡 Starting code:"));
      console.log(chalk.gray(`\`\`\`${exercise.language}`));
      console.log(exercise.startingCode);
      console.log(chalk.gray("```"));
    }

    const answer = await inquirer.prompt([
      {
        type: "editor",
        name: "solution",
        message: "Write your solution (this will open your default editor):",
        default:
          exercise.startingCode ||
          `// Write your ${exercise.language} code here\n`,
      },
    ]);

    // Analyze the solution
    await this.analyzeSolution(answer.solution, exercise, profile);
  }

  private async generatePracticeExercise(
    profile: LearningProfile,
  ): Promise<Challenge> {
    const language = profile.languages[0] || "JavaScript";

    const prompt = `
Generate a coding exercise for a ${profile.skillLevel} ${language} developer.

Requirements:
- Appropriate difficulty for ${profile.skillLevel} level
- Focus on fundamental concepts
- Include clear description and expected behavior
- Provide starting code if helpful
- Include 2-3 test cases

Format as JSON with fields: id, title, description, language, startingCode, testCases, hints
`;

    try {
      const response = await this.aiService.analyzeCode(
        prompt,
        "exercise-generation",
      );

      try {
        const cleanResponse = response.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(cleanResponse);
      } catch {
        // Fallback exercise
        return this.getDefaultExercise(language);
      }
    } catch {
      return this.getDefaultExercise(language);
    }
  }

  private getDefaultExercise(language: string): Challenge {
    return {
      id: "sum-function",
      title: "Create a Sum Function",
      description:
        "Write a function that takes two numbers and returns their sum",
      difficulty: "easy",
      language,
      startingCode:
        language === "Python"
          ? "def add_numbers(a, b):\n    # Your code here\n    pass"
          : "function addNumbers(a, b) {\n    // Your code here\n}",
      hints: [
        "Use the + operator to add numbers",
        "Make sure to return the result",
        "Test with different number types",
      ],
      solution:
        language === "Python"
          ? "def add_numbers(a, b):\n    return a + b"
          : "function addNumbers(a, b) {\n    return a + b;\n}",
      testCases: [
        { input: "2, 3", expected: "5" },
        { input: "0, 0", expected: "0" },
        { input: "-1, 1", expected: "0" },
      ],
    };
  }

  private async analyzeSolution(
    solution: string,
    exercise: Challenge,
    profile: LearningProfile,
  ): Promise<void> {
    console.log(chalk.cyan("\n🔍 Analyzing your solution..."));

    const progressBar = createAIProgress("solution analysis", {
      theme: "default",
      showETA: false,
    });

    progressBar.start();

    try {
      const prompt = `
Analyze this ${exercise.language} code solution for the exercise: "${exercise.title}"

Student's Solution:
\`\`\`${exercise.language}
${solution}
\`\`\`

Exercise Description: ${exercise.description}
Expected Test Cases: ${exercise.testCases.map((tc) => `Input: ${tc.input}, Expected: ${tc.expected}`).join("; ")}

Provide:
1. Correctness assessment
2. Code quality feedback
3. Best practices suggestions
4. Learning points
5. Encouragement and next steps

Student Level: ${profile.skillLevel}
Format using markdown for readability.
`;

      const feedback = await this.aiService.analyzeCode(
        prompt,
        "solution-analysis",
      );

      progressBar.complete("Analysis complete!");
      console.log(); // Add spacing

      console.log(await renderMarkdown(feedback));

      // Update progress
      profile.progress.totalChallenges++;
    } catch {
      progressBar.fail("Analysis failed");
      console.log(
        chalk.red("Sorry, couldn't analyze your solution right now."),
      );
    }
  }

  private async selectAndStartChallenge(
    profile: LearningProfile,
  ): Promise<void> {
    const userDifficulty =
      profile.preferences.difficulty === "adaptive"
        ? this.getAdaptiveDifficulty(profile)
        : profile.preferences.difficulty;

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "difficulty",
        message: "Choose challenge difficulty:",
        choices: [
          { name: "🟢 Easy - Warm up exercises", value: "easy" },
          { name: "🟡 Medium - Standard challenges", value: "medium" },
          { name: "🔴 Hard - Advanced problems", value: "hard" },
          {
            name: `🎯 Adaptive - Recommended (${userDifficulty})`,
            value: userDifficulty,
          },
        ],
      },
    ]);

    await this.startCodingChallenge(profile, answer.difficulty);
  }

  private getAdaptiveDifficulty(
    profile: LearningProfile,
  ): "easy" | "medium" | "hard" {
    if (
      profile.progress.successRate > 80 &&
      profile.progress.totalChallenges > 5
    ) {
      return profile.skillLevel === "advanced" ? "hard" : "medium";
    } else if (profile.progress.successRate < 50) {
      return "easy";
    }
    return profile.skillLevel === "beginner" ? "easy" : "medium";
  }

  private async startCodingChallenge(
    profile: LearningProfile,
    difficulty?: string,
  ): Promise<void> {
    console.log(
      chalk.cyan(`\n🏆 Coding Challenge (${difficulty || "adaptive"})`),
    );
    console.log(chalk.gray("─".repeat(60)));

    // For now, redirect to practice session with appropriate difficulty
    await this.startPracticeSession(profile);
  }

  private async runSkillAssessment(profile: LearningProfile): Promise<void> {
    console.log(chalk.cyan("\n📊 Skill Assessment"));
    console.log(chalk.gray("─".repeat(40)));
    console.log(
      chalk.white(
        "Let's evaluate your current skills and identify areas for improvement.",
      ),
    );

    // This would be a more comprehensive assessment in a full implementation
    await this.startPracticeSession(profile);

    console.log(
      chalk.green("\n✅ Assessment completed! Your profile has been updated."),
    );
  }

  private async generateLearningPath(profile: LearningProfile): Promise<void> {
    console.log(chalk.cyan("\n🎯 Personalized Learning Path"));
    console.log(chalk.gray("─".repeat(60)));

    const progressBar = createAIProgress("learning path generation", {
      theme: "modern",
      showETA: true,
    });

    progressBar.start();

    try {
      const prompt = `
Create a personalized learning path for this developer:

Profile:
- Skill Level: ${profile.skillLevel}
- Languages: ${profile.languages.join(", ")}
- Interests: ${profile.preferences.focus.join(", ")}
- Completed Topics: ${profile.completedTopics.length}
- Success Rate: ${profile.progress.successRate}%

Generate a 4-week learning plan with:
1. Weekly objectives
2. Recommended topics and resources
3. Practice exercises
4. Milestones and assessments
5. Time estimates

Format using markdown with clear structure.
`;

      const learningPath = await this.aiService.analyzeCode(
        prompt,
        "learning-path",
      );

      progressBar.complete("Learning path generated!");
      console.log(); // Add spacing

      console.log(await renderMarkdown(learningPath));
    } catch {
      progressBar.fail("Failed to generate learning path");
      console.log(
        chalk.red("Sorry, couldn't generate your learning path right now."),
      );
    }
  }

  private async showProgress(profile: LearningProfile): Promise<void> {
    console.log(chalk.cyan("\n📈 Your Learning Progress"));
    console.log(chalk.gray("═".repeat(60)));

    const progressReport = `
## 🎯 Learning Statistics

### 📊 Overall Progress
- **Total Sessions**: ${profile.progress.totalSessions}
- **Challenges Completed**: ${profile.progress.totalChallenges}
- **Success Rate**: ${profile.progress.successRate}%
- **Topics Mastered**: ${profile.completedTopics.length}

### 🎓 Skill Level
**Current Level**: ${profile.skillLevel.charAt(0).toUpperCase() + profile.skillLevel.slice(1)}

### 💪 Strengths
${profile.strengths.length > 0 ? profile.strengths.map((s) => `• ${s}`).join("\n") : "• Assessment in progress..."}

### 🎯 Areas for Improvement
${profile.weaknesses.length > 0 ? profile.weaknesses.map((w) => `• ${w}`).join("\n") : "• Complete more assessments for detailed insights"}

### 🏆 Achievements
${this.getAchievements(profile)
  .map((a) => `• ${a}`)
  .join("\n")}

### 📅 Last Session
${new Date(profile.progress.lastSessionDate).toLocaleDateString()}
`;

    console.log(await renderMarkdown(progressReport));
  }

  private getAchievements(profile: LearningProfile): string[] {
    const achievements = [];

    if (profile.progress.totalSessions >= 1) {
      achievements.push(
        "🎉 First Steps - Completed your first learning session",
      );
    }
    if (profile.progress.totalSessions >= 5) {
      achievements.push("🔥 Getting Started - Completed 5 learning sessions");
    }
    if (profile.progress.totalChallenges >= 10) {
      achievements.push(
        "💪 Challenge Accepted - Completed 10 coding challenges",
      );
    }
    if (
      profile.progress.successRate >= 80 &&
      profile.progress.totalChallenges >= 5
    ) {
      achievements.push("🎯 High Achiever - Maintaining 80%+ success rate");
    }
    if (profile.completedTopics.length >= 5) {
      achievements.push("📚 Knowledge Seeker - Mastered 5 topics");
    }

    return achievements.length > 0
      ? achievements
      : ["🌱 Just getting started - Keep learning!"];
  }

  private async updatePreferences(profile: LearningProfile): Promise<void> {
    console.log(chalk.cyan("\n🔧 Update Learning Preferences"));

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "learningStyle",
        message: "Preferred learning style:",
        choices: [
          { name: "Visual - Examples and diagrams", value: "visual" },
          { name: "Hands-on - Learning by doing", value: "hands-on" },
          { name: "Theoretical - Concepts first", value: "theoretical" },
          { name: "Mixed - Combination", value: "mixed" },
        ],
        default: profile.preferences.learningStyle,
      },
      {
        type: "list",
        name: "difficulty",
        message: "Preferred difficulty:",
        choices: [
          { name: "Easy - Build confidence", value: "easy" },
          { name: "Medium - Balanced challenge", value: "medium" },
          { name: "Hard - Push your limits", value: "hard" },
          { name: "Adaptive - AI-recommended", value: "adaptive" },
        ],
        default: profile.preferences.difficulty,
      },
    ]);

    profile.preferences.learningStyle = answers.learningStyle;
    profile.preferences.difficulty = answers.difficulty;

    console.log(chalk.green("✅ Preferences updated successfully!"));
  }
}
