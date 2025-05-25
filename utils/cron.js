const cron = require('node-cron');
const client = require('../db');
const Email = require('./email');
const { sendToQueue } = require('./rabbitmq');

// Run every hour at minute 0
cron.schedule('0 * * * *', async () => {
  console.log('[CRON] Checking project deadlines...');
  const now = new Date();

  // Get all in-progress projects where user_1 or user_2 missed their deadline and didn't submit
  const result = await client.query(
    `
    SELECT id, user_1_id, user_2_id, did_user_1_confirm ,did_user_2_confirm ,user_1_project_link, user_2_project_link, user_1_deadline, user_2_deadline
    FROM projects
    WHERE project_phase = $1
  `,
    ['In-progress']
  );

  for (const project of result.rows) {
    let missed = false;
    // Check user_1
    if (
      !project.user_1_project_link &&
      project.did_user_2_confirm === false &&
      project.user_1_deadline &&
      now > project.user_1_deadline
    ) {
      missed = true;
      const user1Res = await client.query(
        'SELECT id, email, first_name FROM users WHERE id = $1',
        [project.user_1_id]
      );
      if (user1Res.rows.length === 0) {
        throw new Error('User not found!');
      }
      const user1 = user1Res.rows[0];
      await client.query(
        `INSERT INTO reviews (reviewer, reviewee, rating, review) VALUES ($1, $2, $3, $4)`,
        [1, user1.id, 1, 'Missed deadline']
      );

      await sendToQueue('missed_deadline', {
        userId: user1.id,
      });

      try {
        await new Email(
          user1,
          null,
          null,
          null,
          null,
          null,
          null,
          null
        ).sendDeadlineMissed();
        console.log(
          `[CRON] Notified user_1 (${user1.email}) for project ${project.id}`
        );
      } catch (e) {
        console.error(
          `[CRON] Failed to notify user_1 (${user1.email}):`,
          e.message
        );
      }
    }
    // Check user_2
    if (
      !project.user_2_project_link &&
      project.did_user_1_confirm === false &&
      project.user_2_deadline &&
      now > project.user_2_deadline
    ) {
      missed = true;
      const user2Res = await client.query(
        'SELECT id, email, first_name FROM users WHERE id = $1',
        [project.user_2_id]
      );
      if (user2Res.rows.length === 0) {
        throw new Error('User not found!');
      }
      const user2 = user2Res.rows[0];
      await client.query(
        `INSERT INTO reviews (reviewer, reviewee, rating, review) VALUES ($1, $2, $3, $4)`,
        [1, user2.id, 1, 'Missed deadline']
      );

      await sendToQueue('missed_deadline', {
        userId: user2.id,
      });

      try {
        await new Email(
          user2,
          null,
          null,
          null,
          null,
          null,
          null,
          null
        ).sendDeadlineMissed();
        console.log(
          `[CRON] Notified user_2 (${user2.email}) for project ${project.id}`
        );
      } catch (e) {
        console.error(
          `[CRON] Failed to notify user_2 (${user2.email}):`,
          e.message
        );
      }
    }
    if (missed) {
      await client.query(
        `UPDATE projects SET project_phase = $1 WHERE id= $2`,
        ['Closed', project.id]
      );
    }
  }
});
