// lib/scheduler.ts

import { RRule } from 'rrule';
import {
  getAllSubscriptionPackages,
  getMeetingsForPackage,
  createMeetingForPackage,
} from '@/lib/airtable';

/**
 * For each “Live” subscription package, compute its next meeting date
 * based on FirstSession and RRule, then create a Meeting record if one
 * doesn’t already exist at that timestamp.
 */
export async function scheduleNextMeetings() {
  const today = new Date();
  console.log('[Scheduler] scheduleNextMeetings – today:', today.toISOString());

  // 1️⃣ Fetch only Live packages
  const livePkgs = await getAllSubscriptionPackages();
  console.log(`[Scheduler] Found ${livePkgs.length} live packages`);

  // 2️⃣ Process each package
  for (const pkg of livePkgs) {
	const pkgId = pkg.id;
	const fields = pkg.fields as any;
	const title = fields.Title;

	// Log the raw FirstSession value
	console.log(
	  `[Scheduler] Package ${pkgId} (“${title}”) – FirstSession raw value:`,
	  fields.FirstSession
	);
	const firstSess = new Date(fields.FirstSession);

	let nextDate: Date | null = null;

	// Log how we're interpreting the RRule
	if (fields.RRule) {
	  console.log(
		`[Scheduler] Package ${pkgId} (“${title}”) – interpreting RRule:`,
		fields.RRule
	  );
	  try {
		const rule = RRule.fromString(fields.RRule as string);
		console.log(`[Scheduler]   -> Rule frequency: ${rule.origOptions.freq}`);
		nextDate = rule.after(today, true);
	  } catch (e) {
		console.error(
		  `[Scheduler] Invalid RRule on package ${pkgId}:`,
		  fields.RRule,
		  e
		);
	  }
	} else {
	  console.log(
		`[Scheduler] Package ${pkgId} (“${title}”) has no RRule, using one-off logic`
	  );
	  if (today < firstSess) {
		nextDate = firstSess;
	  }
	}

	// 3️⃣ If we have a nextDate, de-duplicate then create
	if (nextDate) {
	  const iso = nextDate.toISOString();
	  console.log(
		`[Scheduler] Package ${pkgId} (“${title}”) – computed nextDate:`,
		iso
	  );

	  const existing = await getMeetingsForPackage(pkgId, fields.UID as string);
	  const existingStarts = new Set(existing.map(m => m.fields.StartsAt));

	  if (!existingStarts.has(iso)) {
		console.log(
		  `[Scheduler] Creating meeting for package ${pkgId} at ${iso}`
		);
		try {
		  const rec = await createMeetingForPackage(pkgId, iso);
		  console.log(
			`[Scheduler] Created Meeting ${rec.id} for package ${pkgId}`
		  );
		} catch (err) {
		  console.error(
			`[Scheduler] Failed to create Meeting for ${pkgId} at ${iso}:`,
			err
		  );
		}
	  } else {
		console.log(
		  `[Scheduler] Skipping creation for package ${pkgId} – meeting already exists at ${iso}`
		);
	  }
	} else {
	  console.log(
		`[Scheduler] Package ${pkgId} (“${title}”) – no upcoming date to schedule`
	  );
	}
  }

  console.log('[Scheduler] scheduleNextMeetings complete');
}
