"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Film, Globe2, CheckCircle2 } from "lucide-react";
import { login } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Film, text: "Reels are identified automatically via TMDB" },
  { icon: Globe2, text: "Sorted by language, movies and series" },
  { icon: CheckCircle2, text: "Track what you've already watched" },
];

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[linear-gradient(135deg,oklch(0.22_0.08_55),oklch(0.09_0_0)_55%)] md:flex md:flex-col md:justify-between md:p-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_75%,oklch(0.72_0.17_55_/_0.25),transparent_50%)]" />
        <div className="pointer-events-none absolute -right-10 top-1/4 grid grid-cols-3 gap-4 opacity-30 blur-[1px]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-28 w-20 rotate-6 rounded-md bg-white/10" />
          ))}
        </div>

        <div className="relative text-4xl font-extrabold tracking-tight text-foreground">
          Share<span className="text-primary">list</span>
        </div>

        <div className="relative">
          <h2 className="max-w-md text-5xl font-bold leading-tight text-foreground">
            Every movie your friends share, saved in one place.
          </h2>
          <ul className="mt-10 flex flex-col gap-4">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-4 text-base text-muted-foreground">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-foreground">
                  <f.icon className="h-5 w-5" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-muted-foreground">
          Share a reel to <strong className="text-foreground">@share__list</strong> on Instagram
          and it shows up here automatically.
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

          <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-2 text-base text-muted-foreground">Log in to your Sharelist account.</p>

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
              {pending ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            No account yet?{" "}
            <Link href="/signup" className="text-primary underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
