import type { Item } from "@/lib/types";
import { youtubeThumb } from "@/lib/content";
import { chipColorFor } from "@/lib/chipColor";
import { useItemNavigate } from "@/lib/useItemNavigate";
import { MediaCover } from "./MediaCover";

interface Props {
  item: Item;
  chipColor?: string;
}

function PlayBadge() {
  return (
    <span className="talk-card-play" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none">
        <path d="M5 3.5L12 8L5 12.5V3.5Z" fill="currentColor" />
      </svg>
    </span>
  );
}

export function TalkCard({ item, chipColor }: Props) {
  const link = useItemNavigate(item);
  const thumb = item.cover ?? youtubeThumb(item.videoUrl);
  const chipBg =
    chipColor !== undefined
      ? chipColor
      : (item.kickerColor ?? chipColorFor(item.kicker));
  const chipStyle = chipBg ? { background: chipBg } : undefined;
  return (
    <a className="talk-card" href={link.href} onClick={link.onClick}>
      <div className="talk-card-thumb">
        {thumb ? (
          <>
            <MediaCover
              src={thumb}
              srcFallback={item.cover ? item.coverFallback : undefined}
              poster={item.poster}
              lqip={item.posterLqip ?? (item.cover ? item.coverLqip : undefined)}
              className="talk-card-media"
              bgSize={item.coverBgSize}
              bgPos={item.coverBgPos}
            />
            <PlayBadge />
          </>
        ) : (
          <div className="proj-media-text" aria-hidden="true">
            <span>{item.title}</span>
          </div>
        )}
      </div>
      <div className="talk-card-body">
        {item.kicker && (
          <div className="talk-card-chips">
            <span className="talk-card-chip" style={chipStyle}>
              {item.kicker}
            </span>
          </div>
        )}
        <h3 className="talk-card-title">{item.title}</h3>
        <p className="talk-card-desc card-desc">{item.desc}</p>
      </div>
    </a>
  );
}
