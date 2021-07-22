/* app.js v1.1 */
'use strict';
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
// 追加したモジュール
const fs = require('fs');
// const multer = require('multer');
const session = require('express-session');
const favicon = require('serve-favicon');

// ルータ定義
const indexRouter = require('./routes/index');
//const usersRouter = require('./routes/users');  // 使用しない。
const computerRouter = require('./routes/computer');
const projectsRouter = require('./routes/projects');
const documentsRouter = require('./routes/documents');
const picturesRouter = require('./routes/pictures');
const videosRouter = require('./routes/videos');
const musicRouter = require('./routes/music');
const extraRouter = require('./routes/extra');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
//app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'm@kan2da%t',
  resave: false,
  saveUninitialized: false,
  cookie:{
    httpOnly: true,
    secure: false,
    maxage: 1000 * 60 * 30
  }
}));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static('public'));  // 追加

// ルート設定
app.use('/', indexRouter);
app.use('/index', indexRouter);
app.use('/computer', computerRouter);
app.use('/projects', projectsRouter);
app.use('/documents', documentsRouter);
app.use('/pictures', picturesRouter);
app.use('/videos', videosRouter);
app.use('/music', musicRouter);
app.use('/extra', extraRouter);
//app.use('/users', usersRouter);

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

/* package.json からバージョン番号を得る。*/
function getVersion() {
  let pstr = fs.readFileSync("package.json", "utf-8");
  let p = JSON.parse(pstr);
  return p.version;
}

/* package.json から名称を得る。*/
function getName() {
  let pstr = fs.readFileSync("package.json", "utf-8");
  let p = JSON.parse(pstr);
  return p.name;
}

// コンソールにメッセージを表示する。
console.info(getName() + ' for Express4 version ' + getVersion());

// このアプリをエクスポートする。
module.exports = app;
