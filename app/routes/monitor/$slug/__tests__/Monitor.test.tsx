import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

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

vi.mock("@remix-run/react", () => ({
    useLoaderData: vi.fn(),
    Link: ({ children, to, ...props }: { children: React.ReactNode; to: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a href={to} {...props}>{children}</a>
    ),
}));

import { useLoaderData } from "@remix-run/react";
import MonitorSlug from "../Monitor";

describe("Monitor (slug)", () => {
    it("event が null のとき「イベントが見つかりません」を表示する", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            event: null,
            counterData: null,
            slug: "unknown-slug",
        });
        render(<MonitorSlug />);
        expect(screen.getByText(/イベントが見つかりません/)).toBeInTheDocument();
    });

    it("スラッグ名をエラーメッセージに含める", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            event: null,
            counterData: null,
            slug: "test-slug",
        });
        render(<MonitorSlug />);
        expect(screen.getByText(/test-slug/)).toBeInTheDocument();
    });

    it("event があるときカウント数を表示する", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            event: { id: "event-1", name: "夏フェス 2026", slug: "summer-fes" },
            counterData: { id: "counter-1", count: 100, background_image_url: null },
            slug: "summer-fes",
        });
        render(<MonitorSlug />);
        expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("カウント数を表示する", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            event: { id: "event-1", name: "夏フェス 2026", slug: "summer-fes" },
            counterData: { id: "counter-1", count: 100, background_image_url: null },
            slug: "summer-fes",
        });
        render(<MonitorSlug />);
        expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    it("counterData が null でもクラッシュしない", () => {
        vi.mocked(useLoaderData).mockReturnValue({
            event: { id: "event-1", name: "夏フェス 2026", slug: "summer-fes" },
            counterData: null,
            slug: "summer-fes",
        });
        expect(() => render(<MonitorSlug />)).not.toThrow();
    });
});
