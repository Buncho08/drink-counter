import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockFetcherIdle = {
    state: "idle" as const,
    formData: null,
    data: null,
    Form: ({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement> & { children: React.ReactNode }) => (
        <form {...props}>{children}</form>
    ),
};

vi.mock("@remix-run/react", () => ({
    useLoaderData: vi.fn(),
    useFetcher: vi.fn(),
}));

import { useLoaderData, useFetcher } from "@remix-run/react";
import User from "../User";

const baseUser = { id: "user-1", email: "test@example.com" };
const baseProfile = { username: "testuser", full_name: "テスト ユーザー" };

describe("User", () => {
    beforeEach(() => {
        vi.mocked(useFetcher).mockReturnValue(mockFetcherIdle as ReturnType<typeof useFetcher>);
    });

    it("ユーザーのメールアドレスを表示する", () => {
        vi.mocked(useLoaderData).mockReturnValue({ user: baseUser, profile: baseProfile });
        render(<User />);
        expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    });

    it("プロフィールのユーザー名がフォームに表示される", () => {
        vi.mocked(useLoaderData).mockReturnValue({ user: baseUser, profile: baseProfile });
        render(<User />);
        expect(screen.getByDisplayValue("testuser")).toBeInTheDocument();
    });

    it("プロフィールのフルネームがフォームに表示される", () => {
        vi.mocked(useLoaderData).mockReturnValue({ user: baseUser, profile: baseProfile });
        render(<User />);
        expect(screen.getByDisplayValue("テスト ユーザー")).toBeInTheDocument();
    });

    it("「保存」ボタンが表示される", () => {
        vi.mocked(useLoaderData).mockReturnValue({ user: baseUser, profile: baseProfile });
        render(<User />);
        expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
    });

    it("保存成功後に「保存しました」を表示する", () => {
        vi.mocked(useFetcher).mockReturnValue({
            ...mockFetcherIdle,
            data: { success: true },
        } as ReturnType<typeof useFetcher>);
        vi.mocked(useLoaderData).mockReturnValue({ user: baseUser, profile: baseProfile });
        render(<User />);
        expect(screen.getByText("保存しました")).toBeInTheDocument();
    });

    it("エラー時にエラーメッセージを表示する", () => {
        vi.mocked(useFetcher).mockReturnValue({
            ...mockFetcherIdle,
            data: { error: "ユーザー名が使用済みです" },
        } as ReturnType<typeof useFetcher>);
        vi.mocked(useLoaderData).mockReturnValue({ user: baseUser, profile: baseProfile });
        render(<User />);
        expect(screen.getByText("ユーザー名が使用済みです")).toBeInTheDocument();
    });

    it("profile が null でもクラッシュしない", () => {
        vi.mocked(useLoaderData).mockReturnValue({ user: baseUser, profile: null });
        expect(() => render(<User />)).not.toThrow();
    });
});
