import { handleRequest } from '../student-request-notifications/worker.ts';

// Compatibility route for the old database trigger/webhook URL. It shares the
// authenticated worker handler and never processes the old request payload.
// The old hardcoded credentials have been removed; deployment requires the
// same worker secrets as student-request-notifications.
Deno.serve(handleRequest);
