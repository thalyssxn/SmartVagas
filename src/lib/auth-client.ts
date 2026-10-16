import { createAuthClient } from "better-auth/react";

// Login passa pelo endpoint HTTP (e não por auth.api no servidor) para valer o rate-limit.
export const authClient = createAuthClient();
