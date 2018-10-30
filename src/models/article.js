const mongoose = require('mongoose')

const Article = mongoose.model('Article', {
  url: String,
  headline: String,
  summary: String,
  comments: [String],
  saved: Boolean
})

module.exports = Article
