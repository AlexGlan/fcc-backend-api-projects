const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB database and model setup
mongoose.connect(process.env.MONGO_URI)
  .then(_ => console.log('db connection established'))
  .catch(err => console.error(err));

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  }
});
const ExerciseSchema = new mongoose.Schema({
  userId: {type: String, required: true},
  duration: {type: Number, required: true},
  description: {type: String, required: true},
  date: {type: String, required: true}
});

const UserModel = mongoose.model('ExerciseUser', UserSchema);
const ExerciseModel = mongoose.model('Exercise', ExerciseSchema);

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

// GET endpoints
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});
// Retrieve all users
app.get('/api/users', async (req, res) => {
  try {
    const allUsers = await UserModel.find();
    res.json(allUsers);
  } catch (err) {
    console.error(err);
    res.json({error: err.code || err.message});
  }
});
// Retrieve user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  try {
    const { username } = await UserModel.findById(_id);
    if (!username) {
      res.json({error: 'Invalid user id'});
    } else {
      // Build dynamic query
      const query = ExerciseModel.find({userId: _id});
      if (new Date(from).toString() !== 'Invalid Date') {
        query.where('date').gte(new Date(from).toISOString());
      }
      if (new Date(to).toString() !== 'Invalid Date') {
        query.where('date').lte(new Date(to).toISOString());
      }
      if (/^[0-9]+$/.test(limit)) {
        query.limit(limit);
      }
      const logsArr = await query
        .select({_id: 0, description: 1, duration: 1, date: 1})
        .exec();

      res.json({
        _id,
        username,
        count: logsArr.length,
        log: logsArr.map(doc => ({ ...doc._doc, date: new Date(doc.date).toDateString()}))
      });
    }
  } catch (err) {
    console.error(err);
    res.json({error: err.code || err.message});
  }
});

// POST endpoints
// Create new user
app.post('/api/users', async (req, res) => {
  try {
    const newUser = new UserModel({
      username: req.body.username
    });
    const result = await newUser.save();
    res.json({
      username: result.username,
      _id: result._id
    });
  } catch (err) {
    console.error(err);
    res.json({error: err.code || err.message});
  }
});
// Create new exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;
  try {
    const { username } = await UserModel.findById(userId);
    if (!username) {
      res.json({error: 'Invalid user id'});
    } else {
      const exerciseDoc = new ExerciseModel({
        userId,
        duration,
        description,
        date: date ? new Date(date).toISOString() : new Date().toISOString()
      });
      const result = await exerciseDoc.save();
      res.json({
        _id: result.userId,
        username,
        date: new Date(result.date).toDateString(),
        duration: result.duration,
        description: result.description
      });
    }
  } catch (err) {
    console.error(err);
    res.json({error: err.code || err.message});
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port} \nhttp://localhost:${port}`);
});
