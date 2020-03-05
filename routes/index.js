const express = require('express');
const router = express.Router();
const passport = require('passport');
const localStrategy = require('passport-local');
const userModel = require('./users');
const postModel = require('./postModel');
const multer = require('multer');
const crypto = require('crypto');
const nm = require('nodemailer');
const msr = require('mongoose-simple-random');

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
    var date = new Date();
    var filekanaam = date.getTime() + file.originalname;
    cb(null, filekanaam)
  }
})

var upload = multer({ storage: storage })

const names = require('./randomNames');

passport.use(new localStrategy(userModel.authenticate()));

router.get('/', sendToProfile, function (req, res) {
  postModel.findRandom({}, {}, { limit: 2, populate: 'user' }, function (err, result) {
    if (result === undefined) {
      res.render('index', { loggedin: false, randomPosts: [] });
    }
    else {
      res.render('index', { loggedin: false, randomPosts: result });
    }
  })
});

router.get('/forgot', function (req, res) {
  res.render('forgot', { loggedin: false });
})

router.get('/reset/:token', function (req, res) {
  userModel.findOne({ resetToken: req.params.token })
    .then(function (userFound) {
      var currentTime = Date.now();
      if (userFound.resetToken === req.params.token && currentTime < userFound.resetTime) {
        res.render('newPasswordPage', { loggedin: false, token: req.params.token });
      }
      else {
        res.send('bhagao maakde ko !');
      }
    })
})

router.post('/forgot', function (req, res) {
  crypto.randomBytes(30, function (err, token) {
    var resetToken = token.toString('hex');
    userModel.findOne({ email: req.body.email })
      .then(function (userFound) {
        if(!userFound) res.redirect('/forgot');
        else{
          userFound.resetToken = resetToken;
          userFound.resetTime = Date.now() + 8640000;
          userFound.save()
            .then(function () {
              const tp = nm.createTransport({
                service: "gmail",
                auth: {
                  user: "mishramanisha925@gmail.com",
                  pass: "1472580369"
                }
              });
  
              const mailOptions = {
                from: "Harsh<harshu854@gmail.com>",
                to: req.body.email,
                subject: "Testing the nodemailer",
                text: "reset link : http://" + req.headers.host + "/reset/" + resetToken + '\n\n' + " ignor this mail if not sent by you."
              }
  
              tp.sendMail(mailOptions, function (err) {
                if (err) throw err;
                else {
                  res.send('mail sent')
                }
              })
            }) 
        }
      })
  });
})

router.post('/update', isLoggedIn, function (req, res) {
  var updation = {
    name: req.body.name,
    username: req.body.username,
    city: req.body.city,
    about: req.body.about.trim()
  }
  userModel.findOneAndUpdate({ username: req.session.passport.user }, updation, { new: true })
    .then(function (updatedUser) {
      req.logIn(updatedUser, function (err) {
        res.redirect('/profile');
      })
    })
})

router.post('/resetpassword/:token', function (req, res) {
  userModel.findOne({ resetToken: req.params.token })
    .then(function (userFound) {
      if (req.body.password === req.body.password2) {
        userFound.setPassword(req.body.password2, function (err) {
          userFound.resetToken = undefined;
          userFound.resetTime = undefined;
          userFound.save()
            .then(function () {
              req.logIn(userFound, function (err) {
                res.redirect('/profile');
              });
            })
        })
      }
    })
})

router.get('/chat', isLoggedIn, function (req, res) {
  userModel.findOne({ username: req.session.passport.user })
    .then(function (foundUser) {
      res.render('chat', {loggedin: true, userLoggedIn: req.session.passport.user});
    })
})

router.get('/timeline', isLoggedIn, function (req, res) {
  postModel.find().populate('user').exec(function (err, allHisPosts) {
    console.log(allHisPosts);
    res.render('timeline', { loggedin: true, allHisPosts });
  })
});

router.get('/update', isLoggedIn, function (req, res) {
  userModel.findOne({ username: req.session.passport.user })
    .then(function (userFound) {
      res.render('update', { loggedin: true, userFound })
    })
});

