import { supabase } from "~/lib/supabase";

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function savePushSubscription(sub: PushSubscriptionKeys, userAgent: string): Promise<void> {
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: sub.p256dh,
    p_auth: sub.auth,
    p_user_agent: userAgent,
  });
  if (error) throw error;
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase.rpc("delete_push_subscription", { p_endpoint: endpoint });
  if (error) throw error;
}

export type TestPushStatus = "no_device" | "not_configured" | "too_soon" | "queued";

export async function sendTestPush(): Promise<TestPushStatus> {
  const { data, error } = await supabase.rpc("send_test_push");
  if (error) throw error;
  return ((data as { status?: TestPushStatus } | null)?.status ?? "queued");
}

export interface TestPushResult {
  status_code: number | null;
  body: string | null;
  error: string | null;
}

export async function testPushResult(): Promise<TestPushResult | null> {
  const { data, error } = await supabase.rpc("test_push_result");
  if (error) throw error;
  return (data as TestPushResult | null) ?? null;
}
