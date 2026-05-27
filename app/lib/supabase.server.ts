import {
    createServerClient,
    parseCookieHeader,
    serializeCookieHeader,
} from "@supabase/ssr";
import { redirect } from "@remix-run/node";
import ws from "ws";

export function createSupabaseServerClient(
    request: Request,
    responseHeaders: Headers
) {
    return createServerClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
            // Node.js 20 はネイティブ WebSocket 非対応のため ws パッケージを使用
            realtime: { transport: ws as unknown as typeof WebSocket },
            cookies: {
                getAll() {
                    return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
                        ({ name, value }) => ({ name, value: value ?? "" })
                    );
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        responseHeaders.append(
                            "Set-Cookie",
                            serializeCookieHeader(name, value, options)
                        );
                    });
                },
            },
        }
    );
}

/** 認証必須のルートで使用。未認証なら /auth へリダイレクト */
export async function requireAuth(request: Request, responseHeaders: Headers) {
    const supabase = createSupabaseServerClient(request, responseHeaders);
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        throw redirect("/auth", { headers: responseHeaders });
    }
    return { supabase, user };
}
