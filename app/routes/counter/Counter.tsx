import { Form, useLoaderData, useFetcher, Link } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "~/lib/supabase.client";
import type { loader } from "./route";

export default function Counter() {
    const { events, selectedEvent, counterData } = useLoaderData<typeof loader>();
    const fetcherSet = useFetcher();
    const fetcherBg = useFetcher();
    const fetcherMode = useFetcher();
    const fetcherText = useFetcher();

    const [displayCount, setDisplayCount] = useState(counterData?.count ?? 0);
    const [countInput, setCountInput] = useState(counterData?.count ?? 0);
    const [showSetConfirm, setShowSetConfirm] = useState(false);
    const [pendingSetCount, setPendingSetCount] = useState(0);
    const [textInput, setTextInput] = useState(counterData?.display_text ?? "");
    const [showTextConfirm, setShowTextConfirm] = useState(false);
    const [pendingText, setPendingText] = useState("");

    // 未完了操作数: Realtime/loader更新をブロックするために使用
    const pendingOpsRef = useRef(0);

    // Supabaseブラウザクライアント（SSR時は生成しない遅延初期化）
    const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
    const getSupabase = () => {
        if (!supabaseRef.current) {
            supabaseRef.current = createSupabaseBrowserClient();
        }
        return supabaseRef.current;
    };

    // loaderの再バリデーション時、保留操作がなければ同期
    useEffect(() => {
        if (pendingOpsRef.current === 0) {
            const latest = counterData?.count ?? 0;
            setDisplayCount(latest);
            setCountInput(latest);
        }
    }, [counterData?.count]);

    useEffect(() => {
        setTextInput(counterData?.display_text ?? "");
    }, [counterData?.display_text]);

    // Realtimeサブスクリプション（counterData.idが変わった時だけ再作成）
    useEffect(() => {
        if (!counterData?.id) return;

        // サンプルと同様: subscribeの前にaccess_tokenをrealtimeへセット
        const supabase = getSupabase();
        let cancelled = false;
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (cancelled) return;
            if (session?.access_token) {
                supabase.realtime.setAuth(session.access_token);
            }
        });

        const channel = supabase
            .channel(`counter-${counterData.id}-${Date.now()}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "counter_data",
                    filter: `id=eq.${counterData.id}`,
                },
                (payload) => {
                    const updated = payload.new as { count: number };
                    // 保留操作がなければ確定値で上書き（操作中は楽観的表示を維持）
                    if (pendingOpsRef.current === 0) {
                        setDisplayCount(updated.count);
                        setCountInput(updated.count);
                    }
                }
            )
            .subscribe();

        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, [counterData?.id]);

    if (events.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">
                        イベントがありません。
                    </p>
                    <Link
                        to="/settings/events/new"
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        イベントを作成する
                    </Link>
                </div>
            </div>
        );
    }

    const isUploadingBg = fetcherBg.state !== "idle";
    const bgUploadError = fetcherBg.state === "idle" && (fetcherBg.data as { error?: string } | undefined)?.error;

    const displayModeOptions = [
        { value: "count", label: "カウント" },
        { value: "image1", label: "画像1（drink）" },
        { value: "image2", label: "画像2（gomen）" },
        { value: "image3", label: "画像3（アップロード画像）" },
        { value: "text", label: "文字入力" },
    ];
    // optimistic update: fetcherModeで送信中の値があればそちらを優先
    const optimisticMode = fetcherMode.formData?.get("displayMode") as string | null;
    const currentDisplayMode = optimisticMode ?? counterData?.display_mode ?? "count";

    const handleCountClick = async (intent: "increment" | "decrement") => {
        if (!counterData?.id) return;

        const delta = intent === "increment" ? 1 : -1;
        if (delta < 0 && displayCount <= 0) return;

        // 即座にUI更新（楽観的更新）
        setDisplayCount((prev) => Math.max(prev + delta, 0));
        pendingOpsRef.current++;

        const supabase = getSupabase();
        const { error } = await supabase.rpc("apply_counter_delta", {
            target_id: counterData.id,
            target_delta: delta,
        });

        pendingOpsRef.current--;

        if (error) {
            // エラー時はDBから再取得してロールバック
            const { data } = await supabase
                .from("counter_data")
                .select("count")
                .eq("id", counterData.id)
                .single();
            if (data) {
                setDisplayCount(data.count);
                setCountInput(data.count);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* ヘッダー */}
            <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* イベント選択 */}
                    <Form method="get">
                        <select
                            name="event"
                            defaultValue={selectedEvent?.id ?? ""}
                            onChange={(e) => e.currentTarget.form?.submit()}
                            className="text-sm font-medium text-gray-800 bg-transparent border-none outline-none cursor-pointer pr-1"
                        >
                            {events.map((e) => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    </Form>
                    {selectedEvent && (
                        <a
                            href={`/monitor/${selectedEvent.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                        >
                            モニターを開く ↗
                        </a>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        to="/settings/events"
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                    >
                        設定
                    </Link>
                    <LogoutButton />
                </div>
            </header>

            {/* メインエリア */}
            {selectedEvent && counterData ? (
                <main className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
                    {/* カウント表示 */}
                    <p
                        className="font-bold text-gray-900 leading-none select-none"
                        style={{ fontSize: "clamp(5rem, 25vw, 14rem)" }}
                    >
                        {displayCount}
                    </p>

                    {/* ＋ / − ボタン */}
                    <div className="flex items-center gap-8">
                        <button
                            type="button"
                            onClick={() => handleCountClick("decrement")}
                            className="w-20 h-20 rounded-full bg-gray-200 hover:bg-gray-300 active:scale-95 text-4xl font-light text-gray-700 transition-all flex items-center justify-center"
                        >
                            −
                        </button>

                        <button
                            type="button"
                            onClick={() => handleCountClick("increment")}
                            className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-4xl font-light text-white transition-all shadow-lg shadow-blue-200 flex items-center justify-center"
                        >
                            ＋
                        </button>
                    </div>



                    {/* 数値直接入力 */}
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            name="count"
                            min={0}
                            value={countInput}
                            onChange={(e) => setCountInput(Number(e.target.value))}
                            className="w-28 text-center px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                setPendingSetCount(countInput);
                                setShowSetConfirm(true);
                            }}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            セット
                        </button>
                    </div>

                    {/* 背景画像アップロード */}
                    <div className="w-full max-w-xs">
                        <p className="text-xs text-gray-400 text-center mb-2">背景画像</p>
                        {bgUploadError && (
                            <p className="text-xs text-red-500 text-center mb-1">{bgUploadError}</p>
                        )}
                        <fetcherBg.Form method="post" encType="multipart/form-data" className="flex items-center gap-2">
                            <input type="hidden" name="counterDataId" value={counterData.id} />
                            <input type="hidden" name="eventId" value={selectedEvent.id} />
                            <input type="hidden" name="intent" value="uploadBackground" />
                            <input
                                type="file"
                                name="file"
                                accept="image/*"
                                className="flex-1 text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-600 file:text-xs hover:file:bg-gray-200 file:cursor-pointer"
                            />
                            <button
                                type="submit"
                                disabled={isUploadingBg}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-lg text-xs font-medium transition-colors shrink-0"
                            >
                                {isUploadingBg ? "..." : "アップロード"}
                            </button>
                        </fetcherBg.Form>
                    </div>

                    {/* モニター表示切替 */}
                    <div className="w-full max-w-xs">
                        <p className="text-xs text-gray-400 text-center mb-2">モニター表示</p>
                        <fetcherMode.Form method="post" className="flex items-center gap-2">
                            <input type="hidden" name="counterDataId" value={counterData.id} />
                            <input type="hidden" name="intent" value="setDisplayMode" />
                            <select
                                name="displayMode"
                                value={currentDisplayMode}
                                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {displayModeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </fetcherMode.Form>
                    </div>

                    {/* 文字入力（displayMode === "text" のとき表示） */}
                    {currentDisplayMode === "text" && (
                        <div className="w-full max-w-xs">
                            <p className="text-xs text-gray-400 text-center mb-2">モニターに表示する文字</p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    placeholder="表示する文字を入力"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPendingText(textInput);
                                        setShowTextConfirm(true);
                                    }}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors shrink-0"
                                >
                                    セット
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-400">カウンターデータが見つかりません</p>
                </div>
            )}

            {/* セット確認モーダル */}
            {showSetConfirm && counterData && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-72 flex flex-col gap-4">
                        <p className="text-sm text-gray-700 text-center">
                            カウントを <span className="font-bold text-gray-900 text-lg">{pendingSetCount}</span> にセットしますか？
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                type="button"
                                onClick={() => setShowSetConfirm(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    fetcherSet.submit(
                                        { counterDataId: counterData.id, intent: "set", count: String(pendingSetCount) },
                                        { method: "post" }
                                    );
                                    setShowSetConfirm(false);
                                }}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                確認
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 文字入力セット確認モーダル */}
            {showTextConfirm && counterData && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4">
                        <p className="text-sm text-gray-700 text-center">
                            モニターに <span className="font-bold text-gray-900">「{pendingText}」</span> を表示しますか？
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                type="button"
                                onClick={() => setShowTextConfirm(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    fetcherText.submit(
                                        { counterDataId: counterData.id, intent: "setDisplayText", displayText: pendingText },
                                        { method: "post" }
                                    );
                                    setShowTextConfirm(false);
                                }}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                確認
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function LogoutButton() {
    return (
        <Form method="post" action="/auth">
            <input type="hidden" name="intent" value="logout" />
            <button
                type="submit"
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
                ログアウト
            </button>
        </Form>
    );
}
