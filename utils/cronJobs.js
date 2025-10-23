const cron = require('node-cron');
const { cleanupExpiredBookings, processAutoStart, processAutoComplete, sendBookingReminders } = require('../controllers/bookingController');

function initCronJobs() {
  // Every 5 minutes: cleanup expired pending bookings
  cron.schedule('*/5 * * * *', async () => {
    try {
      const count = await cleanupExpiredBookings();
      if (count > 0) console.log(`[CRON] Cleaned ${count} expired bookings`);
    } catch (err) {
      console.error('[CRON] cleanupExpiredBookings failed', err);
    }
  });

  // Every minute: auto start eligible bookings
  cron.schedule('* * * * *', async () => {
    try {
      const count = await processAutoStart();
      if (count > 0) console.log(`[CRON] Auto-started ${count} bookings`);
    } catch (err) {
      console.error('[CRON] processAutoStart failed', err);
    }
  });

  // Every 2 minutes: auto complete in-progress bookings after grace
  cron.schedule('*/2 * * * *', async () => {
    try {
      const count = await processAutoComplete();
      if (count > 0) console.log(`[CRON] Auto-completed ${count} bookings`);
    } catch (err) {
      console.error('[CRON] processAutoComplete failed', err);
    }
  });

  // Every 5 minutes: send reminders ~1 hour before
  cron.schedule('*/5 * * * *', async () => {
    try {
      const count = await sendBookingReminders();
      if (count > 0) console.log(`[CRON] Sent ${count} reminders`);
    } catch (err) {
      console.error('[CRON] sendBookingReminders failed', err);
    }
  });
}

module.exports = { initCronJobs };