router.post('/uploadpic', upload.single('prfl'), function (req, res) {
  var addressOfImage = '/images/uploads/' + req.file.filename;
  userModel.findOne({ username: req.session.passport.user })
    .then(function (userFound) {
      userFound.profilePic = addressOfImage;
      userFound.save().then(function () {
        res.redirect('/update');
      })
    })
});

router.get('/profile', isLoggedIn, function (req, res) {
  userModel.findOne({ username: req.session.passport.user }).populate('posts')
    .exec(function (err, userDets) {
      console.log(userDets);
      res.render('profile', { loggedin: true, userDets, editable: true });
    })
});

router.get('/profile/:username', isLoggedIn, function (req, res) {
  userModel.findOne({ username: req.params.username }).populate('posts')
    .exec(function (err, userDets) {
      res.render('profile', { loggedin: true, userDets, editable: false });
    })
})

router.get('/loves/:id', isLoggedIn, function (req, res) {
  postModel.findOne({ _id: req.params.id })
    .then(function (post) {
      if (post.loves.indexOf(req.session.passport.user) === -1) {
        post.loves.push(req.session.passport.user);
        post.save().then(function (postSaved) {
          res.redirect(req.headers.referer);
        });
      }
      else {
        var newUsers = post.loves.filter(function (user) {
          return user !== req.session.passport.user
        })
        post.loves = newUsers;
        post.save().then(function (postSaved) {
          res.redirect(req.headers.referer);
        });
      }
    })
})

router.get('/likes/:id', isLoggedIn, function (req, res) {
  postModel.findOne({ _id: req.params.id })
    .then(function (post) {
      if (post.likes.indexOf(req.session.passport.user) === -1) {
        post.likes.push(req.session.passport.user);
        post.save().then(function (postSaved) {
          res.redirect(req.headers.referer);
        });
      }
      else {
        var newUsers = post.likes.filter(function (user) {
          return user !== req.session.passport.user;
        });
        post.likes = newUsers;
        post.save().then(function (postSaved) {
          res.redirect(req.headers.referer);
        })
      }
    })
})

router.get('/dislikes/:id', isLoggedIn, function (req, res) {
  postModel.findOne({ _id: req.params.id })
    .then(function (post) {
      if (post.dislikes.indexOf(req.session.passport.user) === -1) {
        post.dislikes.push(req.session.passport.user);
        post.save().then(function (postSaved) {
          res.redirect(req.headers.referer);
        });
      }
      else {
        var newUsers = post.dislikes.filter(function (user) {
          return user !== req.session.passport.user
        })
        post.dislikes = newUsers;
        post.save().then(function (postSaved) {
          res.redirect(req.headers.referer);
        });
      }
    })
})

router.get('/register', sendToProfile, function (req, res) {
  res.render('register', { loggedin: false });
});

router.get('/logout', function (req, res) {
  req.logOut();
  res.redirect('/');
});

router.get('/login', sendToProfile, function (req, res) {
  res.render('login', { loggedin: false });
});

// =====================
// post routes
// =====================


router.post('/search', function (req, res) {
  userModel.find({ username: new RegExp(req.body.username, 'i') })
    .then(function (users) {
      res.render('searched', { users, loggedin: true });
    })
});


router.post('/post', isLoggedIn, function (req, res) {
  userModel.findOne({ username: req.session.passport.user })
    .then(function (foundUser) {
      postModel.create({
        postText: req.body.post,
        user: foundUser
      }).then(function (newlyCreatedPost) {
        foundUser.posts.push(newlyCreatedPost);
        foundUser.save().then(function () {
          res.redirect('/profile');
        })
      })
    })
});

router.post('/register', function (req, res) {
  var rnum = Math.floor(Math.random() * 9)
  const luckyName = names[rnum];

  var detailsWithoutPassword = new userModel({
    email: req.body.email,
    username: req.body.username,
    name: luckyName
  });
  userModel.register(detailsWithoutPassword, req.body.password)
    .then(function () {
      passport.authenticate('local')(req, res, function () {
        res.redirect('/profile');
      });
    })
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/profile',
  failureRedirect: '/login'
}), function (req, res) { });


function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  else res.redirect('/login');
}

function sendToProfile(req, res, next) {
  if (req.isAuthenticated()) {
    res.redirect('/profile');
  }
  else {
    return next();
  };
}

module.exports = router;