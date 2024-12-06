require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');


app.use(cors({optionsSuccessStatus: 200}));
app.use(express.static('public'));

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/api/:date?', (req, res) => {
  let date;
  if (req.params.date != null) {
    reqDate = /^[0-9]+$/.test(req.params.date) ? Number(req.params.date) : req.params.date
    date = new Date(reqDate);
  } else {
    date = new Date();
  }

  if (date.toString() !== 'Invalid Date') {
    res.json({
      unix: date.getTime(),
      utc: date.toUTCString()
    });
  } else {
    res.json({error: 'Invalid Date'});
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port} \nhttp://localhost:${port}`);
});
