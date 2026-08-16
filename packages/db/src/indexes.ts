import type { Db, IndexDescription } from "mongodb";
import { COLLECTIONS } from "./schema.js";
import { USER_COLLECTIONS } from "./users.js";

export interface IndexPlan {
  collection: string;
  indexes: IndexDescription[];
}

/**
 * Index plan for the whole database.
 *
 * Every query path is tenanted, so `guildId` leads each compound index; that
 * also keeps a future shard key straightforward. The bucket collection is
 * deliberately sparse on indexes because it holds by far the most documents.
 */
export function buildIndexPlan(retentionDays: number | null): IndexPlan[] {
  const bucketIndexes: IndexDescription[] = [
    {
      key: { reportCode: 1, fightId: 1, bucketIndex: 1, part: 1 },
      name: "bucket_lookup",
      unique: true,
    },
    { key: { guildId: 1, reportCode: 1 }, name: "bucket_by_guild" },
  ];

  if (retentionDays !== null) {
    // TTL fires on the field, so buckets written with a null expiry are exempt.
    bucketIndexes.push({
      key: { expiresAt: 1 },
      name: "bucket_ttl",
      expireAfterSeconds: 0,
    });
  }

  return [
    {
      collection: COLLECTIONS.reports,
      indexes: [
        { key: { code: 1 }, name: "report_code", unique: true },
        { key: { guildId: 1, startedAt: -1 }, name: "report_recent" },
        {
          key: { guildId: 1, "fights.encounter.encounterId": 1, startedAt: -1 },
          name: "report_by_encounter",
        },
        { key: { guildId: 1, ownerUserId: 1, startedAt: -1 }, name: "report_by_owner" },
      ],
    },
    { collection: COLLECTIONS.fightEventBuckets, indexes: bucketIndexes },
    {
      collection: USER_COLLECTIONS.users,
      indexes: [
        { key: { discordId: 1 }, name: "user_discord", unique: true },
        // Resolves an ingest token on every desktop connection.
        { key: { "tokens.hash": 1 }, name: "user_token_hash" },
        { key: { guildId: 1, "characters.playerId": 1 }, name: "user_characters" },
      ],
    },
    {
      collection: USER_COLLECTIONS.linkCodes,
      indexes: [
        { key: { code: 1 }, name: "link_code", unique: true },
        // Codes are short lived; Mongo expires them rather than a cleanup job.
        { key: { expiresAt: 1 }, name: "link_code_ttl", expireAfterSeconds: 0 },
      ],
    },
    {
      collection: COLLECTIONS.operationEvents,
      indexes: [
        { key: { code: 1 }, name: "operation_code", unique: true },
        { key: { guildId: 1, scheduledFor: 1 }, name: "operation_schedule" },
        {
          key: { discordMessageId: 1 },
          name: "operation_by_message",
          unique: true,
          sparse: true,
        },
      ],
    },
  ];
}

export async function ensureIndexes(db: Db, retentionDays: number | null): Promise<void> {
  for (const plan of buildIndexPlan(retentionDays)) {
    await db.collection(plan.collection).createIndexes(plan.indexes);
  }
}
