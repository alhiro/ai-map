var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const dotenv = require('dotenv');
require('dotenv').config();

var expressLayouts = require("express-ejs-layouts");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var mapsRouter = require('./routes/maps');

var app = express();

// view engine setup
// set html view with ejs render file
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(expressLayouts);
app.set("layout", "layout");

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.get('/', (req, res) => {
//   res.send('Server is running!');
// });

// Route handlers
app.use('/', indexRouter);

// API routes
app.use(process.env.APP_API_PREFIX + '/users', usersRouter);
app.use(process.env.APP_API_PREFIX + '/maps', mapsRouter);

// 404 handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500);

  res.render("error", {
    title: "Error Page",
    message: err.message,
    error: req.app.get("env") === "development" ? err : {},
  });
});

app.set('port', 3000);
var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});

module.exports = app;
