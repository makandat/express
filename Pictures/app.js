/* app.js */
'use strict';

// ミドルウェアのロードとそのオブジェクト変数を設定
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var mysql = require('mysql');
var favicon = require('serve-favicon');
var myclient = require('./routes/MySQL.js');

// ルートハンドラの設定
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var add_modifyRouter = require('./routes/add_modify');
var creatorsRouter = require('./routes/creators');
var showfolderRouter = require('./routes/showfolder');

// express アプリケーション変数の設定
var app = express();

// ビューの場所とテンプレートエンジンの指定)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ミドルウェアの設定
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

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// ルートの設定
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/add_modify', add_modifyRouter);
app.use('/creators', creatorsRouter);
app.use('/showfolder', showfolderRouter);

/* 画像を返す。 */
app.get('/getimage', function(req, res, next) {
  res.sendFile(req.query.path);
});


/* BINDATA テーブルから画像データを得る。*/
app.get('/extract/:id', function(req, res, next){
  let id = req.params.id;
  let sql = "SELECT datatype, data FROM BINDATA WHERE id = " + id;
  myclient.getRow(sql, (row) => {
    let type;
    if (row.datatype == '.jpg') {
      type = 'image/jpeg';
    }
    else if (row.datatype == '.png') {
      type = 'image/png';
    }
    else {
      type = "image/gif";
    }
    res.set("Content-Type", type);
    res.send(row.data);
  });
});

// エラー 404 (Not Found) をエラーハンドラへ渡す。
app.use(function(req, res, next) {
  next(createError(404));
});

// エラーハンドラ
app.use(function(err, req, res, next) {
  // エラーメッセージと開発モードでのみエラーオブジェクトを ress.locals にセット 
  // (error.ejs または error.pug で使用する)
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // エラーページ作成
  res.status(err.status || 500);
  res.render('error');
});

// express 変数をエクスポート
module.exports = app;
