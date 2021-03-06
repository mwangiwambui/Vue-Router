"use strict";
const express = require('express');
const DB = require('./db');
const config = require('./config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const db = new DB("sqlitedb")
const app = express();
const router = express.Router();

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

// CORS middleware
const allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
}

app.use(allowCrossDomain)

// Route for registering new user
// Register
router.post('/register', function(req, res) {
  db.insert([
    req.body.name,
    req.body.email,
    bcrypt.hashSync(req.body.password, 8)
  ],
  function (err) {
    if (err) return res.status(500).send("There was a problem registering the user.")
    db.selectByEmail(req.body.email, (err,user) => {
      if (err) return res.status(500).send("There was a problem getting user")
      let token = jwt.sign(
        { id: user.id },
        config.secret,
        { expiresIn: 86400 } // expires in 24 hours
      );
      res.status(200).send({
        auth: true,
        token: token,
        user: user
      });
    });
  });
});
// Register Admin
router.post('/register-admin', function(req, res) {
  db.insertAdmin([
    req.body.name,
    req.body.email,
    bcrypt.hashSync(req.body.password, 8),
    1
  ],
  function (err) {
    if (err) return res.status(500).send("There was a problem registering the user.")
    db.selectByEmail(req.body.email, (err,user) => {
      if (err) return res.status(500).send("There was a problem getting user")
      let token = jwt.sign(
        { id: user.id },
        config.secret,
        { expiresIn: 86400 } // expires in 24 hours
      );
      res.status(200).send({
        auth: true,
        token: token,
        user: user
      });
    });
  });
});

router.get('/blog', function(req, res){
  db.selectAllBlog((err, blogs) => {
    if(err) return res.status(500).send("There was a problem getting blogs")

    res.status(200).send({blogs : blogs});
  })
})

router.post('/blog', function(req, res) {
  let token = req.headers['x-access-token'];
  if (!token) return res.status(401).send({ auth: false, message: 'No token provided.' });

  jwt.verify(token, config.secret, function(err) {
      if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });

      db.insertBlog(
          [
              req.body.blog_title,
              req.body.blog_body,
              req.body.created_by,
          ],
          function (err) {
              if (err) return res.status(500).send("Blog could not be created.")

              res.status(201).send({ message : "Blog created successfully" });
          }
      ); 
  });
});

router.delete('/blog/:id', function(req, res) {
  let token = req.headers['x-access-token'];
  if (!token) return res.status(401).send({ auth: false, message: 'No token provided.' });

  jwt.verify(token, config.secret, function(err) {
      if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });

      db.deleteBlog(
          req.params.id,
          function (err) {
              if (err) return res.status(500).send("There was a problem.")

              res.status(200).send({ message : "Blog deleted successfully" });
          }
      ); 
  });
});



// Login
router.post('/login', (req, res) => {
  db.selectByEmail(req.body.email, (err, user) => {
    if (err) return res.status(500).send('Error on the server.');
    if (!user) return res.status(404).send('No user found.');
    let passwordIsValid = bcrypt.compareSync(req.body.password, user.user_pass);
    if (!passwordIsValid) return res.status(401).send({
      auth: false,
      token: null
    });
    let token = jwt.sign(
      { id: user.id },
      config.secret,
      { expiresIn: 86400 } // expires in 24 hours
    );
    res.status(200).send({
      auth: true,
      token: token,
      user: user
    });
  });
});

// Express
app.use(router)

let port = process.env.PORT || 3000;

let server = app.listen(port, function() {
  console.log('Express server listening on port ' + port)
});