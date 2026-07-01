"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  workspaceName: string;
};

export function LoginForm({ workspaceName }: Props) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("not allowed") || error.message.includes("Signups")) {
        setError("このメールアドレスは登録されていません。管理者に連絡してください。");
      } else {
        setError(error.message);
      }
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-lg font-semibold">{workspaceName}</h1>
          <p className="text-center text-sm text-muted-foreground">
            メールアドレスを入力してください
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 rounded-lg bg-green-50 px-4 py-5 text-center">
            <Send className="h-6 w-6 text-green-600" />
            <p className="text-sm font-medium text-green-800">メールを送信しました</p>
            <p className="text-xs text-green-700">
              <strong>{email}</strong> 宛にログインリンクを送りました。<br />
              メールを確認してリンクをクリックしてください。
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@company.com"
              className="h-10"
              autoFocus
              required
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <Button type="submit" className="h-10 gap-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  送信中...
                </span>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  ログインリンクを送信
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
