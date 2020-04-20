/* pictalbum.js */
'use strict';
var express = require('express');
var router = express.Router();
var path_module = require('path');

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
async function showContent(req, res, picturesid=undefined) {
  let album = req.session.album;
  if (picturesid == undefined && (album == undefined || album == null || album == "" || album == "0")) {
    showDetailAll(req, res);
    return;
  }
  let n = await checkAlbum(album);
  if (n == 0) {
    res.render('showInfo', {'title':'エラー', 'message':'指定したアルバムには画像がありません。', 'icon':'cancel.png', 'link':'<a href="javascript:window.close()">閉じる</a>'});
  }
  else {
    let albumName = await getAlbumName(album);
    switch (req.session.state) {
      case "pictlist":
        showPictList(req, res, albumName, picturesid);
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

/* アルバムを指定して PictureAlbum テーブルの内容を詳細表示する。*/
function showDetails(req, res, albumName="") {
  let sql = makeSelect(req, req.session.album);
  let results = [];
  mysql.query(sql, (row) =>{
    if (row == null) {
      let message = "アルバム=" + albumName;
      if (albumName == "") {
        message = "";
      }
      res.render('pictalbum_details', { "title": '画像アルバム (PictureAlbum)', "results": results, "message": message });
    }
    else {
      let apath = `<a href="/getimage?path=${row.path}" target="_blank">${row.path}</a>`;
      let atitle;
      if (row.picturesid == 0 || row.picturesid == null) {
        atitle = row.title;
      }
      else {
        atitle = `<a href="/pictalbum/pictlist?picturesid=${row.picturesid}" target="_blank">${row.title}</a>`;
      }
      results.push([row.id, row.album, atitle, apath, row.creator, row.info, row.fav, row.bindata, row.picturesid, row.DT]);
    } 
  });
}

/* アルバムを指定せず PictureAlbum テーブルの内容を詳細表示する。*/
function showDetailAll(req, res) {
  let results = [];
  let sql = "SELECT * FROM PictureAlbum";
  if (req.session.desc) {
    if (req.session.sn == 0) {
      req.session.sn = 1000000;
    }
    sql += " WHERE sn <= " + req.session.sn + " ORDER BY id DESC LIMIT " + LIMIT;
  }
  else {
    sql += " WHERE sn >= " + req.session.sn + " ORDER BY id ASC LIMIT " + LIMIT;
  }
  mysql.query(sql, (row) =>{
    if (row == null) {
      let message = "sn =" + req.session.sn;
      res.render('pictalbum_details', { "title": '画像アルバム (PictureAlbum)', "results": results, "message": message });
    }
    else {
      let apath = `<a href="/getimage?path=${row.path}" target="_blank">${row.path}</a>`;
      let atitle;
      if (row.picturesid == 0 || row.picturesid == null) {
        atitle = row.title;
      }
      else {
        atitle = `<a href="/pictalbum/pictlist?picturesid=${row.picturesid}" target="_blank">${row.title}</a>`;
      }
      results.push([row.id, row.album, atitle, apath, row.creator, row.info, row.fav, row.bindata, row.picturesid, row.DT]);
    } 
  });
}

/* PictureAlbum テーブルの画像を一覧表示する。*/
function showPictList(req, res, albumName, picturesid=undefined) {
  let sql = makeSelect(req, req.session.album, picturesid);
  let results = [];
  mysql.query(sql, (row) =>{
    if (row == null) {
      res.render('pictalbum_pictlist', { "title": '画像アルバム for express4 (PictureAlbum)', "results": results, "message": "アルバム=" + albumName });
    }
    else {
      let dir = path_module.dirname(row.path);
      results.push([row.id, row.album, row.title, row.path, row.creator, row.info, row.fav, row.bindata, row.picturesid, row.DT, dir]);
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
function makeSelect(req, album, picturesid=undefined) {
  let sql = SELECT0;
  let where = "";
  let orderby = "";
  let and = false;

  if (album == undefined) {
    where = "";
  }
  else {
    where = " WHERE album = " + album;
    and = true;
  }

  if (!(picturesid == undefined || picturesid == null)) {
    if (and) {
      where += " AND picturesid = " + picturesid;
    }
    else {
      where = " WHERE picturesid = " + picturesid;
    }
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
  req.session.album = req.query.album;
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
  let picturesid = req.query.picturesid;
  showContent(req, res, picturesid);
});

/* サムネール一覧表示 */
router.get('/thumbs', function(req, res, next) {
  req.session.state = "thumbs";
  showContent(req, res);  
});

/* 詳細一覧表示 */
router.get('/details', function(req, res, next) {
  req.session.state = "details";
  if (req.query.pictalbum == "ALL") {
    req.session.album = "";
  }
  req.session.sn = 0;
  req.session.desc = false;
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
