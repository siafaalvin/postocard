"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    const data = await res.json();

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Something went wrong");
      return;
    }

    router.push(data.paymentRequired === false ? "/login" : "/subscribe");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Email" type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
      <Input
        label="Username"
        value={form.username}
        onChange={set("username")}
        required
        pattern="[a-zA-Z0-9_]+"
        minLength={3}
        maxLength={30}
        placeholder="letters, numbers, underscores"
      />
      <Input label="Display name" value={form.displayName} onChange={set("displayName")} required maxLength={50} />
      <Input
        label="Password"
        type="password"
        value={form.password}
        onChange={set("password")}
        required
        minLength={8}
        autoComplete="new-password"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" loading={loading}>
        Create account
      </Button>
    </form>
  );
}
