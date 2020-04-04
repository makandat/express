/* users.js */
'use strict';
var express = require('express');
var mysql = require('./MySQL.js');
var session = require('express-session');

var router = express.Router();

const URLROOT = "/";
const MESSAGE1 = '正しいユーザIDとパスワードを入力してログインしてください。';
var userid = null;
var password = null;
var page = null;

/* 結果を表示する。*/
function showResult(value) {
  if (password == value) {
    // デフォルトページへリダイレクトする。
    session.userid = userid;
    page.redirect(URLROOT);
  }
  else {
    // ログイン画面を表示する。
    page.render('login', {'title':'User Login', 'message': MESSAGE1});
  }
}

/* GET /users  */
router.get('/', function(req, res, next) {
  if (session.userid == undefined) {
    // ログイン画面を表示する。
    res.render('login', {'title':'User Login', 'message': MESSAGE1});
  }
  else {
    // デフォルトページへリダイレクトする。
    res.redirect(URLROOT);
  }
});

/* POST /users */
router.post('/', function(req, res, next) {
  if (session.userid == undefined) {
    if (!(req.body.userid == "" || req.body.password == "")) {
      // ユーザIDとパスワードを確認する。
      userid = req.body.userid;
      password = req.body.password;
      page = res;
      mysql.getValue(`SELECT password FROM Users WHERE userid = '${req.body.userid}'`, showResult)
    }
    else {
      // ログイン画面を表示する。
      res.render('login', {'title':'User Login', 'message': MESSAGE1});
    }
  }
  else {
    // デフォルトページへリダイレクトする。
    res.redirect(URLROOT);
  }
});


/* GET /users/logout */
router.get('/logout', function(req, res, next) {
  // session.userid を無効化
  session.userid = undefined;
  // ログイン画面を表示する。
  res.render('login', {'title':'User Login', 'message': MESSAGE1});
});

/* router をエクスポート */
module.exports = router;
