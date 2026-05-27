import { describe, it, expect, vi, beforeEach } from "vitest";
import { action } from "../route";

// requireAuth をモック
vi.mock("~/lib/supabase.server", () => ({
    requireAuth: vi.fn(),
}));

import { requireAuth } from "~/lib/supabase.server";

function makeRequest(formData: Record<string, string>) {
    const body = new URLSearchParams(formData);
    return new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });
}

const COUNTER_ID = "counter-uuid-1";

describe("counter action", () => {
    let mockRpc: ReturnType<typeof vi.fn>;
    let mockUpdate: ReturnType<typeof vi.fn>;
    let mockSupabase: object;

    beforeEach(() => {
        mockRpc = vi.fn();
        mockUpdate = vi.fn();

        mockSupabase = {
            rpc: mockRpc,
            from: vi.fn().mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: mockUpdate,
                        }),
                    }),
                }),
            }),
        };

        vi.mocked(requireAuth).mockResolvedValue({
            supabase: mockSupabase as never,
            user: { id: "user-1" } as never,
        });
    });

    describe("increment", () => {
        it("supabase.rpc('increment_counter') を呼び出す", async () => {
            mockRpc.mockResolvedValue({ data: 43, error: null });

            const res = await action({
                request: makeRequest({ intent: "increment", counterDataId: COUNTER_ID }),
                params: {},
                context: {},
            });

            expect(mockRpc).toHaveBeenCalledWith("increment_counter", { target_id: COUNTER_ID });
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.count).toBe(43);
        });

        it("rpc が null を返した場合（RLS 失敗）は 403 を返す", async () => {
            mockRpc.mockResolvedValue({ data: null, error: null });

            const res = await action({
                request: makeRequest({ intent: "increment", counterDataId: COUNTER_ID }),
                params: {},
                context: {},
            });

            expect(res.status).toBe(403);
        });

        it("rpc がエラーを返した場合は 400 を返す", async () => {
            mockRpc.mockResolvedValue({ data: null, error: { message: "DB error" } });

            const res = await action({
                request: makeRequest({ intent: "increment", counterDataId: COUNTER_ID }),
                params: {},
                context: {},
            });

            expect(res.status).toBe(400);
        });
    });

    describe("decrement", () => {
        it("supabase.rpc('decrement_counter') を呼び出す", async () => {
            mockRpc.mockResolvedValue({ data: 41, error: null });

            const res = await action({
                request: makeRequest({ intent: "decrement", counterDataId: COUNTER_ID }),
                params: {},
                context: {},
            });

            expect(mockRpc).toHaveBeenCalledWith("decrement_counter", { target_id: COUNTER_ID });
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.count).toBe(41);
        });

        it("rpc が null を返した場合（RLS 失敗）は 403 を返す", async () => {
            mockRpc.mockResolvedValue({ data: null, error: null });

            const res = await action({
                request: makeRequest({ intent: "decrement", counterDataId: COUNTER_ID }),
                params: {},
                context: {},
            });

            expect(res.status).toBe(403);
        });
    });

    describe("set", () => {
        it("正常な値で update を呼び出す", async () => {
            mockUpdate.mockResolvedValue({ data: { count: 10 }, error: null });

            const res = await action({
                request: makeRequest({ intent: "set", counterDataId: COUNTER_ID, count: "10" }),
                params: {},
                context: {},
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.count).toBe(10);
        });

        it("負の値は 400 を返す", async () => {
            const res = await action({
                request: makeRequest({ intent: "set", counterDataId: COUNTER_ID, count: "-1" }),
                params: {},
                context: {},
            });

            expect(res.status).toBe(400);
        });

        it("非整数は 400 を返す", async () => {
            const res = await action({
                request: makeRequest({ intent: "set", counterDataId: COUNTER_ID, count: "1.5" }),
                params: {},
                context: {},
            });

            expect(res.status).toBe(400);
        });

        it("update が null を返した場合（RLS 失敗）は 403 を返す", async () => {
            mockUpdate.mockResolvedValue({ data: null, error: null });

            const res = await action({
                request: makeRequest({ intent: "set", counterDataId: COUNTER_ID, count: "5" }),
                params: {},
                context: {},
            });

            expect(res.status).toBe(403);
        });
    });

    it("不明な intent は 400 を返す", async () => {
        const res = await action({
            request: makeRequest({ intent: "unknown", counterDataId: COUNTER_ID }),
            params: {},
            context: {},
        });

        expect(res.status).toBe(400);
    });
});
