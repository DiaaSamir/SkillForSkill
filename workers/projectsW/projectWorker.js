const { consumeQueue } = require('../../utils/rabbitmq');
const client = require('../../db');

const projectWorker = async (data) => {
  const user_2_id = data.user_2_id;
  const user_1_id = data.user_1_id;
  const offerId = data.offerId;

  try {
    //Begin transaction
    await client.query('BEGIN');

    if (
      !Array.isArray(data.user_1_milestones) ||
      data.user_1_milestones.length === 0 ||
      !Array.isArray(data.user_2_milestones) ||
      data.user_2_milestones.length === 0
    ) {
      throw new Error('Milestones arrays are missing or empty.');
    }

    const user_1_milestones = JSON.stringify(data.user_1_milestones);
    const user_2_milestones = JSON.stringify(data.user_2_milestones);

    const user_1_current_milestone = JSON.stringify(data.user_1_milestones[0]);
    const user_2_current_milestone = JSON.stringify(data.user_2_milestones[0]);

    const projectIdQuery = await client.query(
      `INSERT INTO projects (user_1_id, user_2_id, user_1_project_status, user_2_project_status, started_at, offer_id)
       VALUES ($1, $2, $3, $3, $4, $5) RETURNING id`,
      [user_1_id, user_2_id, 'Pending', new Date(), offerId]
    );

    if (projectIdQuery.rows.length === 0) {
      throw new Error("Error in retrieving project's id");
    }

    const projectId = projectIdQuery.rows[0].id;

    await client.query(
      `INSERT INTO project_milestones (
        project_id,
        user_1_milestones,
        user_2_milestones,
        user_1_current_milestone,
        user_2_current_milestone,
        user_1_current_milestone_status,
        user_2_current_milestone_status,
        did_user_1_confirm,
        did_user_2_confirm
      ) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $7)`,
      [
        projectId,
        user_1_milestones,
        user_2_milestones,
        user_1_current_milestone,
        user_2_current_milestone,
        'Pending',
        false,
      ]
    );
    //Commit if no errors
    await client.query('COMMIT');
  } catch (err) {
    //Rollback if errors happen
    await client.query('ROLLBACK');
    console.error('❌ Error in projectWorker:', err.message);
    throw err;
  }
};

const start_project_worker = async () => {
  await consumeQueue('project_milestones_worker', projectWorker);
};

module.exports = { start_project_worker };
