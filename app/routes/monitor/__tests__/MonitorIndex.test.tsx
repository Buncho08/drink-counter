import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();

vi.mock("@remix-run/react", () => ({
    useNavigate: vi.fn(() => mockNavigate),
}));

import MonitorIndex from "../_index";

describe("MonitorIndex", () => {
    it("タイトルと入力フォームを表示する", () => {
        render(<MonitorIndex />);
        expect(screen.getByText("モニター")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("event-slug")).toBeInTheDocument();
    });

    it("「開く」ボタンが存在する", () => {
        render(<MonitorIndex />);
        expect(screen.getByRole("button", { name: "開く" })).toBeInTheDocument();
    });

    it("スラッグを入力して送信するとナビゲートされる", async () => {
        const user = userEvent.setup();
        render(<MonitorIndex />);
        await user.type(screen.getByPlaceholderText("event-slug"), "my-event");
        await user.click(screen.getByRole("button", { name: "開く" }));
        expect(mockNavigate).toHaveBeenCalledWith("/monitor/my-event");
    });

    it("空のスラッグで送信してもナビゲートされない", async () => {
        mockNavigate.mockClear();
        const user = userEvent.setup();
        render(<MonitorIndex />);
        await user.click(screen.getByRole("button", { name: "開く" }));
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
