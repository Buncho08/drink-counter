import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { requireAuth } from "~/lib/supabase.server";

export { default } from "./Counter";

export function shouldRevalidate({
    formMethod,
    formData,
    defaultShouldRevalidate,
}: {
    formMethod?: string;
    formData?: FormData;
    defaultShouldRevalidate: boolean;
}) {
    if (formMethod?.toUpperCase() !== "POST") {
        return defaultShouldRevalidate;
    }

    const intent = String(formData?.get("intent") ?? "");
    const skipIntents = new Set([
        "delta",
        "increment",
        "decrement",
        "set",
        "uploadBackground",
        "setDisplayText",
    ]);

    if (skipIntents.has(intent)) {
        return false;
    }

    return defaultShouldRevalidate;
}

/**
 * ユーザーが owner または editor のイベント一覧と、
 * 選択中イベント（クエリパラメータ ?event=<eventId>、未指定時は先頭）の
 * カウンターデータを返す。
 */
export async function loader({ request }: LoaderFunctionArgs) {
    const responseHeaders = new Headers();
    const { supabase, user } = await requireAuth(request, responseHeaders);

    const url = new URL(request.url);
    const selectedEventId = url.searchParams.get("event");

    // owner_id で直接取得（トリガー未発火時のフォールバック）
    const { data: ownedEventsData } = await supabase
        .from("events")
        .select("id, name, slug, start_date, end_date")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

    // editor 権限があるイベントを取得
    const { data: editorPerms } = await supabase
        .from("event_permissions")
        .select("event:events(id, name, slug, start_date, end_date)")
        .eq("user_id", user.id)
        .eq("role", "editor");

    const ownedEvents = (ownedEventsData ?? []).map((e) => ({ ...e, role: "owner" as const }));
    const ownedIds = new Set(ownedEvents.map((e) => e.id));
    const editorEvents = (editorPerms ?? [])
        .flatMap((p) =>
            p.event
                ? [
                    p.event as unknown as {
                        id: string;
                        name: string;
                        slug: string;
                        start_date: string;
                        end_date: string;
                    },
                ]
                : []
        )
        .filter((e) => !ownedIds.has(e.id))
        .map((e) => ({ ...e, role: "editor" as const }));

    const events = [...ownedEvents, ...editorEvents] as {
        id: string;
        name: string;
        slug: string;
        start_date: string;
        end_date: string;
        role: string;
    }[];

    const selectedEvent = selectedEventId
        ? (events.find((e) => e.id === selectedEventId) ?? events[0])
        : events[0];

    let counterData: {
        id: string;
        count: number;
        background_image_url: string | null;
        display_mode: string;
        display_text: string;
        display_text_size: number;
        display_text_color: string;
        display_text_stroke_enabled: boolean;
        display_text_stroke_color: string;
    } | null = null;

    if (selectedEvent) {
        const { data } = await supabase
            .from("counter_data")
            .select("id, count, background_image_url, display_mode, display_text, display_text_size, display_text_color, display_text_stroke_enabled, display_text_stroke_color")
            .eq("event_id", selectedEvent.id)
            .single();
        counterData = data;
    }

    return json(
        { user, events, selectedEvent: selectedEvent ?? null, counterData },
        { headers: responseHeaders }
    );
}

