const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const client = require('../db');

const { submit_project_link } = require('../validators/projectsSchema');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');

const checkIfDeadlineHasPassed = async (projectId) => {
  const projectQuery = await client.query(
    `SELECT deadline FROM projects WHERE id = $1`,
    [projectId]
  );

  if (projectQuery.rows.length === 0) {
    throw new AppError('No projects found!', 404);
  }

  const projectDeadline = projectQuery.rows[0].deadline;
  const currentDate = new Date();

  if (currentDate > projectDeadline) {
    throw new AppError(
      "You can't submit your project's link after the deadline!",
      403
    );
  }
};

const checkIfUserHasAlreadySubmittedLink = async (project, userId) => {
  if (userId === project.user_1_id && project.user_1_project_link !== null) {
    throw new AppError('You have already submitted the link!', 400);
  } else if (
    userId === project.user_2_id &&
    project.user_2_project_link !== null
  ) {
    throw new AppError('You have already submitted the link!', 400);
  }
};

//****************************************************************************************** */

exports.getMyFinishedProjects = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const projectsQuery = await client.query(
    `
  SELECT
    u1.user_1_id AS first_user_name,
    u1.user_2_id AS second_user_name,
    projects.user_1_project_link,
    projects.user_2_project_link,
    projects.accepted_at
  FROM projects

  JOIN users AS u1 ON projects.user_1_id = u1.id
  JOIN users AS u2 ON projects.user_2_id = u2.id

  WHERE projects.project_phase = $1 AND $2 IN (user_1_id, user_2_id)
    `,
    ['Handed', userId]
  );

  if (projectsQuery.rows.length === 0) {
    return next(new AppError('No handed projects found!', 404));
  }

  const projects = projectsQuery.rows;

  res.status(200).json({
    status: 'success',
    projects,
  });
});

exports.getMyOneFinishedProject = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const projectId = req.params.id;

  const projectsQuery = await client.query(
    `
  SELECT
    u1.user_1_id AS first_user_name,
    u1.user_2_id AS second_user_name,
    projects.user_1_project_link,
    projects.user_2_project_link,
    projects.accepted_at
  FROM projects

  JOIN users AS u1 ON projects.user_1_id = u1.id
  JOIN users AS u2 ON projects.user_2_id = u2.id

  WHERE projects.project_phase = $1 AND $2 IN (user_1_id, user_2_id) AND projects.id = $3
    `,
    ['Handed', userId, projectId]
  );

  if (projectsQuery.rows.length === 0) {
    return next(new AppError('No handed projects found!', 404));
  }

  const projects = projectsQuery.rows;

  res.status(200).json({
    status: 'success',
    projects,
  });
});

exports.submitProjectLink = catchAsync(async (req, res, next) => {
  //validate req.body
  const { error } = submit_project_link.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  //get values
  const userId = req.user.id;
  const projectId = req.params.id;
  const { project_link } = req.body;

  await checkIfDeadlineHasPassed(projectId, next);

  //Make a query to get offer id from projects table based on project id and current user
  const projectQuery = await client.query(
    `SELECT user_1_id, user_2_id, user_1_project_link, user_2_project_link FROM projects WHERE id = $1 AND $2 IN (user_1_id, user_2_id)`,
    [projectId, userId]
  );

  //if no projects found return an error
  if (projectQuery.rows.length === 0) {
    return next(new AppError('No projects found!', 404));
  }

  //assign the project
  const project = projectQuery.rows[0];

  //Check if the user has already submitted the link
  await checkIfUserHasAlreadySubmittedLink(project, userId);

  //If user_1_id is submitting the link then update user_1_project_link column
  //If  user_2_id is submitting the link then update user_2_project_link column
  //Else return an error
  if (userId === project.user_1_id) {
    await client.query(
      `UPDATE projects SET user_1_project_link = $1 WHERE id = $2 AND user_1_id = $3`,
      [project_link, projectId, userId]
    );
  } else if (userId === project.user_2_id) {
    await client.query(
      `UPDATE projects SET user_2_project_link = $1 WHERE id = $2 AND user_2_id = $3`,
      [project_link, projectId, userId]
    );
  } else {
    return next(new AppError('You are not part of this project!', 403));
  }

  //Send a response for the user
  res.status(200).json({
    status: 'success',
    message: 'You have submitted your project link successfully',
    project_link,
  });
});
