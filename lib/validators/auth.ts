import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Введи валидный email"),
  password: z.string().min(8, "Минимум 8 символов"),
});

export type SignInInput = z.infer<typeof signInSchema>;
