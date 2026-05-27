import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { requireAuth } from "~/lib/supabase.server";

export { default } from "./settings.events/new/New";

export async function loader({ request }: LoaderFunctionArgs) {
    const responseHeaders = new Headers();
    await requireAuth(request, responseHeaders);
    return json(null, { headers: responseHeaders });
}

export async function action({ request }: ActionFunctionArgs) {
    const responseHeaders = new Headers();
    const { supabase, user } = await requireAuth(request, responseHeaders);
    const formData = await request.formData();
    const name = String(formData.get("name"));
    const slug = String(formData.get("slug"));
    const startDate = String(formData.get("startDate"));
    const endDate = String(formData.get("endDate"));

    if (!startDate || !endDate) {
        return json({ error: "開始日時と終了日時を入力してください。" }, { status: 400, headers: responseHeaders });
    }
    if (new Date(endDate) <= new Date(startDate)) {
        return json({ error: "終了日時は開始日時より後に設定してください。" }, { status: 400, headers: responseHeaders });
    }

    const { error } = await supabase.from("events").insert({
        name,
        slug,
        owner_id: user.id,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
    });
    if (error) {
        if (error.code === "23505" && error.message.includes("events_slug_key")) {
            return json({ error: "このスラッグはすでに使われています。別のスラッグを入力してください。" }, { status: 400, headers: responseHeaders });
        }
        return json({ error: error.message }, { status: 400, headers: responseHeaders });
    }
    return redirect("/settings/events", { headers: responseHeaders });
}
