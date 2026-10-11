import type { Instrumentation } from "next";

export async function register() {}

/** Unhandled server errors (rendering, route handlers, server actions) are recorded centrally. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("@/lib/security/errors");
  await logError(`request:${context.routeType}`, err, { path: request.path, method: request.method, route: context.routePath });
};
