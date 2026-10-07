"use client";

import { useState, useTransition } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateLinkCodeValue } from "@/app/link/actions";

export default function LinkInstagramDialog({ linked }: { linked: boolean }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      setCode(await generateLinkCodeValue());
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setCode(null);
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={linked ? "Instagram linked" : "Link Instagram"}
            className="relative flex items-center justify-center rounded-full p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <Link2 className="h-5 w-5" />
            <span
              className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ring-2 ring-background ${
                linked ? "bg-emerald-400" : "bg-zinc-500"
              }`}
            />
          </button>
        }
      />
      <DialogContent className="flex min-h-[26rem] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Instagram</DialogTitle>
        </DialogHeader>

        {linked ? (
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            Your Instagram account is linked.
          </p>
        ) : code ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              DM this code to <strong className="text-foreground">@share__list</strong>:
            </p>
            <p className="rounded-md bg-background px-4 py-3 text-center text-2xl font-mono tracking-widest text-foreground">
              link {code}
            </p>
            <p className="text-xs text-muted-foreground">Expires in 15 minutes.</p>
          </div>
        ) : (
          <Button onClick={generate} disabled={pending} size="lg" className="w-full">
            {pending ? "Generating…" : "Generate link code"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
