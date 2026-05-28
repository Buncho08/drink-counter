import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export { default } from "./Auth";

/** ログイン済みなら /counter へリダイレクト */
export async function loader({ request }: LoaderFunctionArgs) {
    const responseHeaders = new Headers();
    const supabase = createSupabaseServerClient(request, responseHeaders);
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (user) {
        throw redirect("/counter", { headers: responseHeaders });
    }
    return json(null, { headers: responseHeaders });
}

export async function action({ request }: ActionFunctionArgs) {
    const responseHeaders = new Headers();
    const supabase = createSupabaseServerClient(request, responseHeaders);
    const formData = await request.formData();
    const intent = String(formData.get("intent"));
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    if (intent === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            return json(
                {
                    intent,
                    error:
                        error.message === "Invalid login credentials"
                            ? "メールアドレスまたはパスワードが正しくありません。"
                            : `ログインに失敗しました: ${error.message}`,
                },
                { status: 400, headers: responseHeaders }
            );
        }
        return redirect("/counter", { headers: responseHeaders });
    }

    if (intent === "signup") {
        const username = String(formData.get("username"));
        const fullName = String(formData.get("fullName"));
        const emailRedirectTo = new URL("/auth", new URL(request.url).origin).toString();
        // handle_new_user トリガーがプロフィールを自動作成する
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo,
                data: { username, full_name: fullName },
            },
        });
        if (error) {
            const message = error.message.toLowerCase().includes("email rate limit exceeded")
                ? "確認メールの送信回数が上限に達しました。少し時間をおいて再度お試しください。"
                : `新規登録に失敗しました: ${error.message}`;
            return json(
                { intent, error: message },
                { status: 400, headers: responseHeaders }
            );
        }
        return json(
            {
                intent,
                success:
                    "確認メールを送信しました。メール内のリンクを開いて登録を完了してください。",
            },
            { headers: responseHeaders }
        );
    }

    if (intent === "logout") {
        await supabase.auth.signOut();
        return redirect("/auth", { headers: responseHeaders });
    }

    return json({ error: "不明なリクエストです" }, { status: 400, headers: responseHeaders });
}
