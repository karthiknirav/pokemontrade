import { AppShell } from "@/components/app-shell";
import { LiveChatPanel } from "@/components/live-chat-panel";
import { requireSession } from "@/lib/auth/guard";

export default async function ChatPage() {
  await requireSession();

  return (
    <AppShell
      title="Live Partner"
      subtitle="Use the built-in decision partner for quick tactical calls: one card vs many, show-floor negotiation, preorder sanity checks, and resale strategy."
    >
      <LiveChatPanel />
    </AppShell>
  );
}
