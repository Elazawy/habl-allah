import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

test('public/robots.txt allows all crawlers including major AI crawlers while protecting private paths', () => {
  const robotsPath = path.join(REPO_ROOT, 'public', 'robots.txt');
  assert.ok(fs.existsSync(robotsPath), 'public/robots.txt must exist');

  const content = fs.readFileSync(robotsPath, 'utf8');
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  assert.ok(lines.includes('User-agent: *'), 'robots.txt must include User-agent: *');
  assert.ok(
    lines.includes('Content-Signal: search=yes, ai-input=yes, ai-train=yes'),
    'robots.txt must include permissive Content-Signal directive',
  );
  assert.ok(lines.includes('Allow: /'), 'robots.txt must include Allow: /');
  assert.ok(!lines.includes('Disallow: /'), 'robots.txt must not disallow root /');

  const expectedAiCrawlers = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'anthropic-ai',
    'Google-Extended',
    'PerplexityBot',
    'Applebot-Extended',
    'Meta-ExternalAgent',
    'Amazonbot',
    'CCBot',
    'Bytespider',
  ];

  for (const bot of expectedAiCrawlers) {
    assert.ok(
      lines.includes(`User-agent: ${bot}`),
      `robots.txt should explicitly allow ${bot}`,
    );
  }

  // Private admin and authenticated student paths remain disallowed
  assert.ok(lines.includes('Disallow: /admin'));
  assert.ok(lines.includes('Disallow: /quran/student/dashboard'));
  assert.ok(lines.includes('Disallow: /quran/student/profile'));
});

test('public/llms.txt exists and provides a structured overview of public routes', () => {
  const llmsPath = path.join(REPO_ROOT, 'public', 'llms.txt');
  assert.ok(fs.existsSync(llmsPath), 'public/llms.txt must exist');

  const content = fs.readFileSync(llmsPath, 'utf8');
  assert.ok(content.startsWith('# '), 'llms.txt should start with a markdown H1 heading');
  assert.ok(content.includes('/quran'), 'llms.txt should reference /quran');
  assert.ok(content.includes('/quran/teachers'), 'llms.txt should reference /quran/teachers');
  assert.ok(content.includes('/quran/courses'), 'llms.txt should reference /quran/courses');
  assert.ok(content.includes('/quran/competitions'), 'llms.txt should reference /quran/competitions');
});

test('index.html links to /llms.txt and has no crawler-blocking meta tags', () => {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  assert.ok(
    html.includes('href="/llms.txt"'),
    'index.html should advertise /llms.txt via <link rel="alternate">',
  );
  assert.ok(!/\bnoai\b/i.test(html), 'index.html must not contain noai directive');
  assert.ok(!/\bnoimageai\b/i.test(html), 'index.html must not contain noimageai directive');
  assert.ok(!/\bnoindex\b/i.test(html), 'index.html must not contain noindex directive');
});
