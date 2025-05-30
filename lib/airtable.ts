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
// SubscriptionPackages table and helpers
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

/**
 * Return a SubscriptionPackage record whose StripePriceId matches.
 */
export async function getSubscriptionPackageByPriceId(
  priceId: string
): Promise<Airtable.Record<FieldSet> | null> {
  const recs = await SubscriptionPackages.select({
    filterByFormula: `{StripePriceId}='${priceId}'`,
    maxRecords: 1,
  }).firstPage();
  return recs[0] || null;
}

/**
 * Create or update a SubscriptionPackage for a given user,
 * storing meeting, pricing, duration, timezone, and slug details in one record.
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
  Duration,
  Price,
  Currency,
  Interval,
  TimeZone,
}: {
  uid: string;
  recordId?: string;
  forceCreate?: boolean;
  meetingTemplateId?: string | null;
  Title: string;
  FirstSession: string;
  Recurring: boolean;
  Frequency: string;
  RRule?: string;
  Duration?: number;
  Price: number;
  Currency: string;
  Interval: string;
  TimeZone?: string;
}): Promise<Airtable.Record<FieldSet>> {
  const userRec = await getUserRecord(uid);
  if (!userRec) throw new Error(`No Airtable user record for UID: ${uid}`);

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
  if (RRule) fields.RRule = RRule;
  if (typeof Duration === 'number') fields.Duration = Duration;
  if (meetingTemplateId) fields.MeetingTemplate = [meetingTemplateId];
  if (TimeZone) fields.TimeZone = TimeZone;

  let record: Airtable.Record<FieldSet>;
  if (forceCreate || !recordId) {
    record = await SubscriptionPackages.create(fields);
  } else {
    await SubscriptionPackages.update(recordId, fields);
    record = await SubscriptionPackages.find(recordId);
  }
  return record;
}

// ────────────────────────────────────────────────────────────────────────────────
// Meetings table and helpers
// ────────────────────────────────────────────────────────────────────────────────

export const Meetings = base('Meetings');

/**
 * Fetch up to 10 upcoming meetings for a given subscription package & user.
 */
export async function getMeetingsForPackage(
  pkgId: string,
  userId: string
): Promise<Airtable.Record<FieldSet>[]> {
  return Meetings.select({
    filterByFormula: `AND(
      {SubscriptionPackage}='${pkgId}',
      {UID}='${userId}'
    )`,
    sort: [{ field: 'StartsAt', direction: 'asc' }],
    maxRecords: 10,
  }).firstPage();
}

/**
 * Return the single next upcoming Meeting for this package & user.
 */
export async function getNextMeetingForPackage(
  pkgId: string,
  userId: string
): Promise<Airtable.Record<FieldSet> | null> {
  const now = new Date().toISOString();
  const records = await Meetings.select({
    filterByFormula: `AND(
      {SubscriptionPackage}='${pkgId}',
      {UID}='${userId}',
      DATETIME_PARSE({StartsAt}) > DATETIME_PARSE('${now}')
    )`,
    sort: [{ field: 'StartsAt', direction: 'asc' }],
    maxRecords: 1,
  }).firstPage();
  return records[0] || null;
}

/**
 * Create a new Meeting record tied to a subscription package.
 */
export async function createMeetingForPackage(
  pkgId: string,
  startsAt: string
): Promise<Airtable.Record<FieldSet>> {
  return Meetings.create({
    SubscriptionPackage: [pkgId],
    StartsAt: startsAt,
  });
}

// ────────────────────────────────────────────────────────────────────────────────
// StripeEvents table and helper
// ────────────────────────────────────────────────────────────────────────────────

export const StripeEvents = base('StripeEvents');

/**
 * Create a new StripeEvent record in Airtable.
 */
export async function createStripeEvent({
  eventId,
  type,
  createdAt,
  subscriptionPackageId,
  stripeCustomerId,
  amount,
  currency,
  rawPayload,
}: {
  eventId: string;
  type: string;
  createdAt: string;
  subscriptionPackageId: string;
  stripeCustomerId?: string;
  amount?: number;
  currency?: string;
  rawPayload: string;
}): Promise<Airtable.Record<FieldSet>> {
  return StripeEvents.create({
    EventId: eventId,
    Type: type,
    CreatedAt: createdAt,
    SubscriptionPackage: [subscriptionPackageId],
    StripeCustomerId: stripeCustomerId ?? null,
    Amount: amount ?? null,
    Currency: currency ?? null,
    RawPayload: rawPayload,
  });
}

// ────────────────────────────────────────────────────────────────────────────────
// Subscribers table and helper
// ────────────────────────────────────────────────────────────────────────────────

export const Subscribers = base('Subscribers');

/**
 * Upsert a Subscriber record keyed by (SubscriptionPackage, StripeCustomerId).
 */
export async function upsertSubscriber({
  subscriptionPackageId,
  stripeCustomerId,
  email,
  status,
  lastEventAt,
}: {
  subscriptionPackageId: string;
  stripeCustomerId: string;
  email: string;
  status: string;
  lastEventAt: string;
}): Promise<Airtable.Record<FieldSet>> {
  // Look for existing record
  const records = await Subscribers.select({
    filterByFormula: `AND(
      {SubscriptionPackage}='${subscriptionPackageId}',
      {StripeCustomerId}='${stripeCustomerId}'
    )`,
    maxRecords: 1,
  }).firstPage();

  if (records[0]) {
    // Update existing
    await Subscribers.update(records[0].id, {
      Email: email,
      Status: status,
      LastEventAt: lastEventAt,
    });
    return records[0];
  } else {
    // Create new
    return Subscribers.create({
      SubscriptionPackage: [subscriptionPackageId],
      StripeCustomerId: stripeCustomerId,
      Email: email,
      Status: status,
      LastEventAt: lastEventAt,
    });
  }
}
