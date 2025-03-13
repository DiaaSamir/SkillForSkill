const express = require('express');
const errorController = require('./controllers/errorController');
const authRouter = require('./routes/authRoutes');
const userRouter = require('./routes/userRoutes');
const skillsRouter = require('./routes/skillsRoutes');
const app = express();

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/skills', skillsRouter);
app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on the server`,
  });
  next();
});

app.use(errorController);
module.exports = app;
