// lib/scheduler.ts

import { RRule, RRuleOptions } from 'rrule';
import {
  getAllSubscriptionPackages,
  getSubscriptionPackageById,
  getMeetingsForPackage,
  createMeetingForPackage,
} from '@/lib/airtable';

/**
 * For each “Live” subscription package, compute its next meeting date
 * and create a Meeting record if one doesn’t already exist at that timestamp.
 */
export async function scheduleNextMeetings() {
  const today = new Date();
  console.log('[Scheduler] scheduleNextMeetings – today:', today.toISOString());

  // 1️⃣ Fetch only Live packages
  const livePkgs = await getAllSubscriptionPackages();
  console.log(`[Scheduler] Found ${livePkgs.length} live packages`);

  for (const pkg of livePkgs) {
	const pkgId = pkg.id;
	const fields = pkg.fields as any;
	const title = fields.Title;
	const firstSessIso = fields.FirstSession;
	const firstSess = new Date(firstSessIso);
	let nextDate: Date | null = null;

	// 2️⃣ Compute next occurrence, anchoring dtstart at FirstSession
	if (fields.RRule) {
	  console.log(
		`[Scheduler] Package ${pkgId} (“${title}”) – interpreting RRule:`,
		fields.RRule
	  );
	  try {
		// Parse stored RRULE into options
		const opts: Partial<RRuleOptions> = RRule.parseString(fields.RRule as string);
		// Anchor rule at the original first session date/time
		opts.dtstart = firstSess;
		const rule = new RRule(opts as RRuleOptions);
		nextDate = rule.after(today, true);
		console.log(
		  `[Scheduler]   -> anchored dtstart=${firstSess.toISOString()}, computed nextDate=${nextDate?.toISOString()}`
		);
	  } catch (e) {
		console.error(
		  `[Scheduler] Invalid RRule on ${pkgId}:`,
		  fields.RRule,
		  e
		);
	  }
	} else {
	  console.log(
		`[Scheduler] Package ${pkgId} (“${title}”) has no RRule, using one-off logic: FirstSession = ${firstSessIso}`
	  );
	  if (today < firstSess) {
		nextDate = firstSess;
		console.log(
		  `[Scheduler]   -> nextDate set to FirstSession: ${nextDate.toISOString()}`
		);
	  }
	}

	// 3️⃣ If we have a nextDate, de-duplicate then create
	if (nextDate) {
	  const iso = nextDate.toISOString();
	  console.log(
		`[Scheduler] Package ${pkgId} (“${title}”) – scheduling nextDate:`,
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

/**
 * Compute and schedule exactly one next meeting for the given package ID.
 */
export async function scheduleNextMeetingForPackage(pkgId: string) {
  console.log(
	`[Scheduler Single] scheduleNextMeetingForPackage – pkgId: ${pkgId}`
  );

  const pkg = await getSubscriptionPackageById(pkgId);
  if (!pkg || (pkg.fields as any).Status !== 'Live') {
	console.log(
	  `[Scheduler Single] Package ${pkgId} not found or not live, skipping.`
	);
	return;
  }

  const fields = pkg.fields as any;
  const title = fields.Title;
  const today = new Date();
  const firstSessIso = fields.FirstSession;
  const firstSess = new Date(firstSessIso);
  console.log(
	`[Scheduler Single] today=${today.toISOString()}, FirstSession=${firstSessIso}, RRule=${fields.RRule}`
  );

  let nextDate: Date | null = null;

  if (fields.RRule) {
	console.log(
	  `[Scheduler Single] interpreting RRule: ${fields.RRule}`
	);
	try {
	  const opts: Partial<RRuleOptions> = RRule.parseString(fields.RRule as string);
	  opts.dtstart = firstSess;
	  const rule = new RRule(opts as RRuleOptions);
	  nextDate = rule.after(today, true);
	  console.log(
		`[Scheduler Single] anchored dtstart=${firstSess.toISOString()}, computed nextDate=${nextDate?.toISOString()}`
	  );
	} catch (e) {
	  console.error(
		`[Scheduler Single] Invalid RRule on ${pkgId}:`,
		fields.RRule,
		e
	  );
	}
  } else {
	console.log(
	  `[Scheduler Single] no RRule, one-off logic: FirstSession=${firstSessIso}`
	);
	if (today < firstSess) {
	  nextDate = firstSess;
	  console.log(
		`[Scheduler Single] using FirstSession as nextDate: ${nextDate.toISOString()}`
	  );
	}
  }

  if (!nextDate) {
	console.log(
	  `[Scheduler Single] Package ${pkgId} (“${title}”) – no upcoming date, skipping creation.`
	);
	return;
  }

  const iso = nextDate.toISOString();
  const existing = await getMeetingsForPackage(pkgId, fields.UID as string);
  const existingStarts = new Set(existing.map(m => m.fields.StartsAt));

  if (existingStarts.has(iso)) {
	console.log(
	  `[Scheduler Single] Meeting already exists for ${pkgId} at ${iso}, skipping.`
	);
	return;
  }

  console.log(
	`[Scheduler Single] Creating meeting for package ${pkgId} (“${title}”) at ${iso}`
  );
  try {
	const rec = await createMeetingForPackage(pkgId, iso);
	console.log(
	  `[Scheduler Single] Created Meeting ${rec.id} for package ${pkgId}`
	);
  } catch (err) {
	console.error(
	  `[Scheduler Single] Failed to create Meeting for ${pkgId} at ${iso}:`,
	  err
	);
  }
}
