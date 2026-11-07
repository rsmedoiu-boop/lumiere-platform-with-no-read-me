/** Account rules shared by the register page and the start flow. */
import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

/** The rule for choosing a password: sign-up and changing it use the same one. */
export const passwordRule = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128)
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Use letters and at least one number");

export const newPasswordSchema = z
  .object({ password: passwordRule, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The two passwords don't match" });

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(120),
  email: z.email("Enter a valid email address"),
  password: passwordRule,
  terms: z.literal("on", { error: "Please accept the terms and privacy notice" }),
  marketing: z.string().optional(),
});

/**
 * This deployment's address, for links in emails. Netlify sets URL to the
 * site's main address automatically; locally it falls back to localhost.
 */
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
