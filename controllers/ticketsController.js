const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const client = require('../db');
const { open_ticket, close_ticket } = require('../validators/ticketsSchema');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');
const factory = require('./handlerFactory');

exports.openTicket = catchAsync(async (req, res, next) => {
  //validate the req.body
  const { error } = open_ticket.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  const { message } = req.body;
  //Get user and offers ids
  const senderId = req.user.id;
  const offerId = req.params.id;

  //get the offer based on id
  const offerQuery = await client.query(
    `SELECT id, sender_id, reciever_id, status FROM offers WHERE id = $1 AND (sender_id = $2 OR reciever_id = $2)`,
    [offerId, senderId]
  );

  //check if it exists
  if (offerQuery.rows.length === 0) {
    return next(new AppError('No offers found!', 404));
  }

  //assign the offer
  const offer = offerQuery.rows[0];

  //Check if the offer status equals accepted otherwise he cant open a ticket (because if it is pending so there is nothing to report or rejected)
  if (offer.status === 'Pending' || offer.status === 'Rejected') {
    return next(
      new AppError(
        'The offer is either not accepted yet or rejected to report!',
        400
      )
    );
  }

  //Check if the user already opened a ticket for this offer
  const ticketQuery = await client.query(
    `SELECT id, offer_id, ticket_sender_id FROM tickets WHERE offer_id = $1 AND ticket_sender_id = $2`,
    [offerId, senderId]
  );

  if (ticketQuery.rows.length > 0) {
    return next(
      new AppError(
        "You have already opened a ticket for this offer, please wait for admin's response",
        400
      )
    );
  }

  //if accepted insert values into ticket's table
  await client.query(
    `INSERT INTO tickets (ticket_sender_id, created_at, offer_id, message, status) VALUES ($1, $2, $3, $4, $5)`,
    [senderId, new Date(), offerId, message, 'Open']
  );

  //response to the user
  res.status(201).json({
    status: 'success',
    message:
      "You have opened a ticket successfully, please wait for an admin's response",
  });
});

//*****************************************FOR ADMINS ONLY************************** */
exports.getOneTicket = catchAsync(async (req, res, next) => {
  const ticketId = req.params.id;

  const ticketQuery = await client.query(
    `
    SELECT
        tickets.id,
        ticket_sender.first_name AS ticket_sender_first_name,
        ticket_sender.email AS ticket_sender_email,
        tickets.message,
        tickets.status
    FROM tickets

    JOIN users AS ticket_sender ON tickets.ticket_sender_id = ticket_sender.id

    WHERE tickets.id = $1
        `,
    [ticketId]
  );

  if (ticketQuery.rows.length === 0) {
    return next(new AppError('No open tickets found!', 404));
  }
  const ticket = ticketQuery.rows[0];

  res.status(200).json({
    status: 'success',
    ticket,
  });
});

exports.getAllOpenTickets = catchAsync(async (req, res, next) => {
  const ticketsQuery = await client.query(
    `
    SELECT
        tickets.id,
        ticket_sender.first_name AS ticket_sender_first_name,
        ticket_sender.email AS ticket_sender_email,
        tickets.message,
        tickets.status
    FROM tickets

    JOIN users AS ticket_sender ON tickets.ticket_sender_id = ticket_sender.id

    WHERE tickets.status = $1
        `,
    ['Open']
  );

  if (ticketsQuery.rows.length === 0) {
    return next(new AppError('No open tickets found!', 404));
  }
  const tickets = ticketsQuery.rows;

  res.status(200).json({
    status: 'success',
    tickets,
  });
});

exports.getAllTickets = catchAsync(async (req, res, next) => {
  const ticketsQuery = await client.query(
    `
    SELECT
        tickets.id,
        ticket_sender.first_name AS ticket_sender_first_name,
        ticket_sender.email AS ticket_sender_email,
        tickets.message,
        tickets.status
    FROM tickets

    JOIN users AS ticket_sender ON tickets.ticket_sender_id = ticket_sender.id

    `
  );

  if (ticketsQuery.rows.length === 0) {
    return next(new AppError('No tickets found!', 404));
  }
  const tickets = ticketsQuery.rows;

  res.status(200).json({
    status: 'success',
    tickets,
  });
});

exports.closeTicket = catchAsync(async (req, res, next) => {
  const { error } = close_ticket.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

  const ticketId = req.params.id;

  const closeTickeyQuery = await client.query(
    `UPDATE tickets SET status = $1 WHERE id = $2 RETURNING status`,
    ['Closed', ticketId]
  );

  if (closeTickeyQuery.rows.length === 0) {
    return next(new AppError('Error in closing ticket, try again later!', 400));
  }

  res.status(200).json({
    status: 'success',
    message: 'You have updated the ticket successfully',
  });
});
