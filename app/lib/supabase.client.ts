import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ側の Supabase クライアント。
 * dev: Vite proxy 経由で Kong に接続（devcontainer で 127.0.0.1:54321 が不達のため）
 * prod: VITE_SUPABASE_URL を使用
 */
export function createSupabaseBrowserClient() {
    const supabaseUrl = import.meta.env.DEV
        ? window.location.origin
        : (import.meta.env.VITE_SUPABASE_URL as string);
    return createBrowserClient(
        supabaseUrl,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string
    );
}
