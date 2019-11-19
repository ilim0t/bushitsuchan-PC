const express = require('express');
const crypto = require('crypto');

const { DEPLOY_SECRET } = process.env;


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/', (req, res) => {
  const signature = req.headers['x-hub-signature'];

  const shasum = crypto.createHmac('sha1', DEPLOY_SECRET);
  shasum.update(JSON.stringify(req.body));
  const hash = `sha1=${shasum.digest('hex')}`;

  if (signature === undefined) {
    res.sendStatus(401);
    return;
  }
  if (signature !== hash) {
    res.sendStatus(403);
    return;
  }
  res.send('Hello World!');
});


app.listen(80, () => console.log('Example app listening on port 80!'));
