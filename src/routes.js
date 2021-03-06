const express = require('express');

const taskRoute = require('./routes/tasks');
const userRoute = require('./routes/users');
const profileRoute = require('./routes/profile');
const authRoute = require('./routes/auth');

const router = express.Router();

router.use('/tasks', taskRoute);
router.use('/users', userRoute);
router.use('/profiles', profileRoute);
router.use('/auth', authRoute);

module.exports = router;
