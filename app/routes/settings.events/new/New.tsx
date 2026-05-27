import { Form, Link, useActionData, useNavigation } from "@remix-run/react";

export default function New() {
    const actionData = useActionData<{ error?: string }>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-lg mx-auto">
                <div className="mb-6">
                    <Link
                        to="/settings/events"
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                        ← イベント一覧に戻る
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 mt-3">新規イベント作成</h1>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <Form method="post" className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                イベント名 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                required
                                placeholder="例: 夏フェス 2026"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                スラッグ <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                                <span className="px-3 py-2 bg-gray-50 text-gray-400 text-sm border-r border-gray-300 shrink-0">
                                    /monitor/
                                </span>
                                <input
                                    type="text"
                                    name="slug"
                                    required
                                    placeholder="summer-fes-2026"
                                    className="flex-1 px-3 py-2 text-sm outline-none"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                モニター URL に使われます（英小文字・数字・ハイフンのみ）
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    開始日時 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    name="startDate"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    終了日時 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    name="endDate"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {actionData?.error && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                {actionData.error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            {isSubmitting ? "作成中..." : "作成する"}
                        </button>
                    </Form>
                </div>
            </div>
        </div>
    );
}
