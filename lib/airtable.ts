// lib/airtable.ts
import Airtable, { FieldSet } from 'airtable';

const apiKey    = process.env.AIRTABLE_API_KEY!;
const baseId    = process.env.AIRTABLE_BASE_ID!;
const tableName = 'Users';

Airtable.configure({ apiKey });
const base = Airtable.base(baseId);
export const Users = base(tableName);

export async function getUserRecord(uid: string): Promise<Airtable.Record<FieldSet> | null> {
  const [rec] = await Users.select({
	filterByFormula: `{UID} = '${uid}'`,
	maxRecords: 1,
  }).firstPage();
  return rec || null;
}

export async function upsertAirtableUser({
  uid,
  email,
}: {
  uid: string;
  email: string;
}): Promise<void> {
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const fields = {
	UID: uid,
	Email: email,
	Environment: env,
  };

  const existing = await getUserRecord(uid);
  if (existing) {
	// update existing record
	await Users.update(existing.id, fields);
  } else {
	// create new record
	await Users.create(fields);
  }
}
