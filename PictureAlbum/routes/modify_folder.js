/* modify_folders.js */
var express = require('express');
var os = require('os');
var fs = require('fs');
var mysql = require('./MySQL.js');
var router = express.Router();
const PAGE_TITLE = "画像フォルダの追加・修正";

/* ファイルが存在するか確認する。*/
function dirExists(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(stats.isDirectory());
      }
    });
  });
}

/* フォームデータをテーブルに挿入する。*/
async function insertData(req, res) {
  let name = req.body.name.replace(/'/g, "''").trim();
  let creator = req.body.creator.replace(/'/g, "''");
  let mark = req.body.mark;
  try {
  let b = await dirExists(req.body.path);
    if (! b) {
      res.render('showInfo', {'title':'エラー', 'message':'指定したディレクトリは存在しません。', 'icon':'cancel.png'})
      return;
    }
  }
  catch (e) {
    res.render('showInfo', {'title':'エラー', 'message':'指定したディレクトリは存在しません。', 'icon':'cancel.png'})
    return;
  }
  let path = req.body.path.replace(/'/g, "''").trim();
  if (os.platform == "win32") {
    path = path.replace('\\', '/');
  }
  let info = req.body.info.replace(/'/g, "''");
  let fav = req.body.fav;
  let bindata = req.body.bindata;
  let message = "データの挿入に成功しました。";
  let sql = `INSERT INTO Pictures(title, creator, path, mark, info, fav, count, bindata, date) VALUES('${name}', '${creator}', '${path}', '${mark}', '${info}', 0, 0, ${bindata} ', CURRENT_DATE())`;
  mysql.execute(sql, function() {
    res.render("modify_folder", {"title": PAGE_TITLE, "message": message, "id": "", "name": name, "creator": creator, "path": path, "mark": mark, "info": info, "fav": fav, "count": count, "bindata": bindata});
  });
}

/* フォームデータでテーブルを更新する。*/
async function updateData(req, res) {
  let id = req.body.id;
  let name = req.body.name.replace(/'/g, "''").trim();
  let creator = req.body.creator.replace(/'/g, "''");
  let b = await dirExists(req.body.path);
  try {
    if (! b) {
      res.render('showInfo', {'title':'エラー', 'message':'指定したディレクトリは存在しません。', 'icon':'cancel.png'})
      return;
    }  
  }
  catch (e) {
    res.render('showInfo', {'title':'エラー', 'message':'指定したディレクトリは存在しません。', 'icon':'cancel.png'})
    return;
  }
  let path = req.body.path.replace(/'/g, "''").trim();
  if (os.platform == "win32") {
    path = path.replace('\\', '/');
  }
  let mark = req.body.mark;
  let info = req.body.info.replace(/'/g, "''");
  let fav = req.body.fav;
  let count = req.body.count;
  let bindata = req.body.bindata;
  let message = `データの更新に成功しました。id = ${id}`;
  let sql = `UPDATE Pictures SET title='${name}', creator='${creator}', path='${path}', mark='${mark}', info='${info}', fav='${fav}', bindata=${bindata}, \`date\`=CURRENT_DATE() WHERE id=${id}`;
  mysql.execute(sql, function() {
    res.render("modify_folder", {"title": PAGE_TITLE, "message": message, "id": id, "name": name, "creator": creator, "path": path, 
    "mark": mark, "info": info, "fav": fav, "count": count, "bindata": bindata});
  });
}

/* データ確認 */
function confirmData(req, res) {
  let id = req.params.id;
  if (id == undefined) {
    res.render("modify_folder", {"title": PAGE_TITLE, "message": "エラー： id が空欄です。", "id": "", "album": "", "info": "", "bindata": 0, "groupname": ""});
  }
  else {
    let sql = `SELECT * FROM Pictures WHERE id=${id}`;
    mysql.getRow(sql, function(row, fields) {
      if (row == undefined) {
        res.render("showInfo", {"title":"エラー", "message":"id に対するデータがありません。", "icon":"cancel.png"});
      }
      else {
        res.render("modify_folder", {"title": PAGE_TITLE, "message": "データを取得しました。", "id": row.ID, "name": row.TITLE, "creator": row.CREATOR, 
        "path": row.PATH, "mark": row.MARK, "info": row.INFO, "fav": row.FAV, "bindata": row.BINDATA});
      }
    });
  }
}


/*  デフォルトのハンドラ */
router.get('/', function(req, res, next) {
  res.render("modify_folder", {"title": PAGE_TITLE, "message": "", "id": "", "name": "", "creator": "", "path": "", "mark": "", "info": "", "fav": 0, "bindata": 0});
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
  confirmData(req, res);
});

module.exports = router;