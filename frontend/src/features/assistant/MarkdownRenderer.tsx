import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Parse fenced code blocks first
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'plaintext',
      content: match[2].trimEnd(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  let codeBlockCounter = 0;

  return (
    <div className="space-y-3 leading-relaxed text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          const currentCodeIdx = codeBlockCounter++;
          const isCopied = copiedIndex === currentCodeIdx;
          return (
            <div
              key={idx}
              className="my-3 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950 text-slate-100 shadow-md font-mono"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-royal-400" />
                  <span className="font-semibold uppercase tracking-wider">{part.language || 'code'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(part.content, currentCodeIdx)}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                  title="Copy code snippet"
                  aria-label="Copy code snippet"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto text-[11.5px] leading-relaxed scrollbar-thin">
                <code>{part.content}</code>
              </pre>
            </div>
          );
        }

        // Render formatted text
        return <FormattedTextBlock key={idx} text={part.content} />;
      })}
    </div>
  );
};

const FormattedTextBlock: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];
  let isNumbered = false;

  const flushList = () => {
    if (inList && listItems.length > 0) {
      if (isNumbered) {
        elements.push(
          <ol key={`list-${elements.length}`} className="list-decimal pl-5 space-y-1 my-1.5">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc pl-5 space-y-1 my-1.5">
            {listItems}
          </ul>
        );
      }
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      return;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={lineIdx} className="text-sm sm:text-base font-bold text-brand-950 dark:text-royal-300 mt-3 mb-1">
          {renderInlineFormatting(trimmed.slice(4))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={lineIdx} className="text-base sm:text-lg font-bold text-brand-950 dark:text-royal-200 mt-3.5 mb-1.5">
          {renderInlineFormatting(trimmed.slice(3))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={lineIdx} className="text-lg sm:text-xl font-bold text-brand-950 dark:text-royal-100 mt-4 mb-2">
          {renderInlineFormatting(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote
          key={lineIdx}
          className="border-l-3 border-royal-500 bg-royal-50/50 dark:bg-royal-950/20 px-3 py-1.5 rounded-r my-2 text-slate-700 dark:text-slate-300 italic text-xs sm:text-sm"
        >
          {renderInlineFormatting(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    // Unordered list item
    if (/^[-*•]\s+/.test(trimmed)) {
      if (!inList || isNumbered) {
        flushList();
        inList = true;
        isNumbered = false;
      }
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      listItems.push(<li key={`item-${lineIdx}`}>{renderInlineFormatting(itemText)}</li>);
      return;
    }

    // Numbered list item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (!inList || !isNumbered) {
        flushList();
        inList = true;
        isNumbered = true;
      }
      listItems.push(<li key={`num-${lineIdx}`}>{renderInlineFormatting(numMatch[2])}</li>);
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={lineIdx} className="my-1.5 leading-relaxed">
        {renderInlineFormatting(line)}
      </p>
    );
  });

  flushList();

  return <>{elements}</>;
};

function renderInlineFormatting(text: string): React.ReactNode {
  // Parses inline code `code`, bold **text**, italic *text*
  const tokens: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      tokens.push(text.slice(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-cool-100 dark:bg-slate-800 text-royal-700 dark:text-royal-300 font-mono text-[11px] font-semibold border border-cool-200 dark:border-slate-700"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={match.index} className="font-semibold text-slate-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    }
    lastIdx = match.index + token.length;
  }

  if (lastIdx < text.length) {
    tokens.push(text.slice(lastIdx));
  }

  return <>{tokens.length > 0 ? tokens : text}</>;
}
