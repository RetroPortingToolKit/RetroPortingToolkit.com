import type { Item } from "@/lib/types";
import { chipColorFor } from "@/lib/chipColor";
import { useItemNavigate } from "@/lib/useItemNavigate";
import { MediaCover } from "./MediaCover";

interface Props {
  item: Item;
  chipColor?: string;
}

export function ProjectCard({ item, chipColor }: Props) {
  const link = useItemNavigate(item);
  const bg =
    chipColor !== undefined
      ? chipColor
      : (item.kickerColor ?? chipColorFor(item.kicker));
  return (
    <a className="proj-card" href={link.href} onClick={link.onClick}>
      <div className="proj-media">
        {item.cover ? (
          <MediaCover
            src={item.cover}
            srcFallback={item.coverFallback}
            poster={item.poster}
            lqip={item.posterLqip ?? item.coverLqip}
            className="img"
          />
        ) : (
          <div className="proj-media-text" aria-hidden="true">
            <span>{item.title}</span>
          </div>
        )}
      </div>
      <div className="proj-body">
        {item.kicker && (
          <span
            className="proj-card-chip"
            style={bg ? { background: bg } : undefined}
          >
            {item.kicker}
          </span>
        )}
        <h3 className="proj-title">{item.title}</h3>
        <p className="proj-desc card-desc">{item.desc}</p>
        {item.tags.length > 0 && (
          <div className="proj-card-tags">
            {item.tags.map((t) => (
              <span key={t} className="proj-tag">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}
