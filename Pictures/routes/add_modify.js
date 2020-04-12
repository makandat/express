/* add_modify.js */
'use strict';
var express = require('express');
var session = require('express-session');
var mysql = require('./MySQL.js');
var datetime = require('./DateTime.js');
var fs = require('fs');
var os = require('os');
var router = express.Router();
const TITLE = "画像フォルダの追加・修正";

/* 次の sn を得る。*/
function getSN() {
    return new Promise((resolve) => {
        let sql = "SELECT (max(sn)+1) AS maxsn FROM Pictures";
        mysql.getValue(sql, (maxsn)=>{
            resolve(maxsn);
        })
    });
}

/* id の最大値を得る。*/
function getMaxID() {
    return new Promise((resolve) => {
        let sql = "SELECT max(id) FROM Pictures";
        mysql.getValue(sql, (n)=>{
            resolve(n);
        });
    });
}

/* path がすでに登録済みかチェックする。*/
function checkPath(path) {
    return new Promise((resolve) => {
        let sql = `SELECT count(path) FROM Pictures WHERE path = '${path}'`;
        mysql.getValue(sql, (n) => {
            resolve(n);
        });
    });
}

/* データを挿入/更新する。*/
async function addmodify(req, res, modify=false) {
    let id = req.body.id;
    let title = req.body.title;
    title = title.replace(/'/g, "''");
    let creator = req.body.creator;
    let path = req.body.path;
    let prom_stat = await fs.promises.stat(path);
    if (os.platform() == "win32") {
        path = path.replace(/\\/g, '/');
    }
    let countpath = await checkPath(path);
    if (countpath > 0 && id == "") {
        res.render('showInfo', {'title':'エラー', 'message': path + "はすでに登録されています。", 'icon':'cancel.png'});
        return;
    }
    path = path.replace(/'/g, "''").trim();
    let mark = req.body.mark;
    let info = req.body.info;
    info = info.replace(/'/g, "''");
    let fav = req.body.fav;
    let bindata = req.body.bindata;
    let date = req.body.date;
    let sn = await getSN();
    let maxId = await getMaxID();
    let sql = null;
    if (! prom_stat.isDirectory()) {
        res.render("/add_modify", {'message':'指定されたパスが存在しないかディレクトリではありません。', 'id':id, 'title':title, 'creator':creator, 'path':path, 'mark':mark, 'info':info, 'fav':fav, 'bindata':bindata, 'date':date});
        return
    }
    if (modify) {
        sql = `UPDATE Pictures SET title='${title}', creator='${creator}', path='${path}', mark='${mark}', info='${info}', fav=${fav}, bindata=${bindata}, date='${date}' WHERE id=${id}`;
    }
    else {
        sql = `INSERT INTO Pictures VALUES(NULL, '${title}', '${creator}', '${path}', '${mark}', '${info}', ${fav}, 0, ${bindata}, '${date}', ${sn})`;
    }
    console.log(sql);
    try {
        mysql.execute(sql, ()=>{
            let message;
            if (modify) {
                message = `id = ${id} のデータを更新しました。`;
            }
            else {
                let maxid1 = maxId + 1;
                message = `id = ${maxid1} のデータを挿入しました。`
            }
            res.render("add_modify", {'message':message, 'id':id, 'title':title, 'creator':creator, 'path':path, 'mark':mark, 'info':info, 'fav':fav, 'bindata':bindata, 'date':date});
        });    
    }
    catch (err) {
        res.render("add_modify", {'message':err.message, 'id':id, 'title':title, 'creator':creator, 'path':path, 'mark':mark, 'info':info, 'fav':fav, 'bindata':bindata, 'date':date});
    }
}


/* GET /add_modify */
router.get("/", function(req, res, next) {
    let today = datetime.getDateString();
    res.render('add_modify', {'title':TITLE, 'message':'id が空欄の場合は挿入になります。id が数ならデータ確認または更新になります。',
      'id':'', 'title':'', 'creator':'', 'path':'', 'mark':'', 'info':'', 'fav':'0', 'bindata':'0', 'date':today});
});

/* POST /add_modify */
router.post("/", function(req, res, next) {
    let id = req.body.id;
    if (id == "") {
        addmodify(req, res, false);
    }
    else {
        addmodify(req, res, true);
    }
});

/* GET /add_modify/confirm */
router.get("/confirm/:id", function(req, res, next) {
    let id = req.params.id;
    let sql = "SELECT * FROM Pictures WHERE id=" + id;
    try {
        mysql.getRow(sql, (row)=>{
            let ds = datetime.getDateString(row.date);
            res.render("add_modify", {'message':'id ' + id + ' が検索されました。', 'id':id, 'title':row.title, 'creator':row.creator, 'path':row.path, 'mark':row.mark,
             'info':row.info, 'fav':row.fav, 'bindata':row.bindata, 'date':ds});
        });    
    }
    catch (err) {
        res.render("add_modify", {'message':err.message, 'id':id, 'title':'', 'creator':'', 'path':'', 'mark':'',
        'info':'', 'fav':'0', 'bindata':'0', 'date':''});
    }
});

/* エクスポート */
module.exports = router;
