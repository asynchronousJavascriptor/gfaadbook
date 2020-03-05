const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');

// mongoose.connect('mongodb://localhost/gfaadbook');
mongoose.connect('mongodb://admin:admin123@ds121494.mlab.com:21494/gfaadbook');

var userSchema = mongoose.Schema({
  username: String,
  password: String,
  name: String,
  profilePic: {
    type: String,
    default: '/images/def.jpg'
  },
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'posts'
  }],
  email: String,
  about: String,
  city: String,
  resetToken: String,
  resetTime: String
})

userSchema.plugin(plm);

module.exports = mongoose.model('user', userSchema);