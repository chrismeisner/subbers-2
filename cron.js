// cron.js

import cron from 'node-cron';
import { scheduleNextMeetings } from './lib/scheduler';

(async () => {
  console.log('🕒 Initial run of scheduler at startup…');
  try {
	await scheduleNextMeetings();
	console.log('✅ Initial scheduleNextMeetings complete');
  } catch (err) {
	console.error('❌ Initial scheduleNextMeetings error:', err);
  }

  // Schedule daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
	console.log('🔔 Cron job triggered: scheduleNextMeetings');
	try {
	  await scheduleNextMeetings();
	  console.log('✅ scheduleNextMeetings completed');
	} catch (err) {
	  console.error('❌ scheduleNextMeetings failed:', err);
	}
  });
})();
