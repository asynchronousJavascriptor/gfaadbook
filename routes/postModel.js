const mongoose = require('mongoose');
const msr = require('mongoose-simple-random');

var postSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    postText: String,
    date: {
        type: Date,
        default: new Date()
    },
    likes: [],
    dislikes: [],
    loves: []
})

postSchema.plugin(msr);

module.exports = mongoose.model('posts', postSchema);