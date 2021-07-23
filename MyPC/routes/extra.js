/* extra.js */
'use strict';
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const { LengthRequired } = require('http-errors');
const multer = require('multer');
const upload = multer({ dest: './uploads/' });
const mysql = require('./MySQL.js');
const router = express.Router();
const LIMIT = 200;
const ENDLIMIT = 1000000;

//  /extra は単に「その他」ページを表示するだけ
router.get('/', (req, res) => {
    res.render("extra", {});
});

// BINDATA テーブルの内容
router.get("/bindatalist", async (req, res) => {
    let jumpid = req.query.id;
    let findword = req.query.find;
    let move = req.query.move;
    if (req.query.sortdir) {
        session.bindata_sortdir = req.query.sortdir;
    }
    else {
        if (!session.bindata_sortdir) {
            session.bindata_sortdir = "asc";
        }
    }
    let dirasc = "●";
    let dirdesc = "";
    if (session.bindata_sortdir == "desc") {
        dirasc = "";
        dirdesc = "●";
    }
    if (!session.bindata_start) {
        session.bindata_start = 1;
        session.bindata_end = ENDLIMIT;
    }
    if (jumpid) {
        session.bindata_start = jumpid;
    }
    let sql = await makeSQL(jumpid, findword, move);
    let result = await mysql.query_p(sql);
    session.bindata_end = result[result.length-1].id;
    let message = "";
    if (findword) {
        message = `検索ワード： ${findword}`;
    }
    res.render("bindatalist", {message:message, result:result, dirasc:dirasc, dirdesc:dirdesc});
});

// SQL 文を構築する。
async function makeSQL(jumpid, findword, move) {
    let sql = "SELECT * FROM BINDATA";
    if (jumpid) {
        if (session.bindata_sortdir == "desc") {
            sql += " WHERE id <= " + jumpid + " ORDER BY id DESC LIMIT " + LIMIT;
            session.bindata_start = jumpid;
            session.bindata_end = ENDLIMIT;
        }
        else {
            session.bindata_sortdir = "asc";
            sql += " WHERE id >= " + jumpid + " ORDER BY id ASC LIMIT " + LIMIT;
            session.bindata_start = jumpid;
            session.bindata_end = 1;
        }
        return sql;
    }
    if (findword) {
        sql += ` WHERE INSTR(title, '${findword}') OR INSTR(info, '${findword}')`;
        if (session.bindata_sortdir == "desc") {
            sql += " ORDER BY id DESC LIMIT " + LIMIT;
        }
        else {
            sql += " ORDER BY id ASC LIMIT " + LIMIT;
        }
        return sql;
    }

    let lastid = await getLastId();
    switch (move) {
        case "first":
            if (session.bindata_sortdir == "desc") {
                session.bindata_start = lastid;
                session.bindata_end = 1;
                sql += ` WHERE id >= ${lastid} ORDER BY id DESC LIMIT ${LIMIT}`;
            }
            else {
                session.bindata_sortdir = "asc";
                session.bindata_start = 1;
                session.bindata_end = ENDLIMIT;
                sql += ` WHERE id >= 1 ORDER BY id ASC LIMIT ${LIMIT}`;
            }
            break;
        case "last":
            if (session.bindata_sortdir == "desc") {
                session.bindata_start = 1;
                session.bindata_end = 1;
                sql += ` WHERE id >= 1 ORDER BY id DESC LIMIT ${LIMIT}`;
            }
            else {
                session.bindata_sortdir = "asc";
                session.bindata_start = lastid;
                session.bindata_end = ENDLIMIT;
                sql += ` WHERE id >= ${lastid} ORDER BY id ASC LIMIT ${LIMIT}`;
            }
            break;
        case "prev":
            if (session.bindata_sortdir == "desc") {
                session.bindata_start = await prevId();
                session.bindata_end = 1;
                sql += ` WHERE id <= ${session.bindata_start} ORDER BY id DESC LIMIT ${LIMIT}`;
            }
            else {
                session.bindata_end = session.bindata_start;
                session.bindata_start = await prevId();
                sql += ` WHERE id >= ${session.bindata_start} ORDER BY id ASC LIMIT ${LIMIT}`;
            }
            break;
        case "next":
            session.bindata_start = session.bindata_end;
            session.bindata_end = await nextId();
            if (session.bindata_sortdir == "desc") {
                sql += ` WHERE id <= ${session.bindata_start} ORDER BY id DESC LIMIT ${LIMIT}`;
            }
            else {
                sql += ` WHERE id >= ${session.bindata_start} ORDER BY id ASC LIMIT ${LIMIT}`;
            }
            break;
        default:
            if (session.bindata_sortdir == "desc") {
                sql += ` ORDER BY id DESC LIMIT ${LIMIT}`;
            }
            else {
                sql += ` ORDER BY id ASC LIMIT ${LIMIT}`;
            }
            break;
    }
    console.log(sql);
    return sql;
}

