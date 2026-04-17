import { prisma } from "@/lib/db";

export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  responseId: string | null;
  createdAt: string;
};

export type StrategyProfile = {
  userId: string;
  goals: string;
  preferences: string;
  notes: string;
  updatedAt: string;
};

let initialized = false;

async function ensureChatTables() {
  if (initialized) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_strategy_profiles (
      user_id VARCHAR(191) NOT NULL PRIMARY KEY,
      goals TEXT NOT NULL DEFAULT '',
      preferences TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      role VARCHAR(32) NOT NULL,
      content TEXT NOT NULL,
      response_id VARCHAR(191) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX chat_messages_user_id_created_at_idx (user_id, created_at)
    )
  `);

  initialized = true;
}

function escapeValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function getStrategyProfile(userId: string): Promise<StrategyProfile> {
  await ensureChatTables();

  const rows = await prisma.$queryRawUnsafe<
    Array<{ user_id: string; goals: string; preferences: string; notes: string; updated_at: Date }>
  >(`SELECT user_id, goals, preferences, notes, updated_at FROM user_strategy_profiles WHERE user_id = '${escapeValue(userId)}' LIMIT 1`);

  const row = rows[0];
  if (!row) {
    return {
      userId,
      goals: "",
      preferences: "",
      notes: "",
      updatedAt: new Date(0).toISOString()
    };
  }

  return {
    userId: row.user_id,
    goals: row.goals,
    preferences: row.preferences,
    notes: row.notes,
    updatedAt: row.updated_at.toISOString()
  };
}

export async function saveStrategyProfile(userId: string, input: { goals?: string; preferences?: string; notes?: string }) {
  await ensureChatTables();

  const goals = escapeValue(input.goals ?? "");
  const preferences = escapeValue(input.preferences ?? "");
  const notes = escapeValue(input.notes ?? "");

  await prisma.$executeRawUnsafe(`
    INSERT INTO user_strategy_profiles (user_id, goals, preferences, notes)
    VALUES ('${escapeValue(userId)}', '${goals}', '${preferences}', '${notes}')
    ON DUPLICATE KEY UPDATE
      goals = VALUES(goals),
      preferences = VALUES(preferences),
      notes = VALUES(notes)
  `);

  return getStrategyProfile(userId);
}

export async function saveChatMessage(userId: string, input: { role: "user" | "assistant"; content: string; responseId?: string | null }) {
  await ensureChatTables();

  const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await prisma.$executeRawUnsafe(`
    INSERT INTO chat_messages (id, user_id, role, content, response_id)
    VALUES (
      '${escapeValue(id)}',
      '${escapeValue(userId)}',
      '${escapeValue(input.role)}',
      '${escapeValue(input.content)}',
      ${input.responseId ? `'${escapeValue(input.responseId)}'` : "NULL"}
    )
  `);

  return id;
}

export async function getRecentChatMessages(userId: string, limit = 12): Promise<StoredChatMessage[]> {
  await ensureChatTables();

  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; role: "user" | "assistant"; content: string; response_id: string | null; created_at: Date }>
  >(
    `SELECT id, role, content, response_id, created_at
     FROM chat_messages
     WHERE user_id = '${escapeValue(userId)}'
     ORDER BY created_at DESC
     LIMIT ${Math.max(1, Math.min(limit, 30))}`
  );

  return rows
    .reverse()
    .map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      responseId: row.response_id,
      createdAt: row.created_at.toISOString()
    }));
}
