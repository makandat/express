/* modify_picture.js */
var express = require('express');
var mysql = require('./MySQL.js');
var router = express.Router();
const PAGE_TITLE = "画像(PictureAlbum)の作成・修正";

/* フォームデータをテーブルに挿入する。*/
function insertData(req, res) {
  let album = req.body.album;
  let name = req.body.name;
  let creator = req.body.creator.replace(/'/g, "''");
  let path = req.body.path.replace(/'/g, "''");
  let info = req.body.info.replace(/'/g, "''");
  let fav = req.body.fav;
  let bindata = req.body.bindata;
  let picturesid = req.body.picturesid;
  let message = "データの挿入に成功しました。";
  let sql = `INSERT INTO PictureAlbum(album, title, creator, path, info, fav, bindata, picturesid, date) VALUES(${album}, '${name}', '${creator}', '${path}', '${info}', 0, ${bindata} ', 0, CURRENT_DATE())`;
  mysql.execute(sql, function() {
    res.render("modify_folder", {"title": PAGE_TITLE, "message": message, "id": "", "album": album, "name": name, "creator": creator, "path": path, 
    "info": info, "fav": fav, "bindata": bindata, "picturesid": picturesid});
  });
}

/* フォームデータでテーブルを更新する。*/
function updateData(req, res) {
  let id = req.body.id;
  let album = req.body.album;
  let name = req.body.name.replace(/'/g, "''");
  let creator = req.body.creator.replace(/'/g, "''");
  let path = req.body.path.replace(/'/g, "''");
  let info = req.body.info.replace(/'/g, "''");
  let fav = req.body.fav;
  let bindata = req.body.bindata;
  let picturesid = req.body.picturesid;
  let message = `データの更新に成功しました。id = ${id}`;
  let sql = `UPDATE Pictures SET album=${album}, title='${name}', creator='${creator}', path='${path}', info='${info}', bindata=${bindata}, picturesid=${picturesid}, \`date\`=CURRENT_DATE() WHERE id=${id}`;
  mysql.execute(sql, function() {
    res.render("modify_picture", {"title": PAGE_TITLE, "message": message, "id": id, "title": name, "creator": creator, "path": path, "info": info,
     "fav": fav, "count": count, "bindata": bindata, "picturesid": picturesid});
  });
}

/* データ確認 */
function confirmData(req, res) {
  let id = req.params.id;
  if (id == undefined) {
    res.render("modify_picture", {"title": PAGE_TITLE, "message": "エラー： id が空欄です。", "id": "", "album": "", "info": "", "fav": 0, "bindata": 0, "picturesid": 0});
  }
  else {
    let sql = `SELECT * FROM Pictures WHERE id=${id}`;
    mysql.getRow(sql, function(row, fields) {
      res.render("modify_picture", {"title": PAGE_TITLE, "message": "データを取得しました。", "id": row.id, "name": row.title, "path": row.path, "mark": row.mark, 
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
