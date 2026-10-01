import { createResource, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import HeartIcon from "~/components/HeartIcon";
import { SparkIcon, TicketIcon } from "~/components/Icons";
import { initial } from "~/components/PairBadge";
import { getDisplayName } from "~/lib/data/profile";
import type { Relationship } from "~/lib/data/types";

interface Props {
  myName: string;
  relationship: Relationship;
  userId: string;
  onDone: () => void;
}

// Full-screen "you're paired" moment shown once on both devices right after
// pairing, so the outcome is unmistakable before the dashboard appears.
export default function PairedMoment(props: Props) {
  const partnerId = () =>
    props.relationship.member_a === props.userId
      ? props.relationship.member_b
      : props.relationship.member_a;
  const [partner] = createResource(partnerId, (id) => getDisplayName(id).catch(() => null));
  const partnerName = () => partner() || "your partner";
  let btn: HTMLButtonElement | undefined;
  onMount(() => btn?.focus());

  return (
    <Portal>
      <div
        class="paired"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paired-title"
        onKeyDown={(e) => e.key === "Escape" && props.onDone()}
      >
        <div class="paired-stage" aria-hidden="true">
          <span class="paired-avatar paired-avatar--me">{initial(props.myName)}</span>
          <span class="paired-heart">
            <HeartIcon filled />
          </span>
          <span class="paired-avatar paired-avatar--partner">{initial(partnerName())}</span>
          <span class="paired-spark paired-spark--1" />
          <span class="paired-spark paired-spark--2" />
          <span class="paired-spark paired-spark--3" />
        </div>
        <p class="paired-eyebrow">Paired</p>
        <h2 id="paired-title" class="paired-title">
          {props.myName} <span class="amp">&amp;</span> {partnerName()}
        </h2>
        <ol class="paired-steps">
          <li>
            <span class="paired-step-icon paired-step-icon--give" aria-hidden="true">
              <HeartIcon filled />
            </span>
            <span>Notice &amp; give hearts</span>
          </li>
          <li>
            <span class="paired-step-icon paired-step-icon--mine" aria-hidden="true">
              <SparkIcon />
            </span>
            <span>Wish for treats</span>
          </li>
          <li>
            <span class="paired-step-icon paired-step-icon--theirs" aria-hidden="true">
              <TicketIcon />
            </span>
            <span>Spend hearts on them</span>
          </li>
        </ol>
        <button ref={btn} type="button" class="paired-go" onClick={() => props.onDone()}>
          Let's start
        </button>
      </div>
    </Portal>
  );
}
