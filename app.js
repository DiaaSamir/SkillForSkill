const express = require('express');
const pug = require('pug');
const path = require('path');
const errorController = require('./controllers/errorController');
const authRouter = require('./routes/authRoutes');
const userRouter = require('./routes/userRoutes');
const skillsRouter = require('./routes/skillsRoutes');
const postsRouter = require('./routes/postsRoutes');
const offersRouter = require('./routes/offersRoutes');
const chatRouter = require('./routes/chatRoutes');
const app = express();

app.use(express.json());

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/posts', postsRouter);
app.use('/api/offers', offersRouter);
app.use('/api/chat', chatRouter);

app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on the server`,
  });
  next();
});

app.use(errorController);

module.exports = app;
