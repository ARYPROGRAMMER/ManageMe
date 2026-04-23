import z from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(256, "Password must be at most 256 characters"),
});