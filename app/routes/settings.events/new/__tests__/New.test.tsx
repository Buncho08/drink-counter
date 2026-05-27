import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@remix-run/react", () => ({
    useActionData: vi.fn(),
    useNavigation: vi.fn(),
    Form: ({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement> & { children: React.ReactNode }) => (
        <form {...props}>{children}</form>
    ),
    Link: ({ children, to, ...props }: { children: React.ReactNode; to: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a href={to} {...props}>{children}</a>
    ),
}));

import { useActionData, useNavigation } from "@remix-run/react";
import New from "../New";

describe("New (新規イベント作成)", () => {
    beforeEach(() => {
        vi.mocked(useActionData).mockReturnValue(undefined);
        vi.mocked(useNavigation).mockReturnValue({ state: "idle" } as ReturnType<typeof useNavigation>);
    });

    it("フォームのタイトルを表示する", () => {
        render(<New />);
        expect(screen.getByText("新規イベント作成")).toBeInTheDocument();
    });

    it("イベント名・スラッグ・開始日時・終了日時のフィールドがある", () => {
        const { container } = render(<New />);
        expect(screen.getByPlaceholderText(/夏フェス/)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/summer-fes/)).toBeInTheDocument();
        expect(container.querySelector('input[name="startDate"]')).toBeInTheDocument();
        expect(container.querySelector('input[name="endDate"]')).toBeInTheDocument();
    });

    it("「作成する」ボタンが表示される", () => {
        render(<New />);
        expect(screen.getByRole("button", { name: "作成する" })).toBeInTheDocument();
    });

    it("送信中は「作成中...」を表示する", () => {
        vi.mocked(useNavigation).mockReturnValue({ state: "submitting" } as ReturnType<typeof useNavigation>);
        render(<New />);
        expect(screen.getByRole("button", { name: "作成中..." })).toBeInTheDocument();
    });

    it("actionData にエラーがあるときエラーメッセージを表示する", () => {
        vi.mocked(useActionData).mockReturnValue({ error: "終了日時は開始日時より後に設定してください。" });
        render(<New />);
        expect(screen.getByText("終了日時は開始日時より後に設定してください。")).toBeInTheDocument();
    });

    it("「イベント一覧に戻る」リンクが存在する", () => {
        render(<New />);
        expect(screen.getByRole("link", { name: /イベント一覧に戻る/ })).toBeInTheDocument();
    });
});
