import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import chalk from "chalk";

marked.use(
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-expect-error
  markedTerminal({
    codespan: chalk.underline.magenta,
    emoji: true,
    reflowText: true,
  }),
);

export const renderMarkdown = (markdown: string): Promise<string> => {
  return marked.parse(markdown, {
    async: true,
    silent: false,
    gfm: true,
    breaks: false,
  });
};
