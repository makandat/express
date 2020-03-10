/* bindata.js */
'use strict';
var express = require('express');
var router = express.Router();

var mysql = require('./MySQL.js');
var results = []; // クエリー結果
var page = null;   // HTTP応答ページ
const LIMIT = 200;  // 1ページの表示数
const SELECT0 = "SELECT id, title, original, datatype, info, size FROM BINDATA WHERE datatype='.jpg' OR datatype='.png'";
const SELECT1 = "SELECT id, title, data FROM BINDATA WHERE datatype='.jpg' OR datatype='.png'";

/* BINDATA テーブルの内容一覧を表示する。*/
function showBINDATAList(row) {
  if (row == null) {
    page.render('bindata', { "title": '画像アルバム for express4 (BINDATA)', "results": results, "message": "データの挿入や更新はコマンドで行う。詳細はヘルプを参照。" });
  }
  else {
    results.push([row.id, row.title, row.original, row.datatype, row.info, row.size]);
  }
}

/* BINDATA テーブルの画像一覧を表示する。*/
function showBINDATAThumbs(row) {
  if (row == null) {

  }
  else {
    
  }  
}

/* セッションの値を初期化する。*/
function initSessionValues(req, force=false) {
  if (req.session.bdescend == undefined) {
    req.session.bdescend = false;
  }

  if (req.session.bid_min == undefined) {
    req.session.bid_min = 0;
  }

  if (req.session.bid_max == undefined) {
    req.session.bid_max = 1000000;
  }

  if (force) {
    req.session.bdescend = false;
    req.session.bid_min = 0;
    req.session.bid_max = 1000000;
  }
}

/* SELECT 文を作成する。*/
function makeSelect(req) {
  let sql = SELECT0;
  let where;
  let orderby;

  if (req.session.bdecend) {
    // 降順
    orderby = " ORDER BY id DESC";
  }
  else {
    // 昇順
    orderby = " ORDER BY id ASC";
  }
}



/*  リクエストハンドラ */
/* GET BINDATA table listing. */
router.get('/', function(req, res, next) {
  initSessionValues(req, true);
  page = res;
  let sql = SELECT0 + " LIMIT " + LIMIT;
  results = [];
  mysql.query(sql, showBINDATAList);
});

/* 逆順で表示 */
router.get('/reverse', function(req, res, next) {
  page = res;

});

/* サムネール一覧で表示 */
router.get('/thumbs', function(req, res, next) {
  page = res;

});

/* 詳細一覧表示 */
router.get('/details', function(req, res, next) {
  page = res;

});

/* 先頭のページへ */
router.get('/first', function(req, res, next) {
  page = res;

});

/* 前のページへ */
router.get('/prev', function(req, res, next) {
  page = res;

});

/* 次のページへ */
router.get('/next', function(req, res, next) {
  page = res;

});

/* 最後のページへ */
router.get('/last', function(req, res, next) {
  page = res;

});

/* 指定 id から表示する。(表示は昇順へもどる) */
router.get('/jump/:id', function(req, res, next) {
  page = res;

});

/* BINDATA テーブルから画像データを得る。*/
router.get('/extract/:id', function(req, res, next){
  
});

module.exports = router;