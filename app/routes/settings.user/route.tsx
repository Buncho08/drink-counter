import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { requireAuth } from "~/lib/supabase.server";

export { default } from "./User";

/** ログインユーザーのプロフィールを取得 */
export async function loader({ request }: LoaderFunctionArgs) {
    const responseHeaders = new Headers();
    const { supabase, user } = await requireAuth(request, responseHeaders);

    const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name, created_at")
        .eq("id", user.id)
        .single();

    return json({ user, profile }, { headers: responseHeaders });
}

export async function action({ request }: ActionFunctionArgs) {
    const responseHeaders = new Headers();
    const { supabase, user } = await requireAuth(request, responseHeaders);

    const formData = await request.formData();
    const intent = String(formData.get("intent"));

    // プロフィール更新
    if (intent === "update") {
        const username = String(formData.get("username"));
        const fullName = String(formData.get("fullName"));

        const { error } = await supabase
            .from("profiles")
            .update({ username, full_name: fullName })
            .eq("id", user.id);
        if (error) {
            return json({ error: error.message }, { status: 400, headers: responseHeaders });
        }
        return json({ success: true }, { headers: responseHeaders });
    }

    return json(
        { error: "不明なリクエストです" },
        { status: 400, headers: responseHeaders }
    );
}
