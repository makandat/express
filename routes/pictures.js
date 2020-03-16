/* pictures.js */
'use strict';
const express = require('express');
const router = express.Router();
const mysql = require('./MySQL.js');
const fso = require('./FileSystem.js');
var results = []; // クエリー結果
var page = null;   // HTTP応答ページ
const LIMIT = 200;  // 1ページの表示数
const SELECT0 = "SELECT id, title, creator, path, mark, info, fav, count, bindata, DATE_FORMAT(`date`, '%Y-%m-%d') AS DT FROM Pictures";

/* Pictures テーブルの内容を表示する。*/
function showPictures(row, fields) {
  if (row == null) {
    page.render('pictures', { "title": '画像アルバム for express4 (Pictures)', "results": results, "message": "" });
  }
  else {
    let modifylink = `<a href="/modify_folder/confirm/${row.id}" target="_blank">${row.id}</a>`;
    let showlink = `<a href="/pictures/folderImages/${row.id}">${row.title}</a>`;
    results.push([modifylink, showlink, row.creator, row.path, row.mark, row.info, row.fav, row.count, row.bindata, row.DT]);
  }    
}


/* セッションの値を初期化する。*/
function initSessionValues(req, force=false) {
  if (req.session.pdescend == undefined) {
    req.session.pdescend = false;
  }

  if (req.session.criteria == undefined) {
    req.session.criteria = {};
  }

  if (req.session.pid_min == undefined) {
    req.session.pid_min = 0;
  }

  if (req.session.pid_max == undefined) {
    req.session.pid_max = 1000000;
  }

  if (force) {
    req.session.adescend = false;
    req.session.criteria = {};
    req.session.aid_min = 0;
    req.session.aid_max = 1000000;
    req.session.currentid = undefined;
  }
}
  
/* SELECT 文を作成する。*/
function makeSelect(req) {
  let sql = SELECT0;
  let where;
  let orderby;

  if (req.session.pdecend) {
    // 降順
    orderby = " ORDER BY id DESC";
  }
  else {
    // 昇順
    orderby = " ORDER BY id ASC";
  }
}

/* path で指定されたフォルダ内の画像一覧を表示する。*/
function showFolderPictures(id, path) {
  fso.getFiles(path, ['.jpg', '.png', '.gif', '.JPG', '.jpeg', '.PNG'], (files) => {
    let parts = path.split('/');
    page.render("folderImages", {"title": "画像一覧 (" + parts[parts.length-1] + ")", "message": path, "id": id, "results": files});
  });
}

/* path で指定されたフォルダ内の画像一覧をサムネール表示する。*/
function showFolderThumbs(id, path) {
  fso.getFiles(path, ['.jpg', '.png', '.gif', '.JPG', '.jpeg', '.PNG'], (files) => {
    let parts = path.split('/');
    page.render("folderThumbs", {"title": "画像一覧 (" + parts[parts.length-1] + ")", "message": path, "id": id, "results": files});
  });
}


/*  リクエストハンドラ */
/* デフォルトハンドラ */
router.get('/', (req, res, next) => {
  initSessionValues(req, true);
  page = res;
  let sql = `${SELECT0} LIMIT ${LIMIT}`;
  results = [];
  mysql.query(sql, showPictures);
});

/* 先頭の id を指定して表示 */
router.get('/:id', (req, res, next) => {
  initSessionValues(req, true);
  page = res;
  let id = req.params.id;
  req.session.criteria.id = id;
  let sql = makeSelect(req);
  results = [];
  mysql.query(sql, showPictures);
});

/* フォルダ内の画像一覧を表示する。id は Pictures テーブルの id */
router.get('/folderImages/:id', (req, res, next) => {
  initSessionValues(req, true);
  page = res;
  let id = req.params.id;
  mysql.getRow("SELECT path FROM Pictures WHERE id=" + id, (row) => {
    showFolderPictures(id, row.path);
  });
});

/* フォルダ内の画像をサムネール表示する。id は Pictures テーブルの id */
router.get("/folderThumbs/:id", (req, res, next) => {
  initSessionValues(req, true);
  page = res;
  let id = req.params.id;
  mysql.getRow("SELECT path FROM Pictures WHERE id=" + id, (row) => {
    showFolderThumbs(id, row.path);
  });
});

/* エクスポート */
module.exports = router;