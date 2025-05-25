const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(
    user,
    reset_password_code,
    reset_password_expires,
    verificationCode,
    offer_sender,
    offer_reciever,
    offered_skill,
    required_skill
  ) {
    this.to = user.email;
    this.firstName = user.first_name;
    this.reset_password_code = reset_password_code;
    this.reset_password_expires = reset_password_expires;
    this.verificationCode = verificationCode;
    this.offer_sender = offer_sender;
    this.offer_reciever = offer_reciever;
    this.offered_skill = offered_skill;
    this.required_skill = required_skill;
    this.from = `SKILLforSKILL<${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    // Brevo code
    return nodemailer.createTransport({
      host: process.env.BREVO_HOST,
      port: process.env.BREVO_PORT,
      auth: {
        user: process.env.BREVO_USERNAME,
        pass: process.env.BREVO_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      offeredUserFirstName: this.offer_reciever,
      offerSenderFirstName: this.offer_sender,
      offeredSkill: this.offered_skill,
      requiredSkill: this.required_skill,
      resetCode: this.reset_password_code,
      verificationCode: this.verificationCode,
      subject,
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html,
      text: htmlToText.convert(html),
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the family!');
  }
  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset code!(Valid for 10 minutes)'
    );
  }

  async sendEmailVerificationCode() {
    await this.send('emailVerify', 'Your Email Verification Code');
  }

  async sendEmailResetVerificationCode() {
    await this.send('emailReset', 'Your email reset verification code');
  }

  async SendOfferForReciever() {
    await this.send('makeOffer', 'New offer recieved, CHECK IT NOW!');
  }

  async sendOfferRejectionForUser() {
    await this.send(
      'rejectOffer',
      'Unfortunately, your offer has been rejected! '
    );
  }

  async sendAcceptedOfferForSender() {
    await this.send(
      'offerAcceptedForOfferSender',
      'Congratulations, your offer has been accepted!'
    );
  }

  async sendCounterOffer() {
    await this.send('counterOffer', 'Your offer has been countered!');
  }

  async sendAcceptedCounterOfferForUser() {
    await this.send(
      'acceptCounterOffer',
      'Your counter offer has been accepted!'
    );
  }

  async sendRejectedCounterofferForUser() {
    await this.send(
      'rejectCounterOffer',
      'Unfortunately, your counter offer has been rejected! '
    );
  }

  async sendDeadlineMissed() {
    await this.send('deadlineMissed', 'You have missed the deadline!');
  }
};
