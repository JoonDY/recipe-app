var express = require('express');
var router = express.Router();
const db = require('../db');
const utils = require('../util/utils');
const passport = require('passport');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE username=$1', [
      username,
    ]);

    const user = result.rows[0];

    if (!user) {
      res.status(401).json({ message: 'Incorrect username.' });
    }

    const valid = utils.validatePassword(password, user.hash, user.salt);

    if (valid) {
      const jwt = utils.issueJWT(user);
      res.status(200).json({
        success: true,
        user: user,
        token: jwt.token,
        expiresIn: jwt.expires,
      });
    } else {
      res.status(401).json({ message: 'Incorrect password.' });
    }
  } catch (err) {
    console.log(err);
  }
});

router.get(
  '/protected',
  passport.authenticate('jwt', { session: false }),
  (req, res, next) => {
    res.status(200).json({ message: 'Protected route entered.' });
  }
);

router.get(
  '/private-route',
  passport.authenticate('jwt', { session: false }),
  (req, res, next) => {
    res.send('Private route entered.');
  }
);

router.get('/admin-route', (req, res, next) => {
  res.send('Admin route entered.');
});

router.get('/logout', (req, res) => {
  req.logout();
  res.send('Logout success');
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  const saltHash = utils.genPassword(password);

  const salt = saltHash.salt;
  const hash = saltHash.hash;

  try {
    const results = await db.query(
      'INSERT INTO users (username, salt, hash) VALUES ($1, $2, $3) RETURNING *',
      [username, salt, hash]
    );

    const user = results.rows[0];

    const jwt = utils.issueJWT(user);

    res.status(200).json({
      success: true,
      user: user,
      token: jwt.token,
      expiresIn: jwt.expires,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err,
    });
  }
});

module.exports = router;