export async function action({ request }: ActionFunctionArgs) {
    const responseHeaders = new Headers();
    const { supabase } = await requireAuth(request, responseHeaders);

    const formData = await request.formData();
    const intent = String(formData.get("intent"));
    const counterDataId = String(formData.get("counterDataId"));

    // カウント差分をまとめて適用（連打時のリクエスト数削減用）
    if (intent === "delta") {
        const delta = Number(formData.get("delta"));
        if (!Number.isInteger(delta) || delta === 0) {
            return json(
                { error: "無効な差分値です（0以外の整数）" },
                { status: 400, headers: responseHeaders }
            );
        }
        const { data, error } = await supabase.rpc("apply_counter_delta", {
            target_id: counterDataId,
            target_delta: delta,
        });
        if (error) {
            return json({ error: error.message }, { status: 400, headers: responseHeaders });
        }
        if (data === null) {
            return json(
                { error: "カウンターの更新に失敗しました（権限がないか、IDが不正です）" },
                { status: 403, headers: responseHeaders }
            );
        }
        return json({ count: data }, { headers: responseHeaders });
    }

    // カウントを 1 増加（アトミックな SQL 式を使用し、RLS 失敗を検知）
    if (intent === "increment") {
        const { data, error } = await supabase
            .rpc("increment_counter", { target_id: counterDataId });
        if (error) {
            return json({ error: error.message }, { status: 400, headers: responseHeaders });
        }
        if (data === null) {
            return json(
                { error: "カウンターの更新に失敗しました（権限がないか、IDが不正です）" },
                { status: 403, headers: responseHeaders }
            );
        }
        return json({ count: data }, { headers: responseHeaders });
    }

    // カウントを 1 減少（0 未満にならない、アトミック）
    if (intent === "decrement") {
        const { data, error } = await supabase
            .rpc("decrement_counter", { target_id: counterDataId });
        if (error) {
            return json({ error: error.message }, { status: 400, headers: responseHeaders });
        }
        if (data === null) {
            return json(
                { error: "カウンターの更新に失敗しました（権限がないか、IDが不正です）" },
                { status: 403, headers: responseHeaders }
            );
        }
        return json({ count: data }, { headers: responseHeaders });
    }

    // カウントを直接指定して更新
    if (intent === "set") {
        const count = Number(formData.get("count"));
        if (!Number.isInteger(count) || count < 0) {
            return json(
                { error: "無効なカウント値です（0以上の整数）" },
                { status: 400, headers: responseHeaders }
            );
        }
        const { data, error } = await supabase
            .from("counter_data")
            .update({ count })
            .eq("id", counterDataId)
            .select("count")
            .single();
        if (error || !data) {
            return json(
                { error: error?.message ?? "カウンターの更新に失敗しました（権限がないか、IDが不正です）" },
                { status: error ? 400 : 403, headers: responseHeaders }
            );
        }
        return json({ count: data.count }, { headers: responseHeaders });
    }

    // 背景画像をアップロードして URL を counter_data に保存
    // Supabase Storage バケット名: "backgrounds"（要事前作成）
    if (intent === "uploadBackground") {
        const file = formData.get("file") as File;
        const eventId = String(formData.get("eventId"));
        const fileExt = file.name.split(".").pop();
        const filePath = `${eventId}/background.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from("backgrounds")
            .upload(filePath, file, { upsert: true });
        if (uploadError) {
            return json(
                { error: uploadError.message },
                { status: 400, headers: responseHeaders }
            );
        }

        const {
            data: { publicUrl },
        } = supabase.storage.from("backgrounds").getPublicUrl(filePath);

        // dev環境ではgetPublicUrl()がDockerネットワーク内部URL（supabase_kong_...:8000）を返す。
        // ブラウザはViteプロキシ経由でのみStorageにアクセスできるため、
        // オリジン部分をリクエストのオリジン（localhost:5173等）に置き換える。
        // 本番環境ではSupabase CloudのURLをそのまま使用する。
        const storagePath = new URL(publicUrl).pathname;
        const requestOrigin = new URL(request.url).origin;
        const browserUrl =
            process.env.NODE_ENV === "development"
                ? requestOrigin + storagePath
                : publicUrl;

        const { error } = await supabase
            .from("counter_data")
            .update({ background_image_url: browserUrl })
            .eq("id", counterDataId);
        if (error) {
            return json({ error: error.message }, { status: 400, headers: responseHeaders });
        }
        return json({ backgroundUrl: browserUrl }, { headers: responseHeaders });
    }

    // モニターのフリーテキストを更新
    if (intent === "setDisplayText") {
        const displayText = String(formData.get("displayText"));
        const { error } = await supabase
            .from("counter_data")
            .update({ display_text: displayText })
            .eq("id", counterDataId);
        if (error) {
            return json({ error: error.message }, { status: 400, headers: responseHeaders });
        }
        return json({ displayText }, { headers: responseHeaders });
    }

    // モニターの表示モードを更新
    if (intent === "setDisplayMode") {
        const displayMode = String(formData.get("displayMode"));
        const validModes = ["count", "image1", "image2", "image3", "text"];
        if (!validModes.includes(displayMode)) {
            return json(
                { error: "無効な表示モードです" },
                { status: 400, headers: responseHeaders }
            );
        }
        const { error } = await supabase
            .from("counter_data")
            .update({ display_mode: displayMode })
            .eq("id", counterDataId);
        if (error) {
            return json({ error: error.message }, { status: 400, headers: responseHeaders });
        }
        return json({ displayMode }, { headers: responseHeaders });
    }

    // テキストの文字サイズを更新
    if (intent === "setDisplayTextSize") {
        const size = Number(formData.get("displayTextSize"));
        if (!Number.isInteger(size) || size < 10 || size > 400) {
            return json({ error: "無効なサイズ値です" }, { status: 400, headers: responseHeaders });
        }
        const { error } = await supabase
            .from("counter_data")
            .update({ display_text_size: size })
            .eq("id", counterDataId);
        if (error) {
            return json({ error: error.message }, { status: 400, headers: responseHeaders });
        }
        return json({ displayTextSize: size }, { headers: responseHeaders });
    }

    // テキストの文字色を更新
    if (intent === "setDisplayTextColor") {
        const color = String(formData.get("displayTextColor"));
        if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return json({ error: "無効なカラーコードです" }, { status: 400, headers: responseHeaders });
        }
        const { error } = await supabase
            .from("counter_data")
            .update({ display_text_color: color })
            .eq("id", counterDataId);
        if (error) {
            return json({ error: error.message }, { status: 400, headers: responseHeaders });
        }
        return json({ displayTextColor: color }, { headers: responseHeaders });
    }

    // テキストのフチ表示ON/OFFを更新
    if (intent === "setDisplayTextStrokeEnabled") {
        const enabled = formData.get("displayTextStrokeEnabled") === "true";
        const { error } = await supabase
            .from("counter_data")
            .update({ display_text_stroke_enabled: enabled })
            .eq("id", counterDataId);
        if (error) {
            return json({ error: error.message }, { status: 400, headers: responseHeaders });
        }
        return json({ displayTextStrokeEnabled: enabled }, { headers: responseHeaders });
    }

    // テキストのフチ色を更新
    if (intent === "setDisplayTextStrokeColor") {
        const color = String(formData.get("displayTextStrokeColor"));
        if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return json({ error: "無効なカラーコードです" }, { status: 400, headers: responseHeaders });
        }
        const { error } = await supabase
            .from("counter_data")
            .update({ display_text_stroke_color: color })
            .eq("id", counterDataId);
        if (error) {
            return json({ error: error.message }, { status: 400, headers: responseHeaders });
        }
        return json({ displayTextStrokeColor: color }, { headers: responseHeaders });
    }

    return json(
        { error: "不明なリクエストです" },
        { status: 400, headers: responseHeaders }
    );
}
