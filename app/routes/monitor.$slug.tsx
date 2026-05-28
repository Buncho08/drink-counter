import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export { default } from "./monitor/$slug/Monitor";

export async function loader({ request, params }: LoaderFunctionArgs) {
    const responseHeaders = new Headers();
    const supabase = createSupabaseServerClient(request, responseHeaders);
    const slug = params.slug as string;

    const { data: event } = await supabase
        .from("events")
        .select("id, name, slug, start_date, end_date")
        .eq("slug", slug)
        .single();

    let counterData: {
        id: string;
        count: number;
        background_image_url: string | null;
        display_mode: string;
        display_text: string;
        display_text_size: number;
        display_text_color: string;
    } | null = null;

    if (event) {
        const { data } = await supabase
            .from("counter_data")
            .select("id, count, background_image_url, display_mode, display_text, display_text_size, display_text_color")
            .eq("event_id", event.id)
            .single();
        counterData = data;
    }

    return json({ event, counterData, slug }, { headers: responseHeaders });
}
