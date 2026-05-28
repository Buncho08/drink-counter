import { Form, useActionData } from "@remix-run/react";
import { useState } from "react";
import type { action } from "./route";

export default function Auth() {
    const actionData = useActionData<typeof action>();
    const [mode, setMode] = useState<"login" | "signup">("login");
    const actionIntent = actionData && "intent" in actionData ? actionData.intent : undefined;
    const actionError = actionData && "error" in actionData ? actionData.error : undefined;
    const actionSuccess = actionData && "success" in actionData ? actionData.success : undefined;
    const shouldShowMessage = !actionIntent || actionIntent === mode;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">drink-counter</h1>

                {/* モード切り替えタブ */}
                <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
                    <button
                        type="button"
                        onClick={() => setMode("login")}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === "login"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        ログイン
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("signup")}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === "signup"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        新規登録
                    </button>
                </div>

                {mode === "login" && (
                    <Form method="post" className="space-y-4">
                        <input type="hidden" name="intent" value="login" />
                        <Field label="メールアドレス" name="email" type="email" />
                        <Field label="パスワード" name="password" type="password" />
                        {shouldShowMessage && actionError && <ErrorMessage message={actionError} />}
                        <SubmitButton>ログイン</SubmitButton>
                    </Form>
                )}

                {mode === "signup" && (
                    <Form method="post" className="space-y-4">
                        <input type="hidden" name="intent" value="signup" />
                        <Field label="メールアドレス" name="email" type="email" />
                        <Field label="パスワード" name="password" type="password" />
                        <Field label="ユーザー名" name="username" type="text" />
                        <Field label="フルネーム" name="fullName" type="text" />
                        {shouldShowMessage && actionSuccess && <SuccessMessage message={actionSuccess} />}
                        {shouldShowMessage && actionError && <ErrorMessage message={actionError} />}
                        <SubmitButton>登録</SubmitButton>
                    </Form>
                )}
            </div>
        </div>
    );
}

function Field({ label, name, type }: { label: string; name: string; type: string }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
                type={type}
                name={name}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
        </div>
    );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
    return (
        <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors mt-2"
        >
            {children}
        </button>
    );
}

function ErrorMessage({ message }: { message: string }) {
    return (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {message}
        </p>
    );
}

function SuccessMessage({ message }: { message: string }) {
    return (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {message}
        </p>
    );
}