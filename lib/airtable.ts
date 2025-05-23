// lib/airtable.ts

import Airtable, { FieldSet } from 'airtable';

// Configure Airtable
const apiKey = process.env.AIRTABLE_API_KEY!;
const baseId = process.env.AIRTABLE_BASE_ID!;

Airtable.configure({ apiKey });
const base = Airtable.base(baseId);

// ────────────────────────────────────────────────────────────────────────────────
// Users table and helpers
// ────────────────────────────────────────────────────────────────────────────────

export const Users = base('Users');

function getEnv(): string {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

export async function getUserRecord(
  uid: string
): Promise<Airtable.Record<FieldSet> | null> {
  const env = getEnv();
  const records = await Users.select({
    filterByFormula: `AND({UID}='${uid}',{Environment}='${env}')`,
    maxRecords: 1,
  }).firstPage();
  return records[0] || null;
}

export async function upsertAirtableUser({
  uid,
  email,
}: {
  uid: string;
  email: string;
}): Promise<void> {
  const env = getEnv();
  const fields = { UID: uid, Email: email, Environment: env };
  const existing = await getUserRecord(uid);
  if (existing) {
    await Users.update(existing.id, fields);
  } else {
    await Users.create(fields);
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// SubscriptionPackages table and helpers (unified meeting + pricing + slug)
// ────────────────────────────────────────────────────────────────────────────────

export const SubscriptionPackages = base('SubscriptionPackages');

/**
 * Fetch all SubscriptionPackages for a given user.
 */
export async function getSubscriptionPackages(
  uid: string
): Promise<Airtable.Record<FieldSet>[]> {
  const userRec = await getUserRecord(uid);
  if (!userRec) return [];
  return SubscriptionPackages.select({
    filterByFormula: `{UID}='${uid}'`,
  }).firstPage();
}

/**
 * Fetch a single SubscriptionPackage by record ID.
 */
export async function getSubscriptionPackageById(
  id: string
): Promise<Airtable.Record<FieldSet> | null> {
  try {
    return await SubscriptionPackages.find(id);
  } catch {
    return null;
  }
}

/**
 * Fetch a single SubscriptionPackage by its slug.
 */
export async function getSubscriptionPackageBySlug(
  slug: string
): Promise<Airtable.Record<FieldSet> | null> {
  const records = await SubscriptionPackages.select({
    filterByFormula: `{Slug}='${slug}'`,
    maxRecords: 1,
  }).firstPage();
  return records[0] || null;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

/**
 * Create or update a SubscriptionPackage for a given user,
 * storing meeting, pricing, and slug details in one record.
 * If `forceCreate` is true, always creates a new record.
 * If `recordId` is provided (and forceCreate is false), updates that record.
 */
export async function upsertSubscriptionPackage({
  uid,
  recordId,
  forceCreate,
  meetingTemplateId,
  Title,
  FirstSession,
  Recurring,
  Frequency,
  RRule,
  Price,
  Currency,
  Interval,
}: {
  uid: string;
  recordId?: string;
  forceCreate?: boolean;
  meetingTemplateId?: string | null;
  Title: string;
  FirstSession: string;   // ISO date-time string
  Recurring: boolean;
  Frequency: string;      // "None" | "Daily" | "Weekly" | "Monthly" | "Custom"
  RRule?: string;         // RFC-5545 string when Frequency === "Custom"
  Price: number;          // in cents
  Currency: string;       // e.g. "USD"
  Interval: string;       // "One-off" | "Monthly" | "Yearly"
}): Promise<Airtable.Record<FieldSet>> {
  const userRec = await getUserRecord(uid);
  if (!userRec) {
    throw new Error(`No Airtable user record for UID: ${uid}`);
  }

  // Assemble fields to write
  const fields: FieldSet = {
    UID: uid,
    Title,
    FirstSession,
    Recurring,
    Frequency,
    Price,
    Currency,
    Interval,
    Status: 'Draft',
    User: [userRec.id],
  };

  // Only set slug on create
  if (forceCreate || !recordId) {
    fields.Slug = generateSlug(Title);
  }

  if (RRule) {
    fields.RRule = RRule;
  }
  if (meetingTemplateId) {
    fields.MeetingTemplate = [meetingTemplateId];
  }

  let record: Airtable.Record<FieldSet>;
  if (forceCreate || !recordId) {
    record = await SubscriptionPackages.create(fields);
  } else {
    await SubscriptionPackages.update(recordId, fields);
    record = await SubscriptionPackages.find(recordId);
  }

  return record;
}
