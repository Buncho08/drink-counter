import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { requireAuth } from "~/lib/supabase.server";

/** /settings → /settings/events へリダイレクト */
export async function loader({ request }: LoaderFunctionArgs) {
    const responseHeaders = new Headers();
    await requireAuth(request, responseHeaders);
    throw redirect("/settings/events", { headers: responseHeaders });
}

export default function SettingsIndex() {
    return null;
}
