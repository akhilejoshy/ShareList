"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const STEPS = [
  { icon: "1", text: "Create your account" },
  { icon: "2", text: "Link your Instagram with a one-time code" },
  { icon: "3", text: "Share reels to @share__list and watch your list grow" },
];

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[linear-gradient(135deg,oklch(0.09_0_0),oklch(0.22_0.08_55)_70%)] md:flex md:flex-col md:justify-between md:p-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.1),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_80%,oklch(0.72_0.17_55_/_0.25),transparent_50%)]" />
        <div className="pointer-events-none absolute -left-10 bottom-1/4 grid grid-cols-3 gap-4 opacity-30 blur-[1px]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-28 w-20 -rotate-6 rounded-md bg-white/10" />
          ))}
        </div>

        <div className="relative text-4xl font-extrabold tracking-tight text-foreground">
          Share<span className="text-primary">list</span>
        </div>

        <div className="relative">
          <h2 className="max-w-md text-5xl font-bold leading-tight text-foreground">
            Start your collection in seconds.
          </h2>
          <ul className="mt-10 flex flex-col gap-4">
            {STEPS.map((s) => (
              <li key={s.text} className="flex items-center gap-4 text-base text-muted-foreground">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-foreground">
                  {s.icon}
                </span>
                {s.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-muted-foreground">
          No manual entry needed — just share what you&apos;re watching on Instagram.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 block text-3xl font-extrabold tracking-tight text-foreground md:hidden"
          >
            Share<span className="text-primary">list</span>
          </Link>

          <h1 className="text-3xl font-bold text-foreground">Create your account</h1>
          <p className="mt-2 text-base text-muted-foreground">It only takes a moment.</p>

          <form action={formAction} className="mt-10 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" placeholder="Username" required className="h-11" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                required
                className="h-11"
              />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={pending} className="mt-2 w-full" size="lg">
              {pending ? "Creating account…" : "Sign up"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
