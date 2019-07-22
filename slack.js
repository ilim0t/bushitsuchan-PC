const express = require('express');

module.exports = (slackClientId, slackClientSecret) => {
  const router = express.Router();

  router.get('/test', (req, res) => {
    res.send('Hello Bushitsuchan in slack/test!');
  });
  return router;
};
