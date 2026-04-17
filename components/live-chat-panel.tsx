"use client";

import { useEffect, useState } from "react";

type Message = {
  id?: string;
  role: "user" | "assistant";
  text: string;
};

type StrategyProfile = {
  goals: string;
  preferences: string;
  notes: string;
};

export function LiveChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("I have A$300. Would you buy one premium single or spread across 3 cards right now?");
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [profile, setProfile] = useState<StrategyProfile>({
    goals: "Australian profit-first buys with realistic exits",
    preferences: "Ask whether I want one premium card or multiple cards; prefer in-stock over preorder hype",
    notes: "Focus on Melbourne/AUD logic, bargain entries, and quick show-floor decisions"
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      try {
        const response = await fetch("/api/chat/context");
        const data = await response.json();
        if (!response.ok || cancelled) return;

        setMessages(
          (data.messages ?? []).map((message: { id: string; role: "user" | "assistant"; content: string; responseId?: string | null }) => ({
            id: message.id,
            role: message.role,
            text: message.content
          }))
        );
        setPreviousResponseId(data.messages?.at(-1)?.responseId ?? null);
        if (data.profile) {
          setProfile({
            goals: data.profile.goals ?? "",
            preferences: data.profile.preferences ?? "",
            notes: data.profile.notes ?? ""
          });
        }
      } catch {
        if (!cancelled) {
          setError("Could not load saved context.");
        }
      }
    }

    void loadContext();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSend() {
    if (!draft.trim()) return;
    const outgoing = draft.trim();
    setMessages((current) => [...current, { role: "user", text: outgoing }]);
    setDraft("");
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: outgoing, previousResponseId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Chat request failed");
      setPreviousResponseId(data.responseId ?? null);
      setMessages((current) => [...current, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat request failed");
    } finally {
      setIsPending(false);
    }
  }

  async function saveProfile() {
    setIsSavingProfile(true);
    setProfileMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/chat/context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Profile save failed");
      setProfile({
        goals: data.profile.goals ?? "",
        preferences: data.profile.preferences ?? "",
        notes: data.profile.notes ?? ""
      });
      setProfileMessage("Saved to DB");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile save failed");
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.72fr_0.28fr]">
      <div className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              Ask tactical questions about current buys, budget allocation, show-floor negotiation, or whether preorder prices are too hype-driven.
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id ?? `${message.role}-${index}`}
                className={`rounded-2xl p-4 text-sm ${message.role === "assistant" ? "bg-slate-50 text-slate-700" : "bg-ink text-white"}`}
              >
                {message.text}
              </div>
            ))
          )}
        </div>
        <div className="mt-4 space-y-3">
          <textarea
            className="min-h-[120px] w-full rounded-3xl border border-slate-200 px-4 py-3"
            onChange={(event) => setDraft(event.target.value)}
            value={draft}
          />
          <div className="flex items-center gap-3">
            <button className="rounded-2xl bg-pine px-4 py-3 text-white disabled:opacity-60" disabled={isPending} onClick={handleSend} type="button">
              {isPending ? "Thinking..." : "Send"}
            </button>
            {error ? <div className="text-sm text-rose-700">{error}</div> : null}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Saved Strategy</h3>
        <p className="mt-2 text-sm text-slate-600">
          This is stored in your local DB so the partner remembers how you like to buy, hold, and negotiate.
        </p>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-500">Goals</span>
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) => setProfile((current) => ({ ...current, goals: event.target.value }))}
              value={profile.goals}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-slate-500">Preferences</span>
            <textarea
              className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) => setProfile((current) => ({ ...current, preferences: event.target.value }))}
              value={profile.preferences}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-slate-500">Notes</span>
            <textarea
              className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) => setProfile((current) => ({ ...current, notes: event.target.value }))}
              value={profile.notes}
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              className="rounded-2xl bg-ink px-4 py-3 text-white disabled:opacity-60"
              disabled={isSavingProfile}
              onClick={saveProfile}
              type="button"
            >
              {isSavingProfile ? "Saving..." : "Save memory"}
            </button>
            {profileMessage ? <div className="text-sm text-pine">{profileMessage}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
