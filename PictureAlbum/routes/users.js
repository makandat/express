'use strict';
/* users.js */
var express = require('express');
var router = express.Router();

var mysql = require('./MySQL.js');

const MESSAGE0 = '正しいユーザIDとパスワードを入力して「ログイン」ボタンをクリックしてください。';
const MESSAGE1 = 'ログイン失敗： ユーザIDとパスワードを再確認してログインし直してください。';


/* デフォルトのリクエスト */
router.get('/', (req, res) => {
    if (req.session.user == undefined) {
        res.render('login', {'message':MESSAGE0, 'userid':'', 'password':''});
    }
    else {
        res.redirect('/');
    }
});

/* ページのリクエスト */
router.get('/page', (req, res) => {
    if (req.session.user == undefined) {
        res.render('login', {'message':MESSAGE0, 'userid':'', 'password':''});
    }
    else {
        let pageurl = req.query.page;
        if (pageurl == undefined || pageurl == "") {
            pageurl = "/";
        }
        res.redirect(pageurl);
    }
});

/* LOGIN リクエスト */
router.post('/login', (req, res) => {
    let {userid, password} = req.body;
    if (userid == "" || password == "") {
        req.session.user = undefined;
        res.render("showInfo", {'title':'エラー', 'message':MESSAGE0, 'icon':'cancel.png', 'link':'<a href="/users">ログイン</a>'});
        return;
    }
    let sql = "SELECT `password` FROM Users WHERE userid='" + userid + "'";
    mysql.getValue(sql, (pwd) => {
        if (pwd == password) {
            req.session.user = userid;
            res.redirect('/');
        }
        else {
            res.render('login', {'message':MESSAGE1, 'userid':'', 'password':''});
        }
    });
});


/* ログアウト */
router.get('/logout', (req, res) => {
    req.session.user = undefined;
    res.render('showInfo', {title:"ログアウト", message:'ログアウトしました。', icon:"info.jpg", link:"ログイン", url:"/users"});
});



/* エクスポート */
module.exports = router;
