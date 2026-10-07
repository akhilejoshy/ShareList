"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function TrailerPreview({ trailerUrl }: { trailerUrl: string }) {
  const [open, setOpen] = useState(false);
  const videoId = extractYouTubeId(trailerUrl);

  if (!videoId) {
    return (
      <a
        href={trailerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xl font-medium text-white hover:text-primary"
      >
        <Play className="h-5 w-5 fill-current" /> Watch trailer
      </a>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative aspect-video w-full max-w-sm overflow-hidden rounded-lg bg-card"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt="Trailer preview"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/50">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black">
            <Play className="h-5 w-5 fill-current" />
          </span>
        </div>
      </button>

      <DialogContent className="sm:max-w-2xl">
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title="Trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
