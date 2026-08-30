import { useParams } from "react-router-dom";
import {
  COLLECTION_KIND,
  itemsForKind,
  itemsForTopic,
} from "@/lib/content";
import {
  COLLECTION_TITLE,
  titleForCollection,
  titleForTopic,
  useDocumentTitle,
} from "@/lib/pageTitle";
import { findTopic } from "@/lib/topics";
import { CollectionView } from "./CollectionView";

interface Props {
  route: "all" | "topic";
  onClose: () => void;
  covered?: boolean;
}

function CollectionAllRoute({ onClose, covered }: Omit<Props, "route">) {
  const { segment = "" } = useParams<{ segment: string }>();
  const kind = COLLECTION_KIND[segment];
  useDocumentTitle(kind ? titleForCollection(kind) : "", !!kind);
  if (!kind) {
    onClose();
    return null;
  }
  return (
    <CollectionView
      title={COLLECTION_TITLE[kind]}
      items={itemsForKind(kind)}
      onClose={onClose}
      covered={covered}
      active={kind}
    />
  );
}

function CollectionTopicRoute({ onClose, covered }: Omit<Props, "route">) {
  const { topicId = "" } = useParams<{ topicId: string }>();
  const topic = findTopic(topicId);
  useDocumentTitle(topic ? titleForTopic(topic) : "", !!topic);
  if (!topic) {
    onClose();
    return null;
  }
  return (
    <CollectionView
      eyebrow="Topic"
      title={topic.label}
      items={itemsForTopic(topic)}
      onClose={onClose}
      covered={covered}
    />
  );
}

// This whole module is a lazy boundary. The compatibility content aggregator
// above is still the right source for cross-domain collections such as
// /all/docs and explicitly docs-aware topics, but it no longer participates in
// the application's static/bootstrap graph.
export default function CollectionRoutes({ route, onClose, covered }: Props) {
  return route === "all" ? (
    <CollectionAllRoute onClose={onClose} covered={covered} />
  ) : (
    <CollectionTopicRoute onClose={onClose} covered={covered} />
  );
}
