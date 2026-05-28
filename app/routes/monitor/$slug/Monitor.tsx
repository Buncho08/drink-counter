import { useLoaderData, Link } from "@remix-run/react";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "~/lib/supabase.client";
import type { loader } from "~/routes/monitor.$slug";

const DISPLAY_IMAGES: Record<string, string> = {
    image1: "/drink.png",
    image2: "/gomenne.png",
};

export default function Monitor() {
    const defaultUrl = '/background-movie.mp4';
    const { event, counterData, slug } = useLoaderData<typeof loader>();

    const [realtimeCount, setRealtimeCount] = useState(counterData?.count ?? null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState(counterData?.background_image_url ?? null);
    const [displayMode, setDisplayMode] = useState(counterData?.display_mode ?? "count");
    const [displayText, setDisplayText] = useState(counterData?.display_text ?? "");

    // loaderの再バリデーションで最新値に同期
    useEffect(() => {
        const nextCount = counterData?.count ?? null;
        const nextImageUrl = counterData?.background_image_url ?? null;
        const nextMode = counterData?.display_mode ?? "count";
        const nextText = counterData?.display_text ?? "";

        setRealtimeCount((prev) => (prev === nextCount ? prev : nextCount));
        setUploadedImageUrl((prev) => (prev === nextImageUrl ? prev : nextImageUrl));
        setDisplayMode((prev) => (prev === nextMode ? prev : nextMode));
        setDisplayText((prev) => (prev === nextText ? prev : nextText));
    }, [counterData?.count, counterData?.background_image_url, counterData?.display_mode, counterData?.display_text]);

    // Realtimeサブスクリプション（counterData.idが変わった時だけ再作成）
    useEffect(() => {
        if (!counterData?.id) return;

        const supabase = createSupabaseBrowserClient();

        // サンプルと同様: access_tokenがあればrealtimeへセット（なければanonキーで動作）
        let cancelled = false;
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (cancelled) return;
            if (session?.access_token) {
                supabase.realtime.setAuth(session.access_token);
            }
        });

        const channel = supabase
            .channel(`monitor-${counterData.id}-${Date.now()}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "counter_data",
                    filter: `id=eq.${counterData.id}`,
                },
                (payload) => {
                    const updated = payload.new as {
                        count: number;
                        background_image_url: string | null;
                        display_mode: string;
                        display_text: string;
                    };
                    const nextCount = updated.count;
                    const nextImageUrl = updated.background_image_url;
                    const nextMode = updated.display_mode ?? "count";
                    const nextText = updated.display_text ?? "";

                    setRealtimeCount((prev) => (prev === nextCount ? prev : nextCount));
                    setUploadedImageUrl((prev) => (prev === nextImageUrl ? prev : nextImageUrl));
                    setDisplayMode((prev) => (prev === nextMode ? prev : nextMode));
                    setDisplayText((prev) => (prev === nextText ? prev : nextText));
                }
            )
            .subscribe();

        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, [counterData?.id]);

    if (!event) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center text-center p-6">
                <div>
                    <p className="text-white text-xl mb-2">イベントが見つかりません</p>
                    <p className="text-gray-400 text-sm mb-6">スラッグ「{slug}」に該当するイベントがありません</p>
                    <Link to="/monitor" className="text-blue-400 hover:underline text-sm">← 戻る</Link>
                </div>
            </div>
        );
    }

    return (
        <div className='h-screen w-full bg-black flex justify-center items-center'>
            <div className='flex justify-center items-center h-full bg-black'>
                <div className='font-noto h-[770px] w-[1220px] relative'>
                    {displayMode === "count" && (realtimeCount ?? 0) < 1000 && (
                        <>
                            <video autoPlay loop playsInline muted className='h-full w-full'>
                                <source src={defaultUrl} type="video/mp4" />
                            </video>
                            <div className='absolute w-full bottom-[7rem] text-center mx-auto my-0'>
                                <p
                                    style={{ WebkitTextStroke: "7px #000", paintOrder: "stroke" }}
                                    className='text-[250px] font-extrabold text-yellow-500'
                                >
                                    {realtimeCount}
                                </p>
                            </div>
                        </>
                    )}
                    {displayMode === "count" && (realtimeCount ?? 0) >= 1000 && (
                        <>
                            <video autoPlay loop playsInline muted className='h-full w-full'>
                                <source src="/bonus.mp4" type="video/mp4" />
                            </video>
                            <div className='absolute right-[18.3rem] top-[4rem] text-center my-0'>
                                <p className='text-[90px] font-extrabold text-black'>
                                    {realtimeCount}
                                </p>
                            </div>
                        </>
                    )}
                    {(displayMode === "image1" || displayMode === "image2") && (
                        <img
                            src={DISPLAY_IMAGES[displayMode]}
                            alt={displayMode}
                            className='h-full w-full object-contain'
                        />
                    )}
                    {displayMode === "image3" && uploadedImageUrl && (
                        <img
                            src={uploadedImageUrl}
                            alt="uploaded background"
                            className='h-full w-full object-contain'
                        />
                    )}
                    {displayMode === "image3" && !uploadedImageUrl && (
                        <div className='h-full w-full flex items-center justify-center'>
                            <p className='text-gray-500 text-xl'>画像がアップロードされていません</p>
                        </div>
                    )}
                    {displayMode === "text" && (
                        <>
                            <video autoPlay loop playsInline muted className='h-full w-full'>
                                <source src="/background-movie-free-text.mp4" type="video/mp4" />
                            </video>
                            <div className='absolute w-full top-1/2 -translate-y-1/2 text-center px-4'>
                                <p
                                    style={{ WebkitTextStroke: "7px #000", paintOrder: "stroke" }}
                                    className='text-[120px] font-extrabold text-yellow-500 leading-tight break-words'
                                >
                                    {displayText}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
