import { useLoaderData, useFetcher, Link } from "@remix-run/react";
import { useState } from "react";
import type { loader, action } from "./route";

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("ja-JP", {
        year: "numeric", month: "short", day: "numeric",
    });
}

export default function Events() {
    const { events } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();
    const [editingId, setEditingId] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-3xl mx-auto">
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">イベント管理</h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            <a href="/" className="hover:underline">ホーム</a>
                            {" / "}
                            <a href="/settings/user" className="hover:underline">ユーザー設定</a>
                        </p>
                    </div>
                    <Link
                        to="/settings/events/new"
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        ＋ 新規作成
                    </Link>
                </div>

                {/* イベント一覧 */}
                {events.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                        <p className="text-gray-400 mb-3">イベントがありません</p>
                        <Link to="/settings/events/new" className="text-sm text-blue-600 hover:underline">
                            最初のイベントを作成する →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {events.map((event) => (
                            <div key={event.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                {editingId === event.id ? (
                                    <div className="p-5">
                                        <fetcher.Form method="post">
                                            <input type="hidden" name="intent" value="update" />
                                            <input type="hidden" name="eventId" value={event.id} />
                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">イベント名</label>
                                                    <input type="text" name="name" defaultValue={event.name} required
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">スラッグ</label>
                                                    <input type="text" name="slug" defaultValue={event.slug} required
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">開始日時</label>
                                                    <input type="datetime-local" name="startDate" defaultValue={event.start_date.slice(0, 16)} required
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">終了日時</label>
                                                    <input type="datetime-local" name="endDate" defaultValue={event.end_date.slice(0, 16)} required
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button type="submit" onClick={() => setEditingId(null)}
                                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                                                    保存
                                                </button>
                                                <button type="button" onClick={() => setEditingId(null)}
                                                    className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors">
                                                    キャンセル
                                                </button>
                                            </div>
                                        </fetcher.Form>
                                    </div>
                                ) : (
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-gray-900 truncate">{event.name}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                /{event.slug} &middot; {formatDate(event.start_date)} 〜 {formatDate(event.end_date)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 ml-4 shrink-0">
                                            <a href={`/counter?event=${event.id}`}
                                                className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors font-medium">
                                                カウンター
                                            </a>
                                            <a href={`/monitor/${event.slug}`} target="_blank" rel="noreferrer"
                                                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                                                モニター ↗
                                            </a>
                                            <button type="button" onClick={() => setEditingId(event.id)}
                                                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                                                編集
                                            </button>
                                            <fetcher.Form method="post">
                                                <input type="hidden" name="intent" value="delete" />
                                                <input type="hidden" name="eventId" value={event.id} />
                                                <button type="submit"
                                                    onClick={(e) => { if (!confirm("削除しますか？")) e.preventDefault(); }}
                                                    className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
                                                    削除
                                                </button>
                                            </fetcher.Form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
