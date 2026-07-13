import type { HelpArticle, HelpBlock } from './help-types';

/**
 * GitHub-flavored Markdown serialization of the typed help content, for the
 * website's AI-agent surface. Unlike `blockToPlainText`, the inline mini-markup
 * (`**bold**`, `` `code` ``, `[label](/route)`) is preserved verbatim — agents
 * benefit from the links and emphasis, so nothing is stripped.
 */

const KEYS_TABLE_HEADER = ['| Keys | Action |', '| --- | --- |'];

/** One content block as a Markdown fragment. */
export function blockToMarkdown(block: HelpBlock): string {
  switch (block.kind) {
    case 'p':
      return block.text;
    case 'h2':
      return `## ${block.text}`;
    case 'list':
      return block.items.map((item, index) => (block.ordered ? `${index + 1}. ${item}` : `- ${item}`)).join('\n');
    case 'steps':
      return block.items
        .map((step, index) => `${index + 1}. **${step.title}**${step.detail ? ` — ${step.detail}` : ''}`)
        .join('\n');
    case 'callout':
      return `> **${block.title}** — ${block.text}`;
    case 'keys':
      return [
        ...KEYS_TABLE_HEADER,
        ...block.rows.map((row) => `| ${row.keys.map((key) => `\`${key}\``).join(' ')} | ${row.action} |`),
      ].join('\n');
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

/** A whole article as Markdown: `# title`, the summary intro, then each block. */
export function articleToMarkdown(article: HelpArticle): string {
  return [`# ${article.title}`, article.summary, ...article.blocks.map(blockToMarkdown)].join('\n\n');
}