// 最後の id を得る。
async function getLastId() {
    let id = await mysql.getValue_p("SELECT MAX(id) FROM BINDATA");
    return id;
}

// 次の id を得る。
async function nextId() {
    let nlast;
    if (session.bindata_sortdir == "desc") {
        let rows = await mysql.query_p(`SELECT id FROM BINDATA WHERE id <= ${session.bindata_end} ORDER BY id DESC`);
        nlast = rows.length - 1;
        if (rows.length < LIMIT) {
            return rows[nlast].id;
        }
        else {
            return rows[LIMIT - 1].id;
        }
    }
    else {  // asc
        let rows = await mysql.query_p(`SELECT id FROM BINDATA WHERE id >= ${session.bindata_start} ORDER BY id ASC`);
        nlast = rows.length - 1;
        if (rows.length < LIMIT) {
            return rows[nlast].id;
        }
        else {
            return rows[LIMIT - 1].id;
        }
    }
}

// 前の id を得る。
async function prevId() {
    if (session.bindata_sortdir == "desc") {
        let rows = await mysql.query_p(`SELECT id FROM BINDATA WHERE id >= ${session.bindata_start} ORDER BY id DESC`);
        if (rows.length < LIMIT) {
            return rows[rows.length - 1].id;
        }
        else {
            return rows[LIMIT - 1].id;
        }
    }
    else {  // asc
        let rows = await mysql.query_p(`SELECT id FROM BINDATA WHERE id <= ${session.bindata_start} ORDER BY id ASC`);
        if (rows.length > LIMIT) {
            let n;
            for (let i = 0; i < LIMIT; i++) {
                n = rows[rows.length - i - 1].id;
            }
            return n;
        }
        else {
            return rows[0].id;
        }
    }
}

// BINDATA テーブルのデータ追加・更新 (GET)
router.get("/bindataForm", (req, res) => {
    let value = {
        id:"",
        title:"",
        original:"",
        datatype:"",
        info:""
    };
    res.render("bindataForm", {message:"", value:value});
});

