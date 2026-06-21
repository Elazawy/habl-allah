/**
 * Safe Markdown Renderer
 * ──────────────────────
 * Renders a subset of Markdown (headings, paragraphs, lists, bold, links)
 * into React elements. All text is escaped — no dangerouslySetInnerHTML.
 */

import React from 'react';

/** Escape HTML entities to prevent XSS */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Parse inline markdown: **bold** and [text](url) */
function parseInline(text) {
  const escaped = escapeHtml(text);
  const parts = [];
  let remaining = escaped;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Link: [text](url) — only allow http(s) and mailto protocols
    const linkMatch = remaining.match(/\[(.+?)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/);

    let firstMatch = null;
    let firstIndex = Infinity;

    if (boldMatch && boldMatch.index < firstIndex) {
      firstMatch = 'bold';
      firstIndex = boldMatch.index;
    }
    if (linkMatch && linkMatch.index < firstIndex) {
      firstMatch = 'link';
      firstIndex = linkMatch.index;
    }

    if (!firstMatch) {
      parts.push(remaining);
      break;
    }

    // Add text before match
    if (firstIndex > 0) {
      parts.push(remaining.slice(0, firstIndex));
    }

    if (firstMatch === 'bold') {
      parts.push(
        React.createElement('strong', { key: `b-${key++}` }, boldMatch[1])
      );
      remaining = remaining.slice(firstIndex + boldMatch[0].length);
    } else if (firstMatch === 'link') {
      parts.push(
        React.createElement(
          'a',
          {
            key: `a-${key++}`,
            href: linkMatch[2],
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'page-content-link',
          },
          linkMatch[1]
        )
      );
      remaining = remaining.slice(firstIndex + linkMatch[0].length);
    }
  }

  return parts;
}

/**
 * Render safe markdown content to React elements.
 * Supports: # H1, ## H2, ### H3, - list items, **bold**, [links](url), paragraphs.
 * H1 is skipped (shown in the page hero instead).
 */
export function renderSafeMarkdown(content) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let listItems = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        React.createElement(
          'ul',
          { key: `ul-${key++}`, className: 'page-content-list' },
          listItems.map((item, i) =>
            React.createElement('li', { key: i }, parseInline(item))
          )
        )
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // H1 — skip (shown in hero)
    if (trimmed.startsWith('# ')) {
      flushList();
      continue;
    }

    // H2
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        React.createElement(
          'h2',
          { key: `h2-${key++}`, className: 'page-content-h2' },
          parseInline(trimmed.slice(3))
        )
      );
      continue;
    }

    // H3
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        React.createElement(
          'h3',
          { key: `h3-${key++}`, className: 'page-content-h3' },
          parseInline(trimmed.slice(4))
        )
      );
      continue;
    }

    // List item
    if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
      continue;
    }

    // Paragraph
    flushList();
    elements.push(
      React.createElement(
        'p',
        { key: `p-${key++}`, className: 'page-content-paragraph' },
        parseInline(trimmed)
      )
    );
  }

  flushList();
  return elements;
}
