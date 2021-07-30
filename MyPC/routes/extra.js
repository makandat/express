/* extra.js */
'use strict';
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const fso = require('./FileSystem.js');
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

// 一括データ挿入
router.get("/bulkInsert", async (req, res) => {
    let folder = req.query.folder.replace(/\\/g, "/");
    let bulkTable = req.query.bulkTable;
    let sql;
    switch (bulkTable) {
        case "Pictures": {
            sql = "INSERT INTO Pictures(id, album, title, creator, path, media, mark, info, `count`, fav, bindata, `date`, sn) VALUES";
            let dirs = await fso.getDirectories_p(folder);
            for (let dir of dirs) {
                let dirs2 = await fso.getDirectories_p(dir);
                for (let dir2 of dirs2) {
                    dir2 = dir2.replace(/\\/g, "/");
                    let parts = dir2.split("/");
                    let title = parts[parts.length - 1];
                    let creator = parts[parts.length - 2].slice(0, 49);
                    let path = dir2.replace(/'/g, "''");
                    sql += `(NULL, 0, '${title}', '${creator}', '${path}', 'MEDIA', 'MARK', '', 0, 0, 0, CURRENT_DATE(), 0),`;
                }
            }
            sql = sql.substring(0, sql.length - 1);
            mysql.execute(sql, (err) => {
                if (err) {
                    res.send(err.message);
                }
                else {
                    res.send("Pictures テーブルへのデータ追加が完了しました。(" + folder + ")");
                }
            });
        }
        break;
        case "Videos": {
            let files = await readdirRecursively(folder);
            if (!files) {
                res.send("ファイルが見つかりません。");
                return;
            }
            sql = "INSERT INTO Videos(id, album, title, path, media, series, mark, info, `count`, fav, bindata, `date`, sn) VALUES";
            for (let p of files) {
                let ext = fso.getExtension(p);
                if (ext == '.mp4' || ext == '.mkv' || ext == '.avi' || ext == '.mov' || ext == '.mpg') {
                    let fileName = fso.getFileName(p);
                    let title = fileName.split(".")[0];
                    let path = p.replace(/\\/g, "/").replace(/'/g, "''");
                    let parts = path.split("/");
                    let series = parts[parts.length - 2];
                    sql += `(NULL, 0, '${title}', '${path}', 'MEDIA', '${series}', 'MARK', '', 0, 0, 0, CURRENT_DATE, 0),`;
                }
            }
            sql = sql.substring(0, sql.length - 1);
            mysql.execute(sql, (err) => {
                if (err) {
                    res.send(err.message);
                }
                else {
                    res.send("Videos テーブルへのデータ追加が完了しました。(" + folder + ")");
                }
            });
        }
        break;
        case "Music": {
            let files = await readdirRecursively(folder);
            if (!files) {
                res.send("ファイルが見つかりません。");
                return;
            }
            sql = "INSERT INTO Music(id, album, title, path, artist, media, mark, info, fav, `count`, bindata, `date`, sn) VALUES";
            for (let p of files) {
                let ext = fso.getExtension(p);
                if (ext == '.mp3' || ext == '.m4a' || ext == '.flac') {
                    let fileName = fso.getFileName(p);
                    let title = fileName.split(".")[0].slice(0, 99);
                    let path = p.replace(/\\/g, "/").replace(/'/g, "''");
                    let parts = path.split("/");
                    let artist = parts[parts.length - 2].slice(0, 49);
                    sql += `(NULL, 0, '${title}', '${path}', '${artist}', 'MEDIA', 'MARK', '', 0, 0, 0, CURRENT_DATE(), 0),`;
                }
            }
            sql = sql.substring(0, sql.length - 1);
            mysql.execute(sql, (err) => {
                if (err) {
                    res.send(err.message);
                }
                else {
                    res.send("Music テーブルへのデータ追加が完了しました。(" + folder + ")");
                }
            });
        }
        break;
        default:
            break;
    }
});

// 再帰的にディレクトリをスキャンする。
async function readdirRecursively(dir, files=[]) {
    let dirents = await fs.promises.readdir(dir, {encoding: 'utf8', withFileTypes: true});
    let dirs = [];
    for (let dirent of dirents) {
        if (dirent.isDirectory()) {
            dirs.push(`${dir}/${dirent.name}`);
        }
        if (dirent.isFile()) {
            files.push(`${dir}/${dirent.name}`);
        }
    }
    for (let d of dirs) {
        files = await readdirRecursively(d, files);
    }
    return Promise.resolve(files);    
}

// 一括データチェック
router.get("/bulkCheck", async (req, res) => {
    let folder = req.query.folder;
    let bulkTable = req.query.bulkTable;
    let nopath = [];
    switch (bulkTable) {
        case "Pictures": {
            let dirs = await fso.getDirectories_p(folder);
            for (let dir of dirs) {
                let dirs2 = await fso.getDirectories_p(dir);
                for (let dir2 of dirs2) {
                    dir2 = dir2.replace(/\\/g, "/").replace(/'/g, "''");
                    let sql = `SELECT COUNT(id) FROM ${bulkTable} WHERE path='${dir2}'`;
                    let n = await mysql.getValue_p(sql);
                    if (n == 0) {
                        nopath.push(dir2);
                    }    
                }
            }
            res.json(nopath);
        }
        break;
        case "Music": {
            let files = await readdirRecursively(folder);
            let sql = "";
            for (let p of files) {
                let ext = fso.getExtension(p);
                if (!(ext == ".mp3" || ext == ".m4a" || ext == ".flac")) {
                    continue;
                }
                let p1 = p.replace(/\\/g, "/").replace(/'/g, "''");
                sql = `SELECT COUNT(id) FROM Music WHERE path = '${p1}'`;
                let n = await mysql.getValue_p(sql);
                if (n == 0) {
                    nopath.push(p);
                }
            }
            res.json(nopath);
        }
        break;
        case "Videos": {
            let files = await readdirRecursively(folder);
            let sql = "";
            for (let p of files) {
                let ext = fso.getExtension(p);
                if (!(ext == ".mp4" || ext == ".avi" || ext == ".mov" || ext == ".mkv" || ext == ".mpg")) {
                    continue;
                }
                let p1 = p.replace(/\\/g, "/").replace(/'/g, "''");
                sql = `SELECT COUNT(id) FROM Videos WHERE path = '${p1}'`;
                let n = await mysql.getValue_p(sql);
                if (n == 0) {
                    nopath.push(p);
                }
            }
            res.json(nopath);
        }
        break;
        default:
            break;
    }
});

// マーク一覧 (Marks)
router.get("/marksTable", (req, res) => {
    let result = [];
    let sql = "SELECT id, mark, tablename, info, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Marks";
    let tablename = req.query.table;
    if (tablename) {
        if (tablename == "1") {
            // すべて
            tablename = "";
        }
        else {
            // 指定されたテーブルのみ
            sql += ` WHERE tablename='${tablename}'`;
        }
    }
    sql += " ORDER BY tablename";
    mysql.query(sql, (row) => {
        if (row) {
            result.push(row);
        }
        else {
            res.render("marksTable", {message:"テーブル指定：" + tablename, result:result});
        }
    });
});

// マークの追加・修正フォーム (GET)
router.get("/marksForm", (req, res) => {
    let value = {
        id:null,
        mark:"",
        tablename:"",
        info:""
    };
    if (req.query.id) {
        let sql = "SELECT id, mark, tablename, info, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Marks WHERE id=" + req.query.id;
        mysql.getRow(sql, (err, row) => {
            if (err) {
                res.render("marksForm", {message:err.message, value:value});
            }
            else {
                value.id = req.query.id;
                value.mark = row.mark;
                value.tablename = row.tablename;
                value.info = row.info;
                value.date = row.date;
                res.render("marksForm", {message:"", value:value});
            }
        });
    }
});

// マークの追加・修正フォーム (GET)
router.post("/marksForm", (req, res) => {
    let id = req.body.id;
    let value = {
        id: id ? id: "",
        mark: req.body.mark ? req.body.mark : "",
        tablename: req.body.tablename ? req.body.tablename : "",
        info: req.body.info ? req.body.info : ""
    };

    let sql = null;
    let message = "";
    if (id) {
        // 更新
        sql = `UPDATE Marks SET mark='${value.mark}', tablename='${value.tablename}', info='${value.info}' WHERE id = ${id}`;
        message = "id:" + id + " が更新されました。";
    }
    else {
        // 挿入
        sql = `INSERT INTO Marks VALUES(NULL, '${value.mark}', '${value.tablename}', '${value.info}', CURRENT_DATE())`;
        message = "mark:" + value.mark + " が追加されました。";
    }
    mysql.execute(sql, (err) => {
        if (err) {
            res.render("marksForm", {message:err.message, value:value});
        }
        else {
            res.render("marksForm", {message:message, value:value});
        }
    });
});

// テーブルに登録された path の存在チェック
router.get('/checkPathTable', (req, res) => {
    let tablename = req.query.tablename;
    let idFrom = req.query.idFrom ? req.query.idFrom : 0;
    let idTo = req.query.idTo ? req.query.idTo : 10000000;
    let sql = `SELECT * FROM ${tablename} WHERE id BETWEEN ${idFrom} AND ${idTo}`;
    let result = [];
    mysql.query(sql, (row) => {
        if (row) {
            if (!fso.exists(row.path)) {
                result.push(row.path);
            }
        }
        else {
            res.json(result);
        }
    });
});

// ファイルリストからの一括登録
router.post('/insertFileList', (req, res) => {
    let tableName = req.body.tableName;
    let fileList = req.body.fileList;
    let mark = req.body.mark ? req.body.mark : "MARK";
    let sql = "INSERT INTO ";
    switch (tableName) {
        case "Pictures":
            sql += "Pictures(id, album, title, creator, path, media, mark, info, `count`, fav, bindata, `date`, sn) VALUES";
            break;
        case "Videos":
            sql += "Videos(id, album, title, path, media, series, mark, info, fav, `count`, bindata, `date`, sn) VALUES";
            break;
        case "Music":
            sql += "Music(id, album, title, path, artist, media, mark, info, fav, `count`, bindata, `date`, sn) VALUES";
            break;
        default:
            break;
    }
    let files = fileList.split(/\n/g);
    for (let path of files) {
        path = path.trim().replace(/\\/g, "/").replace(/'/g, "''");
        let title = fso.getFileName(path).split(".")[0];
        switch (tableName) {
            case "Pictures":
                sql += `(NULL, 0, '${title}', 'CREATOR', '${path}', 'MEDIA', '${mark}', '', 0, 0, 0, CURRENT_DATE(), 0), `;
                break;
            case "Videos":
                sql += `(NULL, 0, '${title}', '${path}', 'MEDIA', 'SERIES', '${mark}', '', 0, 0, 0, CURRENT_DATE, 0), `;
                break;
            case "Music":
                sql += `(NULL, 0, '${title}', '${path}', 'ARTIST', 'MEDIA', '${mark}', '', 0, 0, 0, CURRENT_DATE, 0), `;
                break;
            default:
                break;
        }
    }
    sql = sql.substring(0, sql.length - 2);
    mysql.execute(sql, (err) => {
        if (err) {
            res.json(err.message);
        }
        else {
            res.json(tableName + "," + mark);
        }
    });
});

// テーブルレコードの一括削除
router.get("/deleteBatch", async (req, res) => {
    let confirm = req.query.confirm;
    let tableName = req.query.table;
    let idFrom = req.query.idFrom;
    let idTo = req.query.idTo;
    
    if (confirm) {
        let sql = `SELECT title FROM ${tableName} WHERE id=${idFrom}`;
        let title = await mysql.getValue_p(sql);
        sql = `SELECT COUNT(id) FROM ${tableName} WHERE id BETWEEN ${idFrom} AND ${idTo}`;
        let n = await mysql.getValue_p(sql);
        if (title) {
            let msg = `"${title}" から ${n} 件のデータが削除されます。`;
            res.send(msg);            
        }
        else {
            res.send("${n} 件のデータが削除されます。");            
        }
    }
    else {
        let sql = `DELETE FROM ${tableName} WHERE id BETWEEN ${idFrom} AND ${idTo}`;
        mysql.execute(sql, (err) => {
            if (err) {
                res.send("エラー：" + err.message);
            }
            else {
                res.send(`テーブル ${tableName} の id ${idFrom} から ${idTo} までのデータが削除されました。`);
            }
        });
    }
});


// 管理テーブルのレコードのパス (path) の一括変更
router.get("/replacePathBatch", async (req, res) => {
    let confirm = req.query.confirm;
    let tableName = req.query.table;
    let before = req.query.before.replace(/\\/g, "/").replace(/'/g, "''");
    let after = req.query.after.replace(/\\/g, "/").replace(/'/g, "''");

    if (confirm) {
        let sql = `SELECT COUNT(id) FROM ${tableName} WHERE INSTR(path, '${before}')`;
        let n = await mysql.getValue_p(sql);
        let msg = `テーブル ${tableName} の path が ${n} 件更新されます。`;
        res.send(msg);
    }
    else {
        let sql = `UPDATE ${tableName} SET path = REPLACE(path, '${before}', '${after}')`;
        mysql.execute(sql, (err) => {
            if (err) {
                res.send("エラー：" + err.message);
            }
            else {
                let msg = `テーブル ${tableName} の path が更新されました。`;
                res.send(msg);
            }
        });
    }
});

// エクスポート
module.exports = router;
