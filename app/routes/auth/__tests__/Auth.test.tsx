import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Remix フックをモック
vi.mock("@remix-run/react", () => ({
    useActionData: vi.fn(),
    Form: ({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement> & { children: React.ReactNode }) => (
        <form {...props}>{children}</form>
    ),
}));

import { useActionData } from "@remix-run/react";
import Auth from "../Auth";

describe("Auth", () => {
    beforeEach(() => {
        vi.mocked(useActionData).mockReturnValue(undefined);
    });

    it("デフォルトでログインフォームを表示する", () => {
        const { container } = render(<Auth />);
        // ログインモードでは hidden input に intent=login がある
        expect(container.querySelector('input[name="intent"][value="login"]')).toBeInTheDocument();
    });

    it("ログインフォームにメールとパスワードフィールドがある", () => {
        const { container } = render(<Auth />);
        expect(container.querySelector('input[type="email"]')).toBeInTheDocument();
        expect(container.querySelector('input[type="password"]')).toBeInTheDocument();
    });

    it("「新規登録」タブをクリックするとサインアップフォームに切り替わる", async () => {
        const user = userEvent.setup();
        const { container } = render(<Auth />);
        await user.click(screen.getByRole("button", { name: "新規登録" }));
        expect(container.querySelector('input[name="username"]')).toBeInTheDocument();
        expect(container.querySelector('input[name="fullName"]')).toBeInTheDocument();
    });

    it("サインアップフォームに4つのフィールドがある", async () => {
        const user = userEvent.setup();
        const { container } = render(<Auth />);
        await user.click(screen.getByRole("button", { name: "新規登録" }));
        expect(container.querySelector('input[type="email"]')).toBeInTheDocument();
        expect(container.querySelector('input[type="password"]')).toBeInTheDocument();
        expect(container.querySelector('input[name="username"]')).toBeInTheDocument();
        expect(container.querySelector('input[name="fullName"]')).toBeInTheDocument();
    });

    it("actionData にエラーがあるときエラーメッセージを表示する", () => {
        vi.mocked(useActionData).mockReturnValue({
            intent: "login",
            error: "メールまたはパスワードが間違っています",
        });
        render(<Auth />);
        expect(screen.getByText("メールまたはパスワードが間違っています")).toBeInTheDocument();
    });

    it("新規登録成功時に確認メール送信メッセージを表示する", async () => {
        const user = userEvent.setup();
        vi.mocked(useActionData).mockReturnValue({
            intent: "signup",
            success: "確認メールを送信しました。メール内のリンクを開いて登録を完了してください。",
        });
        render(<Auth />);
        await user.click(screen.getByRole("button", { name: "新規登録" }));
        expect(
            screen.getByText("確認メールを送信しました。メール内のリンクを開いて登録を完了してください。")
        ).toBeInTheDocument();
    });
});
