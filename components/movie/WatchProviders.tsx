interface WatchProvider {
  name: string;
  logoUrl: string | null;
  type: "flatrate" | "rent" | "buy";
}

interface WatchProvidersData {
  region: string;
  providers: WatchProvider[];
  link: string;
}

const ICON_TILE =
  "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 p-2 transition-transform hover:scale-105";

export default function WatchProviders({
  watchProviders,
  imdbId,
  type,
}: {
  watchProviders: WatchProvidersData | null | undefined;
  imdbId: string | null | undefined;
  type: string | undefined;
}) {
  if (!watchProviders?.providers.length && !imdbId) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {watchProviders?.providers.map((p) => (
        <a
          key={p.name}
          href={watchProviders.link}
          target="_blank"
          rel="noopener noreferrer"
          title={p.name}
          className={ICON_TILE}
        >
          {p.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.logoUrl} alt={p.name} className="h-full w-full rounded-lg object-contain" />
          ) : (
            <span className="text-center text-[10px] text-white">{p.name}</span>
          )}
        </a>
      ))}

      {imdbId && (
        <a
          href={`stremio://detail/${type === "series" ? "series" : "movie"}/${imdbId}/${imdbId}`}
          title="Open in Stremio — stream availability depends on your installed addons"
          className={ICON_TILE}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://cdn.simpleicons.org/stremio" alt="Stremio" className="h-full w-full object-contain" />
        </a>
      )}
    </div>
  );
}
