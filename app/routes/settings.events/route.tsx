import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { requireAuth } from "~/lib/supabase.server";

export { default } from "./Events";

export async function loader({ request }: LoaderFunctionArgs) {
    const responseHeaders = new Headers();
    const { supabase, user } = await requireAuth(request, responseHeaders);
    const { data: events } = await supabase
        .from("events")
        .select("id, name, slug, start_date, end_date, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
    return json({ events: events ?? [] }, { headers: responseHeaders });
}

export async function action({ request }: ActionFunctionArgs) {
    const responseHeaders = new Headers();
    const { supabase, user } = await requireAuth(request, responseHeaders);
    const formData = await request.formData();
    const intent = String(formData.get("intent"));

    if (intent === "update") {
        const eventId = String(formData.get("eventId"));
        const name = String(formData.get("name"));
        const slug = String(formData.get("slug"));
        const startDate = String(formData.get("startDate"));
        const endDate = String(formData.get("endDate"));
        const { error } = await supabase
            .from("events")
            .update({ name, slug, start_date: startDate, end_date: endDate })
            .eq("id", eventId)
            .eq("owner_id", user.id);
        if (error) return json({ error: error.message }, { status: 400, headers: responseHeaders });
        return json({ success: true }, { headers: responseHeaders });
    }

    if (intent === "delete") {
        const eventId = String(formData.get("eventId"));
        const { error } = await supabase
            .from("events")
            .delete()
            .eq("id", eventId)
            .eq("owner_id", user.id);
        if (error) return json({ error: error.message }, { status: 400, headers: responseHeaders });
        return json({ success: true }, { headers: responseHeaders });
    }

    return json({ error: "不明なリクエストです" }, { status: 400, headers: responseHeaders });
}

