import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import { readWorkerConfig, WorkerConfigError } from './config.ts';

const base = {
  TELEGRAM_BOT_TOKEN: 'test-token',
  TELEGRAM_REQUEST_CHAT_ID: 'test-chat',
  STUDENT_REQUESTS_WORKER_SECRET: 'test-secret',
};

function config(values: Record<string, string>) {
  return readWorkerConfig((name) => values[name]);
}

Deno.test('notification origin overrides the shared CORS origin', () => {
  assertEquals(config({
    ...base,
    STUDENT_REQUESTS_APP_ORIGIN: 'https://preview.example.test/',
    PUBLIC_APP_ORIGIN: 'https://other.example.test',
  }).appOrigin, 'https://preview.example.test');
});

Deno.test('legacy public origin remains a fallback', () => {
  assertEquals(config({
    ...base,
    PUBLIC_APP_ORIGIN: 'http://localhost:5173',
  }).appOrigin, 'http://localhost:5173');
});

Deno.test('blank notification origin falls back to the legacy origin', () => {
  assertEquals(config({
    ...base,
    STUDENT_REQUESTS_APP_ORIGIN: ' ',
    PUBLIC_APP_ORIGIN: 'https://other.example.test',
  }).appOrigin, 'https://other.example.test');
});

Deno.test('invalid dedicated origin fails instead of silently using CORS origin', () => {
  assertThrows(() => config({
    ...base,
    STUDENT_REQUESTS_APP_ORIGIN: 'not-a-url',
    PUBLIC_APP_ORIGIN: 'https://other.example.test',
  }), WorkerConfigError);
});

Deno.test('missing both origins fails closed', () => {
  assertThrows(() => config(base), WorkerConfigError);
});
