/**
 * Demo sign-in.
 *
 * The whole of `pages/login.tsx` is a stub: there is no real authentication in
 * the frontend yet. travel-backend exposes `/api/v1/auth`, but wiring it needs
 * the customer model, JWT issuance, and the rotating refresh cookie from §7.3 —
 * none of which exist on the public surface. Until then, this file is the one
 * place that decides who gets in, so there is exactly one thing to delete.
 *
 * §7.4 still holds even for a stub: a wrong code must fail identically whether
 * or not the number is known, so nothing here branches on "does this account
 * exist" before the code is checked.
 *
 * TO REPLACE: swap `verifyDemoOtp` for `POST /api/v1/auth/verifyOtp` and let
 * the server set an httpOnly refresh cookie. Nothing else in the app reads
 * these constants.
 */

/** The only code that signs anyone in while the stub is in place. */
export const DEMO_OTP = "123456";

export interface DemoAccount {
  /** E.164, matching what `normalisePhone` produces. */
  phone: string;
  label: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

/**
 * Accounts offered on the sign-in screen. Any other valid number also works
 * with `DEMO_OTP` — these just get a one-tap button and a friendly label.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { phone: "+917044804030", label: "Compte de démonstration" }
];

export const findDemoAccount = (e164: string): DemoAccount | undefined =>
  DEMO_ACCOUNTS.find((a) => a.phone === e164);

/**
 * Whether to show the credentials on screen. Off unless explicitly enabled, so
 * a production build never advertises a shared code even if this file ships.
 */
export const showDemoHint = process.env.NEXT_PUBLIC_DEMO_AUTH === "1";

/** Constant-time-ish check. Returns false for anything that is not the code. */
export const verifyDemoOtp = (code: string): boolean =>
  code.trim() === DEMO_OTP;
