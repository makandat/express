var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var modify_albumRouter = require('./routes/modify_album');
var modify_pictureRouter = require('./routes/modify_picture');
var modify_foldersRouter = require('./routes/modify_folders');
var picturesRouter = require('./routes/pictures');
var pictalbumRouter = require('./routes/pictalbum');
var bindataRouter = require('./routes/bindata');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'makandat',
  resave: false,
  saveUninitialized: false,
  cookie:{
    httpOnly: true,
    secure: false,
    maxage: 1000 * 60 * 30
  }
}));

app.use('/', indexRouter);
app.use('/modify_album', modify_albumRouter);
app.use('/modify_picture', modify_pictureRouter);
app.use('/modify_folders', modify_foldersRouter);
app.use('/pictures', picturesRouter);
app.use('/pictalbum', pictalbumRouter);
app.use('/bindata', bindataRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
