export type ActionState = {
  ok?: boolean;
  error?: string | null;
  message?: string | null;
  fieldErrors?: Record<string, string>;
  /** Changes on every submit so client components can react (e.g. reset). */
  at?: number;
  data?: Record<string, unknown>;
};

export const initialState: ActionState = {};

export function fail(error: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, error, fieldErrors, at: Date.now() };
}

export function success(message?: string, data?: Record<string, unknown>): ActionState {
  return { ok: true, message: message ?? null, at: Date.now(), data };
}
