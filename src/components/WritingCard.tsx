import type { Item } from "@/lib/types";
import { chipColorFor } from "@/lib/chipColor";
import { useItemNavigate } from "@/lib/useItemNavigate";
import { MediaCover } from "./MediaCover";

interface Props {
  item: Item;
  chipColor?: string;
}

export function WritingCard({ item, chipColor }: Props) {
  const link = useItemNavigate(item);
  const bg =
    chipColor !== undefined
      ? chipColor
      : (item.kickerColor ?? chipColorFor(item.kicker));
  return (
    <a className="writing-card" href={link.href} onClick={link.onClick}>
      <div className="writing-card-thumb">
        {item.cover ? (
          <MediaCover
            src={item.cover}
            srcFallback={item.coverFallback}
            poster={item.poster}
            lqip={item.posterLqip ?? item.coverLqip}
            className="writing-card-media"
          />
        ) : (
          <div className="proj-media-text" aria-hidden="true">
            <span>{item.title}</span>
          </div>
        )}
      </div>
      <div className="writing-card-body">
        {item.kicker && (
          <span
            className="writing-card-chip"
            style={bg ? { background: bg } : undefined}
          >
            {item.kicker}
          </span>
        )}
        <h3 className="writing-card-title">{item.title}</h3>
        <p className="writing-card-desc card-desc">{item.desc}</p>
      </div>
    </a>
  );
}
