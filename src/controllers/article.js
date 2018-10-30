const express = require('express')
const cheerio = require('cheerio')
const request = require('request-promise-native')
const Article = require('../models/article')

const app = new express.Router()

const SCRAPE_CACHE_TIME = 1000 * 60 * 5
let lastScraped = null

async function scrape (skipCache = false) {
  if (!skipCache && (lastScraped && Date.now() - lastScraped.getTime() < SCRAPE_CACHE_TIME)) {
    return
  }

  const resp = await request('https://www.nytimes.com/search?query=&sort=newest')
  const $ = cheerio.load(resp)

  const scrapedArticles = []
  $('[class*=SearchResults-item]').each((index, ele) => {
    const link = $('a', ele).attr('href')

    const url = `https://www.nytimes.com${link}`
    const headline = $('[class*=Item-headline]', ele).text()
    const summary = $('[class*=Item-summary]', ele).text()

    scrapedArticles.push({ url, headline, summary })
  })

  for (const { url, headline, summary } of scrapedArticles) {
    const existingArticle = await Article.findOne({ url })

    if (existingArticle) {
      continue
    }

    await Article.create([{ url, headline, summary }])
  }

  lastScraped = new Date()
}

app.get('/:type(fresh|saved)?/:offset?', async (req, res) => {
  const { type, offset } = req.params

  await scrape()

  const query = {}
  if (type === 'saved') {
    query.saved = type === 'saved'
  }
  const articles = await Article.find(query).sort({ _id: -1 }).limit(50).skip(offset || 0)

  res.render('index', { articles, lastScraped: lastScraped.toISOString(), isTypeFresh: type === 'fresh' || !type })
})

app.get('/scrape', async (req, res) => {
  await scrape(true)

  res.redirect(req.headers.referer)
})

app.post('/articles/:articleId/comments', async (req, res) => {
  let { comment } = req.body
  const { articleId } = req.params

  comment = comment.trim()

  if (!comment || !articleId) {
    return res.sendStatus(400)
  }

  const article = await Article.findById(articleId)

  if (!article) {
    return res.sendStatus(400)
  }

  article.comments.push(comment)
  await article.save()

  res.redirect(req.headers.referer)
})

app.get('/articles/:articleId/delete', async (req, res) => {
  const { articleId, commentIndex } = req.params

  if (!articleId || !commentIndex) {
    return res.sendStatus(400)
  }

  const article = await Article.findById(articleId)

  if (!article) {
    return res.sendStatus(400)
  }

  await article.delete()

  res.redirect(req.headers.referer)
})

app.get(['/articles/:articleId/save', '/articles/:articleId/unsave'], async (req, res) => {
  const { articleId } = req.params

  if (!articleId) {
    return res.sendStatus(400)
  }

  const article = await Article.findById(articleId)

  if (!article) {
    return res.sendStatus(400)
  }

  article.saved = req.originalUrl.endsWith('unsave') === false
  await article.save()

  res.redirect(req.headers.referer)
})

app.get('/articles/:articleId/comments/:commentIndex/delete', async (req, res) => {
  const { articleId, commentIndex } = req.params

  if (!articleId || !commentIndex) {
    return res.sendStatus(400)
  }

  const article = await Article.findById(articleId)

  if (!article) {
    return res.sendStatus(400)
  }

  article.comments.splice(commentIndex, 1)
  await article.save()

  res.redirect(req.headers.referer)
})

module.exports = app
