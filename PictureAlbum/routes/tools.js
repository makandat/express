'use strict';
/* tools.js */
var express = require('express');
var router = express.Router();

var mysql = require('./MySQL.js');
var fso = require('./FileSystem.js');
var child_process = require('child_process');
var os = require('os');

/* 指定したテーブルの指定 id データを削除する。*/
function deleteRow(tableName, id) {
    return new Promise((resolve) => {
        let sql = `DELETE FROM ${tableName} WHERE id=${id}`;
        mysql.execute(sql, () => {
            resolve(1);
        })
    });
}

/* Pictures テーブルの id から派生テーブル名を得る。*/
function getDerivedTable(id) {
    return new Promise((resolve) => {
        let sql = `SELECT mark FROM Pictures WHERE id=${id}`;
        mysql.getValue(sql, (mark) => {
            let tableName = "";
            switch (mark) {
                case "MANGA":
                    tableName = "PicturesManga";
                    break;
                case "HCG":
                    tableName = "PicturesHcg";
                    break;
                case "DOUJIN":
                    tableName = "PicturesDoujin";
                    break;
                case "PIXIV":
                    tableName = "PicturesPixiv";
                    break;
                default:
                    break;
            }
            resolve(tableName);
        });
    });
}

/* Pictures テーブルの id に対する bindata の id を得る。*/
function getBINDATAId(id) {
    return new Promise((resolve) => {
        let sql = "SELECT bindata FROM Pictures WHERE id = " + id;
        mysql.getValue(sql, (bid) => {
            resolve(bid);
        });
    });
}

/* データ削除 */
async function deleteData(id, derived_table, bindata) {
    let message = "'message':'id=' + id + ' を削除しました。"
    if (derived_table) {
        let tableName = await getDerivedTable(id);
        await deleteRow(tableName, id);
        message += `関連テーブルは ${tableName} です。`;
    }
    if (bindata) {
        let bid = await getBINDATAId(id);
        if (!(bid == null || bid == 0)) {
            await deleteRow('BINDATA', bid);
            message += `BINDATA テーブルの id は ${bid} です。`;
        }
    }
    await deleteRow('Pictures', id);
    return message;
}

/* デフォルトはエラーにする。*/
router.get("/", (req, res) => {
    res.render('showInfo', {'title':'エラー', 'message':'/tools は画面表示用ではありません。', 'icon':'cancel.png'});
});

/* Pictures テーブルの指定した id のレコードを派生テーブルに追加 */
router.get('/insertDerivedTable', (req, res) => {
    let {id, stored} = req.query;
    let sql = `CALL ${stored}(${id})`;
    mysql.execute(sql, () => {
        res.json({'err':'0', 'message':"id = " + id + " を追加しました。"});
    });
});

/* テーブルの行番号 (sn) を付け直す。*/
router.get('/renumberSN', (req,res) =>{
    let table = req.query.table;
    let sql = `CALL ${table}()`;
    mysql.execute(sql, () => {
        res.json({'err':'0', 'message':"ストアドプロシージャ " + table + " を実行しました。"});
    });
});

/* Pictures と派生テーブルからのデータ削除 */
router.get('/deletePictures', (req, res) => {
    let {id, derived_table, bindata} = req.query;
    let message = deleteData(id, derived_table, bindata);
    res.json({'err':'0', 'message':message});
});

/* アルバムを削除 */
router.get('/deleteAlbum', (req, res) => {
    let id = req.query.id;
    mysql.execute(`CALL DeleteAlbum(${id})`, () => {
        res.json({'err':'0', 'message':"アルバム id = " + id + " を削除しました。"});
    });
});

/* ファイルを PictureAlbum にインポートする promise 関数 */
function insertFile(path, album) {
    return new Promise((resolve) => {
        let title = fso.getFileName(path).replace(/'/g, "''");
        let sql = `INSERT INTO PictureAlbum VALUES(NULL, ${album}, '${title}', '${path}', '-', '', 0, 0, 0, CURRENT_DATE(), 0)`;
        mysql.execute(sql, () => {
            resolve(1);
        });
    });
}

/* ファイルリストを PictureAlbum にインポートする async 関数 */
async function insertFileList(files, album) {
    for (let fn of files) {
        if (os.platform() == "win32") {
            fn = fn.replace(/\\/g, "/");
        }
        fn = fn.trim().replace(/'/g, "''");
        await insertFile(fn, album);
    }
}

/* ファイルリストを PictureAlbum にインポートする。*/
router.get('/import_filelist', (req, res) => {
    let filelist = req.query.filelist;
    let album = req.query.album;
    let files = filelist.split(/\n/g);
    insertFileList(files, album);
    let n = files.length.toString();
    res.send("アルバム " + album + " に " + n + " 個のデータを追加しました。");
});


/* サムネール画像を BINDATA テーブルにインポート(挿入)する。*/
router.get('/ins_bindata', (req, res) => {
    let path = req.query.path;
    if (os.platform() == "win32") {
        path = path.replace(/\\/g, "/");
    }
    path = path.trim().replace(/'/g, "''");
    child_process.exec("InsBINDATA " + path, (error, stdout, stderr) => {
        if (error) {
            res.send("エラーを検出。");
        }
        else {
            res.send("成功 " + path);
        }
    });    
});


/* 画像ファイルからサムネール画像を作成して BINDATA テーブルにインポート(挿入)し、Pictures テーブルの id に関連付ける。*/
router.get('/ins_bindata3', (req, res) => {
    let path = req.query.path;
    if (os.platform() == "win32") {
        path = path.replace(/\\/g, "/");
    }
    path = path.trim().replace(/'/g, "''");
    let id = req.query.id;
    child_process.exec("InsBINDATA3 " + path + " " + id, (error, stdout, stderr) => {
        if (error) {
            res.send("エラーを検出。");
        }
        else {
            res.send("成功 id=" + id + " path = " + path);
        }
    });    
});



/* エクスポート */
module.exports = router;
