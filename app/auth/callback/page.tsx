"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Suspense } from "react";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      // hash-based implicit flow - supabase handles automatically
      router.replace("/");
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setStatus("error");
        setErrorMsg(error.message);
      } else {
        router.replace("/");
      }
    });
  }, [router, searchParams]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-8">
          <p className="text-sm text-destructive">ログインに失敗しました</p>
          <p className="text-xs text-muted-foreground">{errorMsg}</p>
          <a href="/" className="text-xs text-primary underline">トップに戻る</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">ログイン処理中...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
