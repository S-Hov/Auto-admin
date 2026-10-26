import { describe, expect, it } from "vitest";
import { registerSchema } from "./register.schema";

describe("registerSchema validation", () => {
    const validData = {
        userName: "validAdmin",
        password: "ValidPassword123!",
        confirmPassword: "ValidPassword123!",
    };

    it("корректные данные принимаются", () => {
        const result = registerSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it("короткое имя отклоняется", () => {
        const result = registerSchema.safeParse({
            ...validData,
            userName: "ab", // 2 символа (< 3)
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                result.error.issues.some((issue) =>
                    issue.path.includes("userName"),
                ),
            ).toBe(true);
        }
    });

    it("слишком длинное имя отклоняется", () => {
        const result = registerSchema.safeParse({
            ...validData,
            userName: "a".repeat(21), // 21 символ (> 20)
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                result.error.issues.some((issue) =>
                    issue.path.includes("userName"),
                ),
            ).toBe(true);
        }
    });

    it("пароль короче 12 символов отклоняется", () => {
        const shortPassword = "Pass123!aBc"; // 11 символов (< 12)
        const result = registerSchema.safeParse({
            ...validData,
            password: shortPassword,
            confirmPassword: shortPassword,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                result.error.issues.some((issue) =>
                    issue.path.includes("password"),
                ),
            ).toBe(true);
        }
    });

    it("пароль без цифры отклоняется", () => {
        const noDigit = "PasswordWithoutDigit!";
        const result = registerSchema.safeParse({
            ...validData,
            password: noDigit,
            confirmPassword: noDigit,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                result.error.issues.some((issue) =>
                    issue.path.includes("password"),
                ),
            ).toBe(true);
        }
    });

    it("без заглавной или строчной буквы отклоняется", () => {
        // Без заглавной буквы
        const withoutUpper = "alllowercase123!";
        const resultUpper = registerSchema.safeParse({
            ...validData,
            password: withoutUpper,
            confirmPassword: withoutUpper,
        });
        expect(resultUpper.success).toBe(false);
        if (!resultUpper.success) {
            expect(
                resultUpper.error.issues.some((issue) =>
                    issue.path.includes("password"),
                ),
            ).toBe(true);
        }

        // Без строчной буквы
        const withoutLower = "ALLUPPERCASE123!";
        const resultLower = registerSchema.safeParse({
            ...validData,
            password: withoutLower,
            confirmPassword: withoutLower,
        });
        expect(resultLower.success).toBe(false);
        if (!resultLower.success) {
            expect(
                resultLower.error.issues.some((issue) =>
                    issue.path.includes("password"),
                ),
            ).toBe(true);
        }
    });

    it("без специального символа отклоняется", () => {
        const noSpecial = "Password123456";
        const result = registerSchema.safeParse({
            ...validData,
            password: noSpecial,
            confirmPassword: noSpecial,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                result.error.issues.some((issue) =>
                    issue.path.includes("password"),
                ),
            ).toBe(true);
        }
    });

    it("разные password и confirmPassword отклоняются", () => {
        const result = registerSchema.safeParse({
            ...validData,
            password: "ValidPassword123!",
            confirmPassword: "DifferentPassword123!",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                result.error.issues.some(
                    (issue) =>
                        issue.path.includes("confirmPassword") &&
                        issue.message === "Пароли не совпадают",
                ),
            ).toBe(true);
        }
    });
});
