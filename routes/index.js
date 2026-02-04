var express = require('express');
var router = express.Router();

// Home page
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Homepage' });
});

// Map search page
router.get('/search', (req, res, next) => {
  res.render('search', { title: 'Search...' });
});

module.exports = router;
