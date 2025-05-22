const { consumeQueue } = require('../../utils/rabbitmq');
const client = require('../../db');

const handleAfterCounterOfferProject = async (data) => {
  const user_1_id = data.user_1_id;
  const user_2_deadline = data.user_2_deadline;
  const user_2_id = data.user_2_id;
  const offerId = data.offerId;
  const acceptedAt = data.acceptedAt;

  const postId = data.postId;

  const postQuery = await client.query(
    `SELECT end_date, milestones FROM posts WHERE id = $1 AND user_id = $2`,
    [postId, user_1_id]
  );

  if (postQuery.rows.length === 0) {
    throw new Error('Error in retrieving post!');
  }

  const user_1_deadline = postQuery.rows[0].end_date;

  try {


    if (
      !Array.isArray(postQuery.rows[0].milestones) ||
      !Array.isArray(data.user_2_milestones) ||
      data.user_2_milestones.length === 0
    ) {
      throw new Error('Milestones are missing or empty.');
    }

    const user_1_milestones = JSON.stringify(postQuery.rows[0].milestones);
    const user_2_milestones = JSON.stringify(data.user_2_milestones);

    await client.query(
      `INSERT INTO projects (user_1_id, user_2_id, user_1_milestones ,user_1_deadline ,user_2_milestones ,user_2_deadline ,accepted_at, offer_id, project_phase)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) `,
      [
        user_1_id,
        user_2_id,
        user_1_milestones,
        user_1_deadline,
        user_2_milestones,
        user_2_deadline,
        acceptedAt,
        offerId,
        'In-progress',
      ]
    );
  } catch (err) {
    console.error('❌ Error in projectWorker:', err.message);
    throw err;
  }
};

const start_handle_after_counter_offer_project_worker = async () => {
  await consumeQueue('project_counter_offer_worker', handleAfterCounterOfferProject);
};

module.exports = { start_handle_after_counter_offer_project_worker };
