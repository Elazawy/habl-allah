import { handleRequest } from './worker.ts';

Deno.serve(handleRequest);
