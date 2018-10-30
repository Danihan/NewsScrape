const express = require('express')
const expressHandlebars = require('express-handlebars')
const bodyParser = require('body-parser')
const articleController = require('./controllers/article')
const mongoose = require('mongoose')

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/mongoHeadlines', { useNewUrlParser: true }, err => {
  if (err) {
    console.log('Failed to connect to MongoDB')
    console.error(err)
    process.exit(1)
  }
})

const app = express()

app.use(bodyParser.urlencoded({ extended: true }))

app.engine('handlebars', expressHandlebars({ defaultLayout: 'main' }))
app.set('view engine', 'handlebars')

app.use(express.static('public'))

app.use(articleController)

const httpServer = app.listen(process.env.PORT || 3000, () => {
  const address = httpServer.address()
  console.log(`Server started on ${address.address}:${address.port}`)
})
