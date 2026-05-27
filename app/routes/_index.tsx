import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseServerClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return json({ isAuthenticated: !!user }, { headers: responseHeaders });
}

const LINKS = [
  { href: "/counter", label: "カウンター", description: "カウントを操作する" },
  { href: "/monitor", label: "モニター", description: "カウントをリアルタイム表示（?event=slug）" },
  { href: "/settings/events", label: "イベント管理", description: "イベントの作成・編集・削除" },
  { href: "/settings/user", label: "ユーザー設定", description: "プロフィールを編集" },
] as const;

export default function Index() {
  const { isAuthenticated } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">drink-counter</h1>
        <p className="text-sm text-gray-500 mb-8">飲み物の売れた数をリアルタイムで記録するアプリ</p>

        {isAuthenticated ? (
          <div className="space-y-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="flex items-center justify-between w-full p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-blue-700">{link.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{link.description}</p>
                </div>
                <span className="text-gray-300 group-hover:text-blue-400 text-lg">→</span>
              </Link>
            ))}
          </div>
        ) : (
          <Link
            to="/auth"
            className="flex items-center justify-center w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            ログイン / 新規登録
          </Link>
        )}
      </div>
    </div>
  );
}

