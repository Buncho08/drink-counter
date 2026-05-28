import { Form, useLoaderData, useFetcher, Link } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "~/lib/supabase.client";
import type { loader } from "./route";

export default function Counter() {
    const { events, selectedEvent, counterData } = useLoaderData<typeof loader>();
    const fetcherCount = useFetcher();
    const fetcherSet = useFetcher();
    const fetcherBg = useFetcher();
    const fetcherMode = useFetcher();
    const fetcherText = useFetcher();

    const [committedCount, setCommittedCount] = useState(counterData?.count ?? 0);
    const [countInput, setCountInput] = useState(counterData?.count ?? 0);
    const [showSetConfirm, setShowSetConfirm] = useState(false);
    const [pendingSetCount, setPendingSetCount] = useState(0);
    const [textInput, setTextInput] = useState(counterData?.display_text ?? "");
    const [showTextConfirm, setShowTextConfirm] = useState(false);
    const [pendingText, setPendingText] = useState("");
    const [pendingDelta, setPendingDelta] = useState(0);
    const [inFlightDelta, setInFlightDelta] = useState(0);
    const prevFetcherState = useRef(fetcherCount.state);
    const pendingDeltaRef = useRef(pendingDelta);
    const inFlightDeltaRef = useRef(inFlightDelta);

    const isCounting = fetcherCount.state !== "idle";
    const displayCount = Math.max(committedCount + pendingDelta, 0);

    useEffect(() => {
        pendingDeltaRef.current = pendingDelta;
    }, [pendingDelta]);

    useEffect(() => {
        inFlightDeltaRef.current = inFlightDelta;
    }, [inFlightDelta]);

    // loaderの再バリデーションで最新値に同期（カウント変化時のみ）
    useEffect(() => {
        const latest = counterData?.count ?? 0;
        setCommittedCount(latest);
    }, [counterData?.count]);

    useEffect(() => {
        setCountInput(displayCount);
    }, [displayCount]);

    useEffect(() => {
        setTextInput(counterData?.display_text ?? "");
    }, [counterData?.display_text]);

    const submitDelta = (delta: number) => {
        if (!counterData?.id || delta === 0) return;
        setInFlightDelta(delta);
        fetcherCount.submit(
            { counterDataId: counterData.id, intent: "delta", delta: String(delta) },
            { method: "post" }
        );
    };

    // 送信完了時に inFlight を確定値へ反映し、未送信差分があれば続けてまとめ送信する。
    useEffect(() => {
        const becameIdle = prevFetcherState.current !== "idle" && fetcherCount.state === "idle";
        prevFetcherState.current = fetcherCount.state;

        if (!becameIdle) {
            return;
        }

        const sentDelta = inFlightDeltaRef.current;
        const hasCount =
            fetcherCount.data &&
            typeof fetcherCount.data === "object" &&
            "count" in fetcherCount.data &&
            typeof (fetcherCount.data as { count: unknown }).count === "number";

        if (sentDelta !== 0) {
            if (hasCount) {
                setCommittedCount((fetcherCount.data as { count: number }).count);
            }
            setPendingDelta((prev) => prev - sentDelta);
            setInFlightDelta(0);
            inFlightDeltaRef.current = 0;
        }

        const remaining = pendingDeltaRef.current - sentDelta;
        if (remaining !== 0 && counterData?.id) {
            submitDelta(remaining);
        }
    }, [fetcherCount.state, fetcherCount.data, counterData?.id]);

    // Realtimeサブスクリプション（counterData.idが変わった時だけ再作成）
    useEffect(() => {
        if (!counterData?.id) return;

        const supabase = createSupabaseBrowserClient();

        // サンプルと同様: subscribeの前にaccess_tokenをrealtimeへセット
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
                    setCommittedCount(updated.count);
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

    const handleCountClick = (intent: "increment" | "decrement") => {
        if (!counterData?.id) return;

        const delta = intent === "increment" ? 1 : -1;
        if (delta < 0 && displayCount <= 0) return;

        const nextPending = Math.max(pendingDeltaRef.current + delta, -committedCount);
        pendingDeltaRef.current = nextPending;
        setPendingDelta(nextPending);

        if (isCounting || inFlightDeltaRef.current !== 0) {
            return;
        }

        submitDelta(nextPending);
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
