// src/features/conversations/RichMessageRenderer.tsx
// High-fidelity AST renderer for Tiptap/ProseMirror JSON messages
// Renders tables, headers, lists, code blocks, formatting marks, and @mentions

import React from 'react';
import { FormattedMessageText, MentionCandidate } from './MentionAutocomplete';

interface RichMessageRendererProps {
  contentJson: any;
  currentUserName: string;
  candidates: MentionCandidate[];
}

export const RichMessageRenderer: React.FC<RichMessageRendererProps> = ({
  contentJson,
  currentUserName,
  candidates,
}) => {
  // If no contentJson provided or invalid, return null
  if (!contentJson) return null;

  // If contentJson is a raw string (legacy format or fallback)
  if (typeof contentJson === 'string') {
    return (
      <p className="whitespace-pre-wrap leading-relaxed">
        <FormattedMessageText
          text={contentJson}
          currentUserName={currentUserName}
          candidates={candidates}
        />
      </p>
    );
  }

  // If contentJson has no content array, check for text or fallback
  if (!Array.isArray(contentJson.content)) {
    if (contentJson.text) {
      return (
        <p className="whitespace-pre-wrap leading-relaxed">
          <FormattedMessageText
            text={String(contentJson.text)}
            currentUserName={currentUserName}
            candidates={candidates}
          />
        </p>
      );
    }
    return null;
  }

  // Render an inline node (text, hardBreak) with its marks (bold, italic, underline, link, code)
  const renderInlineNode = (node: any, key: string | number): React.ReactNode => {
    if (!node) return null;

    if (node.type === 'hardBreak') {
      return <br key={key} />;
    }

    if (node.type === 'text') {
      const text = node.text || '';
      let rendered: React.ReactNode = (
        <FormattedMessageText
          text={text}
          currentUserName={currentUserName}
          candidates={candidates}
        />
      );

      // Apply marks in order
      if (Array.isArray(node.marks)) {
        node.marks.forEach((mark: any, idx: number) => {
          const markKey = `${key}-mark-${idx}`;
          switch (mark.type) {
            case 'bold':
              rendered = <strong key={markKey} className="font-bold">{rendered}</strong>;
              break;
            case 'italic':
              rendered = <em key={markKey} className="italic">{rendered}</em>;
              break;
            case 'underline':
              rendered = (
                <u key={markKey} className="underline decoration-1 underline-offset-2">
                  {rendered}
                </u>
              );
              break;
            case 'strike':
              rendered = <s key={markKey} className="line-through opacity-80">{rendered}</s>;
              break;
            case 'code':
              rendered = (
                <code
                  key={markKey}
                  className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800/80 px-1 py-0.5 rounded text-emerald-600 dark:text-teal-300 border border-slate-200 dark:border-slate-700/60"
                >
                  {rendered}
                </code>
              );
              break;
            case 'link':
              rendered = (
                <a
                  key={markKey}
                  href={mark.attrs?.href || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
                >
                  {rendered}
                </a>
              );
              break;
            default:
              break;
          }
        });
      }

      return <React.Fragment key={key}>{rendered}</React.Fragment>;
    }

    return null;
  };

  // Render a block-level node (paragraph, heading, table, list, etc.)
  const renderBlockNode = (node: any, key: string | number): React.ReactNode => {
    if (!node) return null;

    switch (node.type) {
      // Paragraph
      case 'paragraph': {
        const isEmpty = !node.content || node.content.length === 0;
        return (
          <p key={key} className="leading-relaxed mb-1.5 last:mb-0 min-h-[1.25em]">
            {isEmpty ? (
              <br />
            ) : (
              node.content.map((child: any, idx: number) =>
                renderInlineNode(child, `${key}-inline-${idx}`)
              )
            )}
          </p>
        );
      }

      // Headings
      case 'heading': {
        const level = node.attrs?.level || 1;
        const inlineChildren = Array.isArray(node.content)
          ? node.content.map((c: any, i: number) => renderInlineNode(c, `${key}-h-${i}`))
          : null;

        if (level === 1) {
          return (
            <h1 key={key} className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2 mb-1">
              {inlineChildren}
            </h1>
          );
        }
        if (level === 2) {
          return (
            <h2 key={key} className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1.5 mb-1">
              {inlineChildren}
            </h2>
          );
        }
        return (
          <h3 key={key} className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 mb-0.5">
            {inlineChildren}
          </h3>
        );
      }

      // Rich Table
      case 'table': {
        return (
          <div
            key={key}
            className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-950/70"
          >
            <table className="w-full border-collapse text-left text-xs">
              <tbody>
                {Array.isArray(node.content) &&
                  node.content.map((row: any, rIdx: number) => (
                    <tr
                      key={`${key}-r-${rIdx}`}
                      className="border-b border-slate-200 dark:border-slate-800/80 last:border-b-0 hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      {Array.isArray(row.content) &&
                        row.content.map((cell: any, cIdx: number) => {
                          const isHeader = cell.type === 'tableHeader';
                          const colSpan = cell.attrs?.colspan || 1;
                          const rowSpan = cell.attrs?.rowspan || 1;

                          const cellContent =
                            Array.isArray(cell.content) && cell.content.length > 0 ? (
                              cell.content.map((b: any, bIdx: number) =>
                                renderBlockNode(b, `${key}-r${rIdx}-c${cIdx}-b${bIdx}`)
                              )
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">—</span>
                            );

                          if (isHeader) {
                            return (
                              <th
                                key={`${key}-th-${rIdx}-${cIdx}`}
                                colSpan={colSpan}
                                rowSpan={rowSpan}
                                className="bg-slate-100/90 dark:bg-slate-900 font-bold text-slate-900 dark:text-slate-100 px-3 py-2 border-r border-slate-200 dark:border-slate-800 last:border-r-0 align-top text-xs tracking-tight"
                              >
                                {cellContent}
                              </th>
                            );
                          }

                          return (
                            <td
                              key={`${key}-td-${rIdx}-${cIdx}`}
                              colSpan={colSpan}
                              rowSpan={rowSpan}
                              className="text-slate-800 dark:text-slate-200 px-3 py-2 border-r border-slate-200 dark:border-slate-800/60 last:border-r-0 align-top leading-relaxed text-xs"
                            >
                              {cellContent}
                            </td>
                          );
                        })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        );
      }

      // Bullet List
      case 'bulletList': {
        return (
          <ul
            key={key}
            className="list-disc list-outside space-y-1 my-2 pl-4 text-slate-800 dark:text-slate-200"
          >
            {Array.isArray(node.content) &&
              node.content.map((li: any, lIdx: number) =>
                renderBlockNode(li, `${key}-li-${lIdx}`)
              )}
          </ul>
        );
      }

      // Ordered List
      case 'orderedList': {
        const start = node.attrs?.start || 1;
        return (
          <ol
            key={key}
            start={start}
            className="list-decimal list-outside space-y-1 my-2 pl-4 text-slate-800 dark:text-slate-200"
          >
            {Array.isArray(node.content) &&
              node.content.map((li: any, lIdx: number) =>
                renderBlockNode(li, `${key}-oli-${lIdx}`)
              )}
          </ol>
        );
      }

      // List Item
      case 'listItem': {
        return (
          <li key={key} className="leading-relaxed">
            {Array.isArray(node.content) &&
              node.content.map((child: any, cIdx: number) =>
                renderBlockNode(child, `${key}-lic-${cIdx}`)
              )}
          </li>
        );
      }

      // Blockquote
      case 'blockquote': {
        return (
          <blockquote
            key={key}
            className="border-l-3 border-emerald-500 pl-3 my-2 italic text-slate-600 dark:text-slate-300"
          >
            {Array.isArray(node.content) &&
              node.content.map((child: any, cIdx: number) =>
                renderBlockNode(child, `${key}-bq-${cIdx}`)
              )}
          </blockquote>
        );
      }

      // Code Block
      case 'codeBlock': {
        const rawCode = Array.isArray(node.content)
          ? node.content.map((c: any) => c.text || '').join('')
          : '';
        return (
          <pre
            key={key}
            className="bg-slate-950 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto my-2 border border-slate-800 leading-relaxed"
          >
            <code>{rawCode}</code>
          </pre>
        );
      }

      // Horizontal Rule
      case 'horizontalRule': {
        return (
          <hr
            key={key}
            className="my-3 border-t border-slate-200 dark:border-slate-800"
          />
        );
      }

      default: {
        // Fallback for custom or unrecognized block nodes: render inline children if available
        if (Array.isArray(node.content)) {
          return (
            <div key={key} className="mb-1">
              {node.content.map((c: any, i: number) =>
                renderBlockNode(c, `${key}-def-${i}`)
              )}
            </div>
          );
        }
        return null;
      }
    }
  };

  return (
    <div className="rich-message-content space-y-1">
      {contentJson.content.map((block: any, idx: number) =>
        renderBlockNode(block, `root-block-${idx}`)
      )}
    </div>
  );
};
