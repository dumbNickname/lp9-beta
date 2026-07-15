import { onMount, type ParentProps } from "solid-js";
import { initSession, subscribeToAuthChanges } from "~/lib/session";

export default function SessionProvider(props: ParentProps) {
  onMount(() => {
    void initSession();
  });
  subscribeToAuthChanges();
  return <>{props.children}</>;
}
