// lib/airtable.ts
import Airtable, { FieldSet } from 'airtable';

// Configure Airtable
const apiKey    = process.env.AIRTABLE_API_KEY!;
const baseId    = process.env.AIRTABLE_BASE_ID!;
const tableName = 'Users';

Airtable.configure({ apiKey });
const base  = Airtable.base(baseId);
export const Users = base(tableName);

/**
 * Return the current environment string we’re using in Airtable.
 */
function getEnv(): string {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

/**
 * Fetch the single Airtable record matching both UID & current Environment.
 */
export async function getUserRecord(
  uid: string
): Promise<Airtable.Record<FieldSet> | null> {
  const env     = getEnv();
  const formula = `AND({UID} = '${uid}', {Environment} = '${env}')`;
  const records = await Users.select({
	filterByFormula: formula,
	maxRecords: 1,
  }).firstPage();
  return records[0] || null;
}

/**
 * Create or update a user row for the current environment.
 */
export async function upsertAirtableUser({
  uid,
  email,
}: {
  uid: string;
  email: string;
}): Promise<void> {
  const env    = getEnv();
  const fields = {
	UID: uid,
	Email: email,
	Environment: env,
  };

  const existing = await getUserRecord(uid);
  if (existing) {
	await Users.update(existing.id, fields);
  } else {
	await Users.create(fields);
  }
}
