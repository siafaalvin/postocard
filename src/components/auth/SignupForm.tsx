"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const STEPS = ["Identity", "Account", "Location", "Phone", "Vouch", "Review"] as const;
type Step = 0 | 1 | 2 | 3 | 4 | 5;

interface Form {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  zipCode: string;
  phoneNumber: string;
  vouchCode: string;
}

export function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<Form>({
    firstName: "", lastName: "", username: "",
    email: "", password: "",
    zipCode: "", phoneNumber: "", vouchCode: "",
  });
  const [error, setError] = useState("");
  const [usernameConflict, setUsernameConflict] = useState(false);
  const [loading, setLoading] = useState(false);
  const [challengeEvidence, setChallengeEvidence] = useState("");
  const [challengeSent, setChallengeSent] = useState(false);

  const set = (field: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  function canAdvance(): boolean {
    if (step === 0) return !!(form.firstName.trim() && form.lastName.trim() && form.username.trim());
    if (step === 1) return !!(form.email.trim() && form.password.length >= 8);
    return true; // steps 2-4 are optional
  }

  function advance(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUsernameConflict(false);
    if (step < 5) setStep((s) => (s + 1) as Step);
    else handleSubmit();
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim(),
        username:  form.username.trim(),
        password:  form.password,
        zipCode:   form.zipCode.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        vouchCode: form.vouchCode.trim() || undefined,
      }),
    });

    setLoading(false);
    const data = await res.json();

    if (!res.ok) {
      if (data.error === "username_conflict") {
        setUsernameConflict(true);
        setStep(0);
      } else {
        setError(typeof data.error === "string" ? data.error : "Something went wrong");
      }
      return;
    }

    router.push(data.paymentRequired === false ? "/login" : "/subscribe");
  }

  async function submitChallenge() {
    if (!challengeEvidence.trim()) return;
    setLoading(true);
    await fetch("/api/auth/username-challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.username.trim(), evidence: challengeEvidence.trim() }),
    });
    setLoading(false);
    setChallengeSent(true);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1.5">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                i < step ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : i === step ? "ring-2 ring-neutral-900 text-neutral-900 dark:ring-white dark:text-white"
                  : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
              )}
            >
              {i < step ? "✓" : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px w-4", i < step ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800")} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={advance} className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">{STEPS[step]}</h2>

        {step === 0 && (
          <>
            <div className="flex gap-3">
              <Input label="First name" value={form.firstName} onChange={set("firstName")} required maxLength={50} />
              <Input label="Last name"  value={form.lastName}  onChange={set("lastName")}  required maxLength={50} />
            </div>
            <Input
              label="Username"
              value={form.username}
              onChange={(e) => { set("username")(e); setUsernameConflict(false); }}
              required
              pattern="[a-zA-Z0-9_]+"
              minLength={3}
              maxLength={30}
              placeholder="letters, numbers, underscores"
            />
            {usernameConflict && !challengeSent && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>@{form.username}</strong> is taken. Try a different username, or challenge it if you have an older account elsewhere.
                </p>
                <textarea
                  value={challengeEvidence}
                  onChange={(e) => setChallengeEvidence(e.target.value)}
                  placeholder="Paste a link to your older account + its registration date…"
                  rows={2}
                  maxLength={1000}
                  className="mt-2 w-full resize-none rounded-lg border border-amber-200 bg-white p-2 text-sm dark:border-amber-800 dark:bg-neutral-900"
                />
                <button
                  type="button"
                  onClick={submitChallenge}
                  disabled={!challengeEvidence.trim() || loading}
                  className="mt-2 text-xs font-medium text-amber-700 underline disabled:opacity-40 dark:text-amber-300"
                >
                  Submit challenge
                </button>
              </div>
            )}
            {challengeSent && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Challenge submitted — we&apos;ll review it and contact you by email.
              </p>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <Input label="Email" type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
            <Input label="Password" type="password" value={form.password} onChange={set("password")} required minLength={8} autoComplete="new-password" />
          </>
        )}

        {step === 2 && (
          <>
            <Input label="Zip / Postal code" value={form.zipCode} onChange={set("zipCode")} maxLength={10} placeholder="Optional — not shown publicly" />
          </>
        )}

        {step === 3 && (
          <>
            <Input label="Phone number" type="tel" value={form.phoneNumber} onChange={set("phoneNumber")} maxLength={20} placeholder="Optional — for future SMS verification" />
            <p className="text-xs text-neutral-400">SMS verification is coming soon. Your number is stored securely and not shared.</p>
          </>
        )}

        {step === 4 && (
          <>
            <Input
              label="Vouch code (optional)"
              value={form.vouchCode}
              onChange={set("vouchCode")}
              maxLength={30}
              placeholder="Username of someone who vouches for you"
            />
            <p className="text-xs text-neutral-400">
              If an existing user has invited you, enter their username here. Skip this step if not applicable.
            </p>
          </>
        )}

        {step === 5 && (
          <div className="rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
            <p><span className="font-medium">Name:</span> {form.firstName} {form.lastName}</p>
            <p><span className="font-medium">Username:</span> @{form.username}</p>
            <p><span className="font-medium">Email:</span> {form.email}</p>
            {form.zipCode && <p><span className="font-medium">Zip:</span> {form.zipCode}</p>}
            {form.phoneNumber && <p><span className="font-medium">Phone:</span> {form.phoneNumber}</p>}
            {form.vouchCode && <p><span className="font-medium">Vouched by:</span> @{form.vouchCode}</p>}
            <p className="mt-2 text-neutral-500">After submitting, you&apos;ll pay $1 to activate your account.</p>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => { setStep((s) => (s - 1) as Step); setError(""); }}
              className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            >
              Back
            </button>
          )}
          <Button
            type="submit"
            loading={loading}
            disabled={!canAdvance()}
            className="flex-1"
          >
            {step === 5 ? "Create account" : step >= 2 ? "Continue" : "Next"}
          </Button>
        </div>

        {step >= 2 && step < 5 && (
          <button
            type="button"
            onClick={() => setStep((s) => (s + 1) as Step)}
            className="text-center text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Skip this step
          </button>
        )}
      </form>
    </div>
  );
}
