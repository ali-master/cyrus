import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import chalk from "chalk";

// Configure marked-terminal with proper terminal styling
marked.use(
  // @ts-expect-error - marked-terminal types are not fully compatible with marked v5+
  markedTerminal({
    // Headers
    heading: chalk.blue.bold,
    strong: chalk.bold,
    em: chalk.italic,
    codespan: chalk.yellow,
    code: chalk.gray,
    blockquote: chalk.gray.italic,

    // Links and formatting
    link: chalk.blue.underline,
    href: chalk.blue.underline,

    // General styling
    emoji: true,
    reflowText: true,
    tab: 2,
    width: 80,

    // Table styling
    tableOptions: {
      chars: {
        top: "─",
        "top-mid": "┬",
        "top-left": "┌",
        "top-right": "┐",
        bottom: "─",
        "bottom-mid": "┴",
        "bottom-left": "└",
        "bottom-right": "┘",
        left: "│",
        "left-mid": "├",
        mid: "─",
        "mid-mid": "┼",
        right: "│",
        "right-mid": "┤",
        middle: "│",
      },
    },
  }),
);

export const renderMarkdown = async (markdown: string): Promise<string> => {
  try {
    return await marked.parse(markdown, {
      async: true,
      silent: false,
      gfm: true,
      breaks: true,
    });
  } catch (error) {
    // Fallback to plain text if markdown rendering fails
    console.error("Markdown rendering failed:", error);
    return markdown;
  }
};
