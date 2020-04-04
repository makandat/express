/* pictalbum.js */
'use strict';
var express = require('express');
var router = express.Router();

var mysql = require('./MySQL.js');

const LIMIT = 200;  // 1ページの表示数
const SELECT0 = "SELECT id, album, title, `path`, creator, info, fav, picturesid, DATE_FORMAT(`date`, '%Y-%m-%d') AS DT FROM PictureAlbum";

/* アルバム番号のチェック */
function checkAlbum(album) {
  return new Promise((resolve)=>{
    mysql.getValue("SELECT count(id) FROM PictureAlbum WHERE album=" + album, (n) => {
      resolve(n);
    })
  });
}

/* アルバム番号からアルバム名を得る */
function getAlbumName(album) {
  return new Promise((resolve) => {
    mysql.getValue("SELECT name FROM Album WHERE id = " + album, (name) => {
      resolve(name);
    });
  });
}

/* PictureAlbum テーブルの内容を表示する。 */
async function showContent(req, res) {
  let n = await checkAlbum(req.session.album);
  if (n == 0) {
    res.render('showInfo', {'title':'エラー', 'message':'指定したアルバムには画像がありません。', 'icon':'cancel.png'});
  }
  else {
    let albumName = await getAlbumName(req.session.album);
    switch (req.session.state) {
      case "pictlist":
        showPictList(req, res, albumName);
        break;
      case "thumbs":
        showThumbs(req, res, albumName);
        break;
      default:
        showDetails(req, res,albumName);
        break;
    }  
  }
}

/* PictureAlbum テーブルの内容を詳細表示する。*/
function showDetails(req, res, albumName) {
  let sql = makeSelect(req, req.session.album);
  let results = [];
  mysql.query(sql, (row) =>{
    if (row == null) {
      res.render('pictalbum_details', { "title": '画像アルバム (PictureAlbum)', "results": results, "message": "アルバム=" + albumName });
    }
    else {
      let atitle = `<a href="/getimage?path=${row.path}" target="_blank">${row.title}</a>`;
      results.push([row.id, row.album, atitle, row.path, row.creator, row.info, row.fav, row.bindata, row.picturesid, row.DT]);
    } 
  });
}

/* PictureAlbum テーブルの画像を一覧表示する。*/
function showPictList(req, res, albumName) {
  let sql = makeSelect(req, req.session.album);
  let results = [];
  mysql.query(sql, (row) =>{
    if (row == null) {
      res.render('pictalbum_pictlist', { "title": '画像アルバム for express4 (PictureAlbum)', "results": results, "message": "アルバム=" + albumName });
    }
    else {
      results.push([row.id, row.album, row.title, row.path, row.creator, row.info, row.fav, row.bindata, row.picturesid, row.DT]);
    } 
  });
}

/* PictureAlbum テーブルの画像をサムネール表示する。*/
function showThumbs(req, res, albumName) {
  let sql = makeSelect(req, req.session.album);
  let results = [];
  mysql.query(sql, (row) =>{
    if (row == null) {
      res.render('pictalbum_thumbs', { "title": "画像アルバム for express4 (PictureAlbum)", "results": results, "message": "アルバム=" + albumName });
    }
    else {
      let picturesid;
      if (row.picturesid == null)
        picturesid = "";
      else
        picturesid = row.picturesid;
      results.push([row.id, row.album, row.title, row.path, row.creator, row.info, row.fav, row.bindata, picturesid, row.DT]);
    } 
  });
}

  
/* SELECT 文を作成する。*/
function makeSelect(req, album) {
  let sql = SELECT0;
  let where = "";
  let orderby = "";

  if (album == undefined) {
    where = "";
  }
  else {
    where = " WHERE album = " + album;
  }

  if (req.session.desc) {
    // 降順
    orderby = " ORDER BY id DESC";
  }
  else {
    // 昇順
    orderby = " ORDER BY id ASC";
  }
  sql = sql + where + orderby;
  return sql;
}



/*  リクエストハンドラ */

/* アルバム番号を指定して PictureAlbum テーブル一覧 */
router.get('/', function(req, res, next) {
  if (req.session.desc == undefined) {
    req.session.desc = false;
  }
  if (req.session.state == undefined) {
    req.session.state = "details";
  }
  let album = req.query.album;
  req.session.album = album;
  showContent(req, res);
});

/* 逆順で表示 */
router.get('/reverse', function(req, res, next) {
  req.session.desc = ! req.session.desc;
  showContent(req, res);
});

/* 画像一覧表示 */
router.get('/pictlist', function(req, res, next) {
  req.session.state = "pictlist";
  showContent(req, res);
});

/* サムネール一覧表示 */
router.get('/thumbs', function(req, res, next) {
  req.session.state = "thumbs";
  showContent(req, res);  
});

/* 詳細一覧表示 */
router.get('/details', function(req, res, next) {
  req.session.state = "details";
  showContent(req, res);
});

/* 先頭のページ */
router.get('/first', function(req, res, next) {
  if (req.session.desc) {
    req.session.sn = 1000000;
  }
  else {
    req.session.sn = 0;
  }
  showContent(req, res);
});

/* 前のページ */
router.get('/prev', function(req, res, next) {
  let n = parseInt(req.session.sn);
  if (req.session.desc) {
    n += LIMIT;
  }
  else {
    n -= LIMIT;
  }  
  req.session.sn = n;
  showContent(req, res);
});

/* 次のページ */
router.get('/next', function(req, res, next) {
  let n = parseInt(req.session.sn);
  if (req.session.desc) {
    n -= LIMIT;
  }
  else {
    n += LIMIT;
  }  
  req.session.sn = n;
  showContent(req, res);
});

/* 最後のページ */
router.get('/last', function(req, res, next) {
  if (req.session.desc) {
    req.session.sn = 0;
    showContent(req, res);
  }
  else {
    mysql.getValue("SELECT max(sn) FROM PictureAlbum", (n) => {
      n -= LIMIT;
      req.session.sn = n;
      showContent(req, res);
    });
  }
});




/* エクスポート */
module.exports = router;
