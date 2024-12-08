require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');
const { URL } = require('url');
const { promisify } = require('util');

// MongoDB database and model setup
mongoose.connect(process.env.MONGO_URI)
  .then(_ => console.log('db connection established'))
  .catch(err => console.error(err));
const shortUrlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
    unique: true
  },
  shortUrl: {
    type: Number,
    required: true,
    unique: true
  },
});
const ShortUrlModel = mongoose.model('ShortUrl', shortUrlSchema);

// Middleware
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use('/api/shorturl', bodyParser.urlencoded({extended:false}));

// GET endpoints
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/shorturl/:urlId', async (req, res) => {
  const urlId = req.params.urlId;
  if (/^[0-9]+$/.test(urlId)) {
    try {
      const result = await ShortUrlModel.findOne({shortUrl: urlId});
      if (result) {
        res.redirect(result.originalUrl);
      } else {
        res.json({error: 'No short URL found for the given input'});
      }
    } catch (err) {
      console.error(err);
      res.json({error: err.code});
    }
  } else {
    res.json({error: 'Wrong format'});
  }
});

// POST endpoints
app.post('/api/shorturl', async (req, res) => {
  const url = req.body.url;
  const lookupAsync = promisify(dns.lookup);
  try {
    // Verify URL
    const address = await lookupAsync(new URL(url).hostname);
    // Process new document
    const count = await ShortUrlModel.countDocuments();
    const shortUrlDoc = new ShortUrlModel({
      originalUrl: url,
      shortUrl: count + 1
    });
    const result = await shortUrlDoc.save();    
    res.json({
      original_url: result.originalUrl,
      short_url: result.shortUrl
    });
  } catch (err) {
    console.error(err);
    if (err.code === 'ERR_INVALID_URL' || err.code === 'ENOTFOUND') {
      res.json({error: 'Invalid URL'});
    } else if (err.code === 11000) {
      // Fetch and return existing document instead of creating a duplicate
      try {
        const existingDoc = await ShortUrlModel.findOne({originalUrl: url});
        res.json({
          original_url: existingDoc.originalUrl,
          short_url: existingDoc.shortUrl
        });
      } catch (nestedErr) {
        console.error(nestedErr);
        res.json({error: nestedErr.code});
      }
    } else {
      res.json({error: err.code});
    }
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port} \nhttp://localhost:${port}`);
});
