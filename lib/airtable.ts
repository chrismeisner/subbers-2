// lib/airtable.ts
import Airtable, { FieldSet } from 'airtable';

// Hard-code the table name instead of reading from env
const apiKey = process.env.AIRTABLE_API_KEY!;
const baseId = process.env.AIRTABLE_BASE_ID!;
const tableName = 'Users';

Airtable.configure({ apiKey });
const base = Airtable.base(baseId);
export const Users = base(tableName);

/**
 * Fetch the Airtable record whose UID field matches the given user ID.
 */
export async function getUserRecord(
  uid: string
): Promise<Airtable.Record<FieldSet> | null> {
  const records = await Users.select({
	filterByFormula: `{UID} = '${uid}'`,
	maxRecords: 1,
  }).firstPage();
  return records[0] || null;
}

/**
 * Create or update an Airtable user row, ensuring at minimum UID + email.
 */
export async function upsertAirtableUser({
  uid,
  email,
}: {
  uid: string;
  email: string;
}): Promise<void> {
  const existing = await getUserRecord(uid);
  const fields = { UID: uid, Email: email };
  if (existing) {
	await Users.update(existing.id, fields);
  } else {
	await Users.create(fields);
  }
}
