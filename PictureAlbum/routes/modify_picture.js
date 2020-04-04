/* modify_picture.js */
var express = require('express');
var mysql = require('./MySQL.js');
var fs = require('fs');
var os = require('os');
var router = express.Router();
const PAGE_TITLE = "画像(PictureAlbum)の作成・修正";

/* id の最大値を得る。*/
function getMaxId() {
  return new Promise((resolve=>{
    mysql.getValue("SELECT max(id) FROM PictureAlbum", (mid) => {
      resolve(mid);
    });
  }));
}

/* ファイルが存在するか確認する。*/
function fileExists(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(stats.isFile());
      }
    });
  });
}

/* フォームデータをテーブルに挿入する。*/
async function insertData(req, res) {
  let message;
  let album = req.body.album;
  if (album == "0") {
    message = `データの挿入に失敗しました。アルバム番号は 1 以上です (album=0)。`;
    res.render('showInfo', {'title':'エラー', 'message':message, 'icon':'cancel.png'});
    return;
  }
  let name = req.body.name.replace(/'/g, "''").trim();
  let creator = req.body.creator.replace(/'/g, "''").trim();
  let path = req.body.path;
  let b = await fileExists(path);
  try {
    if (b == false) {
      message = `データの挿入に失敗しました。パスはファイルでなければなりません。`;
      res.render('showInfo', {'title':'エラー', 'message':message, 'icon':'cancel.png'});
      return;
    }  
  }
  catch (e) {
    message = `データの挿入に失敗しました。パスが存在しません。`;
    res.render('showInfo', {'title':'エラー', 'message':message, 'icon':'cancel.png'});
    return
  }
  path = path.replace(/'/g, "''").replace(/\\/, '/').trim();
  let info = req.body.info.replace(/'/g, "''");
  let fav = req.body.fav;
  let bindata = req.body.bindata;
  let picturesid = req.body.picturesid;
  if (parseInt(album) == NaN) {
    message = `データの挿入に失敗しました。アルバム番号が不正です。`;
    res.render('showInfo', {'title':'エラー', 'message':message, 'icon':'cancel.png'});
  }
  else if (parseInt(fav) == NaN) {
    message = `データの挿入に失敗しました。「好き」が不正です。`;
    res.render('showInfo', {'title':'エラー', 'message':message, 'icon':'cancel.png'});
  }
  else {
    let id = await getMaxId();
    message = `データの挿入に成功しました。id = ${id+1}`;
    let sql = `INSERT INTO PictureAlbum(album, title, path, creator, info, fav, bindata, picturesid, date) VALUES(${album}, '${name}', '${path}', '${creator}', '${info}', ${fav}, ${bindata}, ${picturesid}, CURRENT_DATE())`;
    mysql.execute(sql, function() {
      res.render("modify_picture", {"title": PAGE_TITLE, "message": message, "id": "", "album": album, "name": name, "creator": creator, "path": path, 
      "info": info, "fav": fav, "bindata": bindata, "picturesid": picturesid});
    });
  }
}

/* フォームデータでテーブルを更新する。*/
function updateData(req, res) {
  let message;
  let id = req.body.id;
  let album = req.body.album;
  let name = req.body.name.replace(/'/g, "''").trim();
  let creator = req.body.creator.replace(/'/g, "''").trim();
  try {
    if (b == false) {
      message = `データの更新に失敗しました。パスはファイルでなければなりません。`;
      res.render('showInfo', {'title':'エラー', 'message':message, 'icon':'cancel.png'});
      return;
    }  
  }
  catch (e) {
    message = `データの更新に失敗しました。パスが存在しません。`;
    res.render('showInfo', {'title':'エラー', 'message':message, 'icon':'cancel.png'});
    return
  }
  let path = req.body.path.replace(/'/g, "''").trim();
  if (os.platform == "win32") {
    path = path.replace(/\\/, "/");
  }
  let info = req.body.info.replace(/'/g, "''");
  let fav = req.body.fav;
  let bindata = req.body.bindata;
  let picturesid = req.body.picturesid;
  if (parseInt(id) == NaN) {
    message = `データの更新に失敗しました。id が不正です。`;
    res.render('showInfo', {'title':'エラー', 'message':message, 'icon':'cancel.png'});
  }
  else if (parseInt(album) == NaN) {
    message = `データの更新に失敗しました。アルバム番号が不正です。`;
    res.render('showInfo', {'title':'エラー', 'message':message, 'icon':'cancel.png'});
  }
  else if (parseInt(fav) == NaN) {
    message = `データの更新に失敗しました。「好き」が不正です。`;
    res.render('showInfo', {'title':'エラー', 'message':message, 'icon':'cancel.png'});
  }
  else {
    message = `データの更新に成功しました。id = ${id}`;
    let sql = `UPDATE PictureAlbum SET album=${album}, title='${name}', creator='${creator}', path='${path}', info='${info}', bindata=${bindata}, picturesid=${picturesid}, \`date\`=CURRENT_DATE() WHERE id=${id}`;
    mysql.execute(sql, function() {
      res.render("modify_picture", {"title": PAGE_TITLE, "message": message, "id": id, "album": album, "name": name, "creator": creator, "path": path, "info": info,
        "fav": fav, "bindata": bindata, "picturesid": picturesid});
    });
  }
}

/* データ確認 */
function confirmData(req, res) {
  let id = req.params.id;
  if (id == undefined) {
    res.render("modify_picture", {"title": PAGE_TITLE, "message": "エラー： id が空欄です。", "id": "", "album": "", "info": "", "fav": 0, "bindata": 0, "picturesid": 0});
  }
  else {
    let sql = `SELECT * FROM PictureAlbum WHERE id=${id}`;
    mysql.getRow(sql, function(row, fields) {
      res.render("modify_picture", {"title": PAGE_TITLE, "message": "データを取得しました。", "id": row.id, "album": row.album, "name": row.title, "path": row.path, "creator": row.creator, "mark": row.mark, 
      "info": row.info, "fav": row.fav, "bindata": row.bindata, "picturesid": row.picturesid});
    });
  }
}

/* ハンドラ */
/*  デフォルトのハンドラ */
router.get('/', function(req, res, next) {
  res.render("modify_picture", {"title": PAGE_TITLE, "message": "", "id": "", "album": 0, "name": "", "creator":"", "path": "", "mark": "", "info": "", "fav": 0, "bindata": 0, "picturesid":0});
});

/* フォームデータを受け取る。*/
router.post("/", function(req, res, next) {
  let id = req.body.id;
  if (id == "") {
    // 挿入
    insertData(req, res);
  }
  else {
    // 更新
    updateData(req, res);
  }  
});

/* データ確認 */
router.get('/confirm/:id', function(req, res, next) {
  let id = req.params.id;
  confirmData(req, res);
});

/* エクスポート */
module.exports = router;
