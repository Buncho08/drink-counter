import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
    Link: ({ children, to, ...props }: { children: React.ReactNode; to: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a href={to} {...props}>{children}</a>
    ),
}));

import { useLoaderData, useFetcher } from "@remix-run/react";
import Events from "../Events";

const sampleEvents = [
    {
        id: "event-1",
        name: "夏フェス 2026",
        slug: "summer-fes-2026",
        start_date: "2026-07-01T10:00:00Z",
        end_date: "2026-07-02T20:00:00Z",
        created_at: "2026-05-01T00:00:00Z",
    },
    {
        id: "event-2",
        name: "冬フェス 2026",
        slug: "winter-fes-2026",
        start_date: "2026-12-01T10:00:00Z",
        end_date: "2026-12-02T20:00:00Z",
        created_at: "2026-05-02T00:00:00Z",
    },
];

describe("Events", () => {
    beforeEach(() => {
        vi.mocked(useFetcher).mockReturnValue(mockFetcherIdle as ReturnType<typeof useFetcher>);
    });

    it("events が空のとき「イベントがありません」を表示する", () => {
        vi.mocked(useLoaderData).mockReturnValue({ events: [] });
        render(<Events />);
        expect(screen.getByText(/イベントがありません/)).toBeInTheDocument();
    });

    it("「最初のイベントを作成する」リンクを表示する", () => {
        vi.mocked(useLoaderData).mockReturnValue({ events: [] });
        render(<Events />);
        expect(screen.getByRole("link", { name: /最初のイベントを作成する/ })).toBeInTheDocument();
    });

    it("イベント一覧を表示する", () => {
        vi.mocked(useLoaderData).mockReturnValue({ events: sampleEvents });
        render(<Events />);
        expect(screen.getByText("夏フェス 2026")).toBeInTheDocument();
        expect(screen.getByText("冬フェス 2026")).toBeInTheDocument();
    });

    it("スラッグが表示される", () => {
        vi.mocked(useLoaderData).mockReturnValue({ events: sampleEvents });
        render(<Events />);
        expect(screen.getByText(/summer-fes-2026/)).toBeInTheDocument();
    });

    it("「新規作成」リンクを表示する", () => {
        vi.mocked(useLoaderData).mockReturnValue({ events: sampleEvents });
        render(<Events />);
        expect(screen.getByRole("link", { name: /新規作成/ })).toBeInTheDocument();
    });

    it("「編集」ボタンをクリックすると編集フォームが表示される", async () => {
        const user = userEvent.setup();
        vi.mocked(useLoaderData).mockReturnValue({ events: sampleEvents });
        render(<Events />);
        const editButtons = screen.getAllByRole("button", { name: "編集" });
        await user.click(editButtons[0]);
        expect(screen.getByDisplayValue("夏フェス 2026")).toBeInTheDocument();
    });

    it("編集フォームの「キャンセル」ボタンをクリックすると編集フォームが閉じる", async () => {
        const user = userEvent.setup();
        vi.mocked(useLoaderData).mockReturnValue({ events: sampleEvents });
        render(<Events />);
        await user.click(screen.getAllByRole("button", { name: "編集" })[0]);
        await user.click(screen.getByRole("button", { name: "キャンセル" }));
        expect(screen.queryByDisplayValue("夏フェス 2026")).not.toBeInTheDocument();
    });
});
