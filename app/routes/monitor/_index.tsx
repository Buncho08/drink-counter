import { useState } from "react";
import { useNavigate } from "@remix-run/react";

export default function MonitorIndex() {
    const [slug, setSlug] = useState("");
    const navigate = useNavigate();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = slug.trim();
        if (trimmed) navigate(`/monitor/${trimmed}`);
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
            <div className="w-full max-w-sm text-center">
                <h1 className="text-2xl font-bold text-white mb-2">モニター</h1>
                <p className="text-gray-400 text-sm mb-8">イベントのスラッグを入力してください</p>
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="event-slug"
                        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        開く
                    </button>
                </form>
            </div>
        </div>
    );
}
