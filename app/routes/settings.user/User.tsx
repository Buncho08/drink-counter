import { useLoaderData, useFetcher } from "@remix-run/react";
import type { loader, action } from "./route";

export default function User() {
    const { user, profile } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();

    return (
        <div>
            <h1>ユーザー設定</h1>
            <p><a href="/counter">カウンターへ</a> | <a href="/settings/events">イベント管理</a></p>
            <p>メールアドレス: {user.email}</p>

            <fetcher.Form method="post">
                <input type="hidden" name="intent" value="update" />
                <div>
                    <label>ユーザー名 <input type="text" name="username" defaultValue={profile?.username ?? ""} required /></label>
                </div>
                <div>
                    <label>フルネーム <input type="text" name="fullName" defaultValue={profile?.full_name ?? ""} required /></label>
                </div>
                {fetcher.data && "error" in fetcher.data && <p>{fetcher.data.error}</p>}
                {fetcher.data && "success" in fetcher.data && <p>保存しました</p>}
                <button type="submit">保存</button>
            </fetcher.Form>
        </div>
    );
}