// BINDATA テーブルのデータ追加・更新 (POST)
router.post("/bindataForm", upload.single('dataFileClient'), async (req, res) => {
    let value = {
        id: req.body.id,
        title: req.body.title.replace(/'/g, "''"),
        datatype: req.body.datatype,
        original: req.body.original.replace(/\\/g, "/"),
        info: req.body.info.replace(/'/g, "''"),
        dataFileServer: req.body.dataFileServer.replace(/\\/g, "/")
    };
    let dataFileClient = null;
    if (req.file) {
        dataFileClient = req.file.path.replace(/\\/g, "/");
    }

    // 挿入時のみオリジナルファイルを決める。
    let original = "";
    if (dataFileClient) {
        original = req.file.originalname;  // アップロードされた画像ファイルを使うとき
    }
    else if (value.dataFileServer) {
        original = value.dataFileServer;  // サーバ側の画像ファイルを使うとき
    }
    else {
        original = null;  // 画像データが変更ないとき
    }
    // バイナリーデータを作成
    let data = null;
    let size = 0;
    if (dataFileClient) {
        [data, size] = makeBinData(dataFileClient);  // アップロードしたファイルデータを使用
    }
    else if (original) {
        [data, size] = makeBinData(original);  // サーバ側のファイルデータを使用
    }
    else {
        // 画像データの更新をしない。（INSERTの場合は致命的エラー)
        if (!value.id) {
            res.render("bindataForm", {message:"新規追加するためのデータがありません。", value:value});
            return;
        }
    }
    let sql = "";
    let message = "";
    if (value.id) {
        // 更新
        if (original) {
            sql = `UPDATE BINDATA SET title='${value.title}', datatype='${value.datatype}', info='${value.info}', original='${original}', data=${data}, size=${size} WHERE id=${value.id}`;
        }
        else {
            sql = `UPDATE BINDATA SET title='${value.title}', datatype='${value.datatype}', original='${value.original}', info='${value.info}' WHERE id=${value.id}`;
        }
    }
    else {
        // 挿入
        sql = `INSERT INTO BINDATA(id, title, original, datatype, data, info, size, date) VALUES(NULL, '${value.title}', '${original}', '${value.datatype}', ${data}, '${value.info}', ${size}, CURRENT_DATE())`;
    }
    mysql.execute(sql, (err) => {
        if (err) {
            message = err.message;
            res.render("bindataForm", {message:message, value:value});
        }
        else if (value.id) {
            message = value.title + " が更新されました。";
            res.render("bindataForm", {message:message, value:value});
        }
        else {
            mysql.getValue("SELECT MAX(id) FROM BINDATA", (n) => {
                if (n) {
                    message = `(id${n}) ${value.title} が新規追加されました。`;
                }
                else {
                    message = "エラーを検出。";
                }
                res.render("bindataForm", {message:message, value:value});
            });
        }
    });
});

// バイナリーデータを作成
function makeBinData(fileName) {
    let hex = "0x";
    let buffer = fs.readFileSync(fileName);
    let size = fs.statSync(fileName).size;
    let view = new Uint8Array(buffer);
    view.forEach((currentValue, index, array) => {
        let shex = currentValue.toString(16);
        hex += (currentValue < 16 ? "0" +  shex : shex);
    });
    return [hex, size];
}

// データ確認
router.get("/confirmBINDATA/:id", (req, res) => {
    let id = req.params.id;
    let value = {
        id:id,
        title:"",
        original:"",
        datatype:"",
        info:""
    };
    mysql.getRow("SELECT * FROM BINDATA WHERE id=" + id, (err, row) => {
        if (err) {
            res.render("bindataForm", {message:err.message, value:value});
        }
        else {
            res.render("bindataForm", {message:"id:" + row.id + " が検索されました。", value:{id:row.id, title:row.title, datatype:row.datatype, original:row.original, info:row.info}});
        }
    });
});

// BINDATA テーブルの逆引き (GET)
router.get("/bindataQuery", (req, res) => {
    let value = {
        id: "",
        tableName: ""
    };
    res.render("bindataQuery", {message:"", value:value});
});

// BINDATA テーブルの逆引き (POST)
router.post("/bindataQuery", (req, res) => {
    let id = req.body.id;
    let tableName = req.body.tableName;
    let value = {
        id:id
    };
    let message = "";
    mysql.getRow(`SELECT * FROM ${tableName} WHERE bindata = ${id}`, (err, row) => {
        if (err) {
            message = err.message;
        }
        else {
            if (row) {
                message = `${tableName} の対応する id は ${row.id} です。`;
            }
            else {
                message = "対応する id が見つかりません。";
            }
        }
        res.render("bindataQuery", {message:message, value:value});
    });
});

// バックアップテーブルを作るフォーム
router.get("/newBackup", (req, res) => {
    // バックアップテーブルのリストを得る。
    let result = [];
    mysql.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='user' AND TABLE_NAME REGEXP '.+BAK.*'", (row) => {
        if (row) {
            result.push(row.TABLE_NAME);
        }
        else {
            res.render("newBackup", {"message":"", "result":result});
        }
    });
});

// バックアップテーブルを作るサービス
router.get("/createBackupTables", async (req, res) => {
    let age = req.query.age;
    try {
        createTable("Album", age);
        createTable("Pictures", age);
        createTable("Videos", age);
        createTable("Music", age);
        createTable("Projects", age);
        createTable("Documents", age);
        createTable("BINDATA", age);  
        createTable("Playlists", age);  
        res.send("OK: バックアップテーブルを作成しました。");
    }
    catch (err) {
        res.send(err.message);
    }
});

async function createTable(tableName, age) {
    let backTableName = tableName + "Bak" + age;
    let sql = `CREATE TABLE ${backTableName} SELECT * FROM ${tableName}`;
    await mysql.execute_p(sql);
}

// 古いバックアップテーブルを削除するフォーム
router.get("/removeBackup", (req, res) => {
    let result = [];
    mysql.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='user' AND TABLE_NAME REGEXP '.+BAK.*'", (row) => {
        if (row) {
            result.push(row.TABLE_NAME);
        }
        else {
            res.render("removeBackup", {"message":"削除したテーブルの復活はできないので十分注意してください。", "result":result});
        }
    });
});

// 古いバックアップテーブルを削除するサービス
router.post("/removeBackupTables", async (req, res) => {
    let tables = req.body;
    try {
        for (let tableName of tables) {
            await mysql.execute_p(`DROP TABLE ${tableName}`);
        }
        res.send("OK: 指定したテーブルを削除しました。");    
    }
    catch (err) {
        res.send(err.message);
    }
});


// エクスポート
module.exports = router;