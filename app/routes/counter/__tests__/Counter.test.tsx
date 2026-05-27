import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { useLoaderData, useFetcher } from "@remix-run/react";
import Counter from "../Counter";

vi.mock("~/lib/supabase.client", () => ({
    createSupabaseBrowserClient: vi.fn(() => ({
        channel: vi.fn().mockReturnValue({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(),
        }),
        removeChannel: vi.fn(),
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        },
        realtime: {
            setAuth: vi.fn(),
        },
    })),
}));

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
    Form: ({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement> & { children: React.ReactNode }) => (
        <form {...props}>{children}</form>
    ),
    Link: ({ children, to, ...props }: { children: React.ReactNode; to: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a href={to} {...props}>{children}</a>
    ),
}));

const baseEvent = {
    id: "event-1",
    name: "夏フェス 2026",
    slug: "summer-fes-2026",
    start_date: "2026-07-01T10:00:00Z",
    end_date: "2026-07-02T20:00:00Z",
    role: "owner",
};

const baseCounterData = {
    id: "counter-1",
    count: 42,
    background_image_url: null,
};

describe("Counter", () => {
    beforeEach(() => {
        vi.mocked(useFetcher).mockReturnValue(mockFetcherIdle as ReturnType<typeof useFetcher>);
    });

    it("events が空のとき「イベントがありません」を表示する", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            events: [],
            selectedEvent: null,
            counterData: null,
            user: { id: "user-1", email: "test@example.com" },
        });
        render(<Counter />);
        expect(screen.getByText(/イベントがありません/)).toBeInTheDocument();
    });

    it("イベントを作成するリンクを表示する", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            events: [],
            selectedEvent: null,
            counterData: null,
            user: { id: "user-1", email: "test@example.com" },
        });
        render(<Counter />);
        expect(screen.getByRole("link", { name: /イベントを作成する/ })).toBeInTheDocument();
    });

    it("イベントと counterData があるときカウント値を表示する", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            events: [baseEvent],
            selectedEvent: baseEvent,
            counterData: baseCounterData,
            user: { id: "user-1", email: "test@example.com" },
        });
        render(<Counter />);
        expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("イベント名がセレクトに表示される", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            events: [baseEvent],
            selectedEvent: baseEvent,
            counterData: baseCounterData,
            user: { id: "user-1", email: "test@example.com" },
        });
        render(<Counter />);
        expect(screen.getByRole("option", { name: "夏フェス 2026" })).toBeInTheDocument();
    });

    it("インクリメントとデクリメントのボタンが表示される", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            events: [baseEvent],
            selectedEvent: baseEvent,
            counterData: baseCounterData,
            user: { id: "user-1", email: "test@example.com" },
        });
        render(<Counter />);
        expect(screen.getByRole("button", { name: "＋" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "−" })).toBeInTheDocument();
    });

    it("selectedEvent があり counterData がないとき「カウンターデータが見つかりません」を表示する", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            events: [baseEvent],
            selectedEvent: baseEvent,
            counterData: null,
            user: { id: "user-1", email: "test@example.com" },
        });
        render(<Counter />);
        expect(screen.getByText(/カウンターデータが見つかりません/)).toBeInTheDocument();
    });

    it("＋ボタンのフォームに intent=increment と counterDataId が含まれる", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            events: [baseEvent],
            selectedEvent: baseEvent,
            counterData: baseCounterData,
            user: { id: "user-1", email: "test@example.com" },
        });
        render(<Counter />);

        const incrementButton = screen.getByRole("button", { name: "＋" });
        const form = incrementButton.closest("form")!;

        const intentInput = form.querySelector<HTMLInputElement>("input[name='intent']");
        const counterDataIdInput = form.querySelector<HTMLInputElement>("input[name='counterDataId']");

        expect(intentInput?.value).toBe("increment");
        expect(counterDataIdInput?.value).toBe("counter-1");
    });

    it("−ボタンのフォームに intent=decrement と counterDataId が含まれる", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            events: [baseEvent],
            selectedEvent: baseEvent,
            counterData: baseCounterData,
            user: { id: "user-1", email: "test@example.com" },
        });
        render(<Counter />);

        const decrementButton = screen.getByRole("button", { name: "−" });
        const form = decrementButton.closest("form")!;

        const intentInput = form.querySelector<HTMLInputElement>("input[name='intent']");
        const counterDataIdInput = form.querySelector<HTMLInputElement>("input[name='counterDataId']");

        expect(intentInput?.value).toBe("decrement");
        expect(counterDataIdInput?.value).toBe("counter-1");
    });

    it("インクリメント送信中は＋ボタンが disabled になる", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            events: [baseEvent],
            selectedEvent: baseEvent,
            counterData: baseCounterData,
            user: { id: "user-1", email: "test@example.com" },
        });

        const submittingFetcher = {
            ...mockFetcherIdle,
            state: "submitting" as const,
            formData: new FormData(),
        };
        submittingFetcher.formData.set("intent", "increment");

        vi.mocked(useFetcher).mockReturnValue(
            submittingFetcher as unknown as ReturnType<typeof useFetcher>
        );

        render(<Counter />);
        expect(screen.getByRole("button", { name: "＋" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "−" })).not.toBeDisabled();
    });

    it("デクリメント送信中は−ボタンが disabled になる", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            events: [baseEvent],
            selectedEvent: baseEvent,
            counterData: baseCounterData,
            user: { id: "user-1", email: "test@example.com" },
        });

        const submittingFetcher = {
            ...mockFetcherIdle,
            state: "submitting" as const,
            formData: new FormData(),
        };
        submittingFetcher.formData.set("intent", "decrement");

        vi.mocked(useFetcher).mockReturnValue(
            submittingFetcher as unknown as ReturnType<typeof useFetcher>
        );

        render(<Counter />);
        expect(screen.getByRole("button", { name: "−" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "＋" })).not.toBeDisabled();
    });
});
