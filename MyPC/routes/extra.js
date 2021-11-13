/* extra.js */
'use strict';
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const fso = require('./FileSystem.js');
const readline = require('readline');
const multer = require('multer');
const upload = multer({ dest: './uploads/' });
const mysql = require('./MySQL.js');
const log4js = require('log4js');
const {exec} = require("child_process");
const aws = require('aws-sdk');
const router = express.Router();
const LIMIT = 1000;

// Log4JS 初期化 (ログファイル ./tmp/mypc.log)
const logger = log4js.getLogger();
logger.level = 'debug';
let logfile = fso.getDirectory(__dirname) + "/tmp/mypc.log";
log4js.configure({
    appenders : {
        system : {type : "file", filename : logfile}
    },
    categories : {
        default : {appenders : ["system"], level : "debug"}
    }
});

//  /extra は単に「その他」ページを表示するだけ
router.get('/', (req, res) => {
    logger.debug("extra.get(\"/\")");
    res.render("extra", {});
});

// アメリカ式の日付 (ex. Fri Aug 13 2021) を日本式 (2021-08-13) に変換する。
function convertDateFormat(us) {
    if (/GMT\+\d\d\d\d/.test(us)) {
        let parts = us.toString().split(' ');
        let jp = parts[3] + "-";
        let map = {
            "Jan":"01", "Feb":"02", "Mar":"03", "Apr":"04", "May":"05", "Jun":"06", "Jul":"07", "Aug":"08", "Sep":"09", "Oct":"10", "Nov":"11", "Dec":"12"
        }
        jp += map[parts[1]] + "-";
        jp += parts[2];
        return jp;
    }
    else {
        return us;
    }
}

// BINDATA テーブルの内容
router.get("/bindatalist", async (req, res) => {
    let jumpid = req.query.id;
    let findword = req.query.find;
    let move = req.query.move;

    if (req.query.reset) {
        session.bindata_sortdir = "asc";
        session.bindata_start = 1;
        session.bindata_end = ENDLIMIT;
        session.bindata_view = "detail";
    }
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
    if (req.query.view) {
        session.bindata_view = req.query.view;
    }
    else if (session.bindata_view) {
        // 何もしない
    }
    else {
        session.bindata_view = "detail";
    }

    // クエリー
    let sql = await makeSQL(jumpid, findword, move);
    let result = await mysql.query_p(sql);
    session.bindata_end = result[result.length-1].id;
    let message = "";
    if (findword) {
        message = `検索ワード： ${findword}`;
    }
    res.render("bindatalist", {message:message, result:result, dirasc:dirasc, dirdesc:dirdesc, view:session.bindata_view});
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
        datatype:".jpg",
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
        if (fso.exists(value.dataFileServer)) {
            original = value.dataFileServer;  // サーバ側の画像ファイルを使うとき
        }
        else {
            res.render("showInfo", {title:"エラー", message:"存在しないパスが指定されました。", icon:"cancel.png"});
            return;
        }
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

// BINDATA バイナリーデータを作成
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

// BINDATA データ確認
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

// バックアップテーブルを作る。
async function createTable(tableName, age) {
    let backTableName = tableName + "Bak" + age;
    let sql = `CREATE TABLE ${backTableName} SELECT * FROM ${tableName}`;
    await mysql.execute_p(sql);
}

// 古いバックアップテーブルを削除するフォーム
router.get("/removeBackup", (req, res) => {
    let result = [];
    let sql = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='user' AND TABLE_NAME REGEXP '.+BAK.*'";
    mysql.query(sql, (row) => {
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
            let sql = `DROP TABLE ${tableName}`;
            await mysql.execute_p(sql);
        }
        res.send("OK: 指定したテーブルを削除しました。");
    }
    catch (err) {
        res.send(err.message);
    }
});

// エクスポートとインポート (GET)
router.get("/exportImportTable", (req, res) => {
    res.render("exportImportTable", {});
});

// エクスポートとインポート (POST)
router.post("/exportImportTable", (req, res) => {
    let fileName = req.body.fileName.replace(/\\/g, "/");
    let tableName = req.body.tableName;
    if (req.body.operation == "export") {
        // エクスポート
        let writer = fs.createWriteStream(fileName);
        writer.on("error", err => {
            res.send("エラー： " + err.message);
        });
        mysql.query("SELECT * FROM " + tableName, (row, fields) => {
            if (row) {
                let line = "";
                for (let fn of fields) {
                    line += convertDateFormat(row[fn.name]) + "\t";
                }
                line = line.substring(0, line.length - 1) + "\n";
                writer.write(line);
            }
            else {
                writer.close();
                res.send(`テーブル ${tableName} をファイル ${fileName} へエクスポートしました。`);
            }
        });
    }
    else {
        // インポート
        /* let reader = fs.createReadStream(fileName);
        let rdif = readline.createInterface({input:reader});
        rdif.on('line', (line) => {
            let parts = line.split(/\t/g);
            switch (tableName.toLowerCase()) {
                case "album":
                    break;
                case "pictures":
                    break;
                case "videos":
                    break;
                case "music":
                    break;
                case "playlists":
                    break;
                case "projects":
                    break;
                case "documents":
                    break;
                default: // marks
                    break;
            }
        });
        rdif.on('close', () => {
            res.send(`ファイル ${fileName} をテーブル ${tableName} へインポートしました。`);
        });     */

        let sql = `LOAD DATA LOCAL INFILE '${fileName}' INTO TABLE ${tableName} FIELDS TERMINATED BY '\t'`;
        mysql.execute("TRUNCATE TABLE " + tableName, err => {
            if (err) {
                res.send("エラー：" + err.message);
            }
            else {
                mysql.execute(sql, err => {
                    if (err) {
                        res.send("エラー：" + err.message);
                    }
                    else {
                        res.send(`ファイル '${fileName}' の内容をテーブル '${tableName}' にインポートしました。`);
                    }
                });
            }
        });
    }
});

// 一括データ挿入
router.post("/bulkInsert", async (req, res) => {
    let folder = req.body.folder.replace(/\\/g, "/");
    let tableName = req.body.tableName;
    let media = req.body.media;
    let mark = req.body.mark;
    let sql;
    switch (tableName) {
        case "Pictures": {
            sql = "INSERT INTO Pictures(id, album, title, creator, path, media, mark, info, `count`, fav, bindata, `date`, sn) VALUES";
            let dirs = await fso.getDirectories_p(folder);
            if (dirs.length == 0)  {
                res.send("フォルダの位置が間違っています。");
                return;
            }
            for (let dir of dirs) {
                let dirs2 = await fso.getDirectories_p(dir);
                for (let dir2 of dirs2) {
                    dir2 = dir2.replace(/\\/g, "/");
                    let parts = dir2.split("/");
                    let title = parts[parts.length - 1].replace(/'/g, "''");
                    let creator = parts[parts.length - 2].slice(0, 49).replace(/'/g, "''");
                    let path = dir2.replace(/'/g, "''");
                    sql += `(NULL, 0, '${title}', '${creator}', '${path}', '${media}', '${mark}', '', 0, 0, 0, CURRENT_DATE(), 0),`;
                }
            }
            sql = sql.substring(0, sql.length - 1);
            logger.debug("一括データ挿入 Pictures: " + sql);
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
                if (ext == '.mp4' || ext == '.mkv' || ext == '.avi' || ext == '.wmv' || ext == '.mov' || ext == '.mpg') {
                    let fileName = fso.getFileName(p);
                    let title = fileName.split(".")[0].replace(/'/g, "''");
                    let path = p.replace(/\\/g, "/").replace(/'/g, "''");
                    let parts = path.split("/");
                    let series = parts[parts.length - 2];
                    sql += `(NULL, 0, '${title}', '${path}', '${media}', '${series}', '${mark}', '', 0, 0, 0, CURRENT_DATE, 0),`;
                }
            }
            sql = sql.substring(0, sql.length - 1);
            logger.debug("一括データ挿入 Videos: " + sql);
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
                if (ext == '.mp3' || ext == '.m4a' || ext == '.ogg' || ext == '.flac' || ext == 'wma') {
                    let fileName = fso.getFileName(p);
                    let title = fileName.split(".")[0].slice(0, 99).replace(/'/g, "''");
                    let path = p.replace(/\\/g, "/").replace(/'/g, "''");
                    let parts = path.split("/");
                    let artist = parts[parts.length - 2].slice(0, 49);
                    sql += `(NULL, 0, '${title}', '${path}', '${artist}', '${media}', '${mark}', '', 0, 0, 0, CURRENT_DATE(), 0),`;
                }
            }
            sql = sql.substring(0, sql.length - 1);
            logger.debug("一括データ挿入 Music: " + sql);
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

// テーブルと id を指定してタイトルとパスを得る。
router.get("/getTitle", (req, res) => {
    let table = req.query.table;
    let id = req.query.id;
    let sql = `SELECT title, path FROM ${table} WHERE id=${id}`;
    mysql.getRow(sql, (err, row) => {
        if (err) {
            res.json({"title":"", "path":""});
        }
        else {
            res.json({"title":row.title, "path":row.path});
        }
    });
});

// 一括データチェック
router.get("/bulkCheck", async (req, res) => {
    let folder = req.query.folder;
    if (!fso.exists(folder)) {
        res.json(["フォルダが見つかりません。"]);
        return;
    }
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
                if (!(ext == ".mp4" || ext == '.ogv' || ext == '.webm' || ext == ".avi" || ext == ".mov" || ext == ".mkv" || ext == ".mpg")) {
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
            if (!tablename) {
                tablename = "すべて";
            }
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
                res.render("sowInfo", {message:err.message, title:"エラー", icon:"cancel.png"});
            }
            else {
                value.id = req.query.id;
                value.mark = row.mark;
                value.tablename = row.tablename;
                value.info = row.info;
                value.date = row.date;
                // マーク一覧
                let sql = "SELECT DISTINCT mark, 'Pictures' AS tableName FROM Pictures UNION SELECT DISTINCT mark, 'Videos' AS tableName FROM Videos UNION SELECT DISTINCT mark, 'Music' AS tableName FROM Music UNION SELECT DISTINCT mark, 'Projects' AS tableName FROM Projects UNION SELECT DISTINCT mark, 'Documents' AS tableName FROM Documents";
                let marks = [];
                mysql.query(sql, (row) => {
                    if (row) {
                        marks.push(row);
                    }
                    else {
                        res.render("marksForm", {message:"", value:value, marks:marks});
                    }
                });
            }
        });
    }
    else {
        // マーク一覧
        let sql = "SELECT DISTINCT mark, 'Pictures' AS tableName FROM Pictures UNION SELECT DISTINCT mark, 'Videos' AS tableName FROM Videos UNION SELECT DISTINCT mark, 'Music' AS tableName FROM Music UNION SELECT DISTINCT mark, 'Projects' AS tableName FROM Projects UNION SELECT DISTINCT mark, 'Documents' AS tableName FROM Documents";
        let marks = [];
        mysql.query(sql, (row) => {
            if (row) {
                marks.push(row);
            }
            else {
                res.render("marksForm", {message:"", value:value, marks:marks});
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
    if (value.tablename == "") {
        res.render("showInfo", {title:"エラー", message:"テーブルが指定されていません。", icon:"cancel.png"});
        return;
    }
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
            res.render("showInfo", {message:err.message, title:"エラー", icon:"cancel.png"});
        }
        else {
            let sql = "SELECT DISTINCT mark, 'Pictures' AS tableName FROM Pictures UNION SELECT DISTINCT mark, 'Videos' AS tableName FROM Videos UNION SELECT DISTINCT mark, 'Music' AS tableName FROM Music UNION SELECT DISTINCT mark, 'Projects' AS tableName FROM Projects UNION SELECT DISTINCT mark, 'Documents' AS tableName FROM Documents";
            let marks = [];
            mysql.query(sql, (row) => {
                if (row) {
                    marks.push(row);
                }
                else {
                    res.render("marksForm", {message:message, value:value, marks:marks});
                }
            });
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
        if (fso.exists(path)) {
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
    }
    sql = sql.substring(0, sql.length - 2);
    logger.debug("ファイルリストからの一括登録: " + sql);
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
        logger.debug("テーブルレコードの一括削除: " + sql);
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
        logger.debug("レコードのパス (path) の一括変更: " + sql);
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

// タイトルの一括変更
router.post("/replaceTitles", (req, res) => {
    let tableName = req.body.tableName;
    let fromid = req.body.fromid;
    let toid = req.body.toid;
    let before = req.body.before;
    let after = req.body.after;
    let sql = `UPDATE ${tableName} SET title = REPLACE(title, '${before}', '${after}') WHERE id BETWEEN ${fromid} AND ${toid}`;
    logger.debug("タイトルの一括変更: " + sql);
    mysql.execute(sql, (err) => {
        if (err) {
            res.send(err.message);
        }
        else {
            res.send(`OK: ${tableName} のタイトルの一部が "${before}" から "${after} に置換されました。`);
        }
    });
});

// Marks テーブルへの一括登録
router.get("/marksInsert", async (req, res) => {
    try {
        let sql = "SELECT DISTINCT mark, 'Pictures' AS tableName FROM Pictures UNION SELECT DISTINCT mark, 'Videos' AS tableName FROM Videos UNION SELECT DISTINCT mark, 'Music' AS tableName FROM Music UNION SELECT DISTINCT mark, 'Projects' AS tableName FROM Projects UNION SELECT DISTINCT mark, 'Documents' AS tableName FROM Documents";
        let rows = await mysql.query_p(sql);
        for (let a of rows) {
            let sql2 = `REPLACE INTO Marks VALUES(NULL, '${a.mark}', '${a.tableName}', '', CURRENT_DATE())`;
            await mysql.execute_p(sql2);
        }
        res.send("OK: 一括登録が終了しました。");
    }
    catch (err) {
        res.send(err.message);
    }
});

// MySQL: コマンド実行 (GET)
router.get("/mysqlExecCommand", (req, res) => {
    res.render("mysqlExecCommand", {history:[], command:"", message:""});
});

// MySQL: コマンド実行 (POST)
router.post("/mysqlExecCommand", (req, res) => {
    let command = req.body.command;
    let text = command + "\n" + "OK\n";
    let result = [];
    let fields = [];
    if (command.toLowerCase().startsWith('select')) {
        mysql.query(command, (row, fld) => {
            if (row) {
                result.push(row);
                fields = fld;
            }
            else {
                res.json({text:text, result:result, fields:fields});
            }
        });
    }
    else {
        mysql.execute(command, (err) => {
            if (err) {
                res.json({text:err.message, result:result, fields:fields});
            }
            else {
                res.json({text:text, result:result, fields:fields});
            }
        });
    }
});

/* "mysql.json" から接続情報を読み取る。(ヘルパ関数) */
const getConf = () => {
    let confstr = fs.readFileSync("mysql.json", "utf-8");
    let conf = JSON.parse(confstr);
    return conf;
}

// MySQL: ファイル実行 (GET)
router.get("/mysqlExecFile", (req, res) => {
    res.render("mysqlExecFile", {});
});

// MySQL: ファイル実行 (POST)
router.post("/mysqlExecFile", (req, res) => {
    let path = req.body.path.replace(/\\/g, "/");
    let data = {
        text: "",
        error: ""
    };
    let conf = getConf();
    let param = "-h localhost -u " + conf.user + " --password=" + conf.password + " -D " + conf.database + " -e \"source " + path + "\"";
    exec("mysql " + param, (err, stdout, stderr) => {
        if (err) {
            res.json({text:"Error", error:err.message});
        }
        else {
            res.json({text:stdout, error:stderr});
        }
    });
});

// ファイル保存
router.post("/saveFile", (req, res) => {
    let path = req.body.path;
    let fileContent = req.body.fileContent;
    fs.writeFile(path, fileContent, (err) =>{
        if (err) {
            res.send(err.message);
        }
        else {
            let fileName = fso.getFile(path);
            res.send(fileName + " へのファイル保存が完了しました。");
        }
    });
});

// MySQL: 情報表示 (GET)
router.get("/mysqlMetaInfo", (req, res) => {
    res.render("mysqlMetaInfo", {});
});

// MySQL: 情報表示 (POST)
router.post("/mysqlMetaInfo", (req, res) => {
    let page = req.body.page ? req.body.page : "databases";
    let result = [];
    let fields = [];
    let sql = "";
    switch (page) {
        case "databases":
            // データベース一覧
            sql = "SELECT SCHEMA_NAME, DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME FROM INFORMATION_SCHEMA.SCHEMATA";
            break;
        case "tables":
            // テーブル一覧
            sql = "SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_TYPE, DATE_FORMAT(CREATE_TIME, '%Y-%m-%d') AS CREATE_TIME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA <> 'information_schema'";
            break;
        case "routines":
            // ルーチン一覧
            sql = "SELECT SPECIFIC_NAME, ROUTINE_SCHEMA, ROUTINE_TYPE, DATE_FORMAT(CREATED, '%Y-%m-%d') AS CREATED FROM INFORMATION_SCHEMA.ROUTINES";
            break;
        case "indexes":
            // インデックス一覧
            sql = "SELECT INDEX_NAME, TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.STATISTICS";
            break;
        default:
            res.json({result:[], fields:[]});
            break;
    }
    // クエリーを行う。
    mysql.query(sql, (row, fld) => {
        if (row) {
            fields = fld;
            result.push(row);
        }
        else {
            let fnames = [];
            for (let f of fields) {
                fnames.push(f.name);
            }
            res.json({result:result, fields:fnames});
        }
    });

});

// MySQL テーブルカラム一覧
router.get("/mysqlTableInfo", (req, res) => {
    let sql = "SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA <> 'information_schema'";
    let tables = [];
    let fields = [];
    let result = [];
    mysql.query(sql, (row) => {
        if (row) {
            tables.push(row.TABLE_SCHEMA + "." + row.TABLE_NAME);
        }
        else {
            if (req.query.table) {
                let sql2 = "SELECT ORDINAL_POSITION, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA FROM INFORMATION_SCHEMA.COLUMNS";
                let parts = req.query.table.split('.');
                sql2 += ` WHERE TABLE_SCHEMA = '${parts[0]}' AND TABLE_NAME = '${parts[1]}'`;
                mysql.query(sql2, (row, fld) => {
                    if (row) {
                        fields = fld;
                        result.push(row);
                    }
                    else {
                        let fnames = [];
                        for (let f of fields) {
                            fnames.push(f.name);
                        }
                        res.json({tables:tables, result:result, fields:fnames});
                    }
                });
            }
            else {
                res.render("mysqlTableInfo", {tables:tables, message:"", result:null});
            }
        }
    });
});

// MySQL ルーチン情報
router.get("/mysqlRoutineInfo", (req, res) => {
    let sql = "SELECT SPECIFIC_NAME, ROUTINE_SCHEMA, ROUTINE_TYPE FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA <> 'information_schema'";
    let routines = [];
    mysql.query(sql, (row) => {
        if (row) {
            routines.push(row.ROUTINE_SCHEMA + "." + row.SPECIFIC_NAME);
        }
        else {
            if (req.query.routine) {
                let parts = req.query.routine.split('.');
                let code = "";
                let sql2 = "SELECT ROUTINE_DEFINITION FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA='" + parts[0] + "' AND ROUTINE_NAME='" + parts[1] + "'";
                mysql.getRow(sql2, (err, row) => {
                    code = row.ROUTINE_DEFINITION;
                    let parameters = [];
                    let sql3 = "SELECT ORDINAL_POSITION, PARAMETER_MODE, PARAMETER_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.PARAMETERS WHERE SPECIFIC_SCHEMA='" + parts[0] + "' AND SPECIFIC_NAME='" + parts[1] + "'";
                    mysql.query(sql3, (row) => {
                        if (row) {
                            parameters.push(row);
                        }
                        else {
                            res.json({code:code, parameters:parameters, fields:['ORDINAL_POSITION', 'PARAMETER_MODE', 'PARAMETER_NAME', 'DATA_TYPE', 'CHARACTER_MAXIMUM_LENGTH'], message:""});
                        }
                    });
                });
            }
            else {
                res.render("mysqlRoutineInfo", {routines:routines, message:"", result:[]});
            }
        }
    });
});


// AWS S3 (GET)
router.get("/awsS3", (req, res) => {
    res.render("awsS3", {});
});


// AWS S3 (POST)
router.post("/awsS3", async (req, res) => {
    let key = req.body.key;
    let local = req.body.local;
    let confPath = fso.getDirectory(__dirname).replace(/\\/g, "/") + "/aws_config.json";
    aws.config.loadFromPath(confPath);
    let s3 = new aws.S3();
    if (req.body.backup) {
        let data = await fs.promises.readFile(req.body.local);
        let params = {
            Bucket: req.body.bucket,
            Key: req.body.key,
            Body: data
        };
        s3.putObject(params, (err, data) => {
            if (err) {
                res.send("Error: " + err.message);
            }
            else {
                res.send("OK: " + req.body.local + " をアップロードしました。");
            }
        });
    }
    else {
        let params = {
            Bucket: req.body.bucket,
            Key: req.body.key
        };
        s3.getObject(params, (err, data) => {
            if (err) {
                res.send("Error: " + err.message);
            }
            else {
                fs.writeFile(req.body.local, data.Body.toString(), (err) => {
                    if (err) {
                        res.send("Error: " + err.message);
                    }
                    else {
                        res.send("OK: " + req.body.local + " にダウンロードしたキーのデータが保存されました。");
                    }
                });
            }
        });
    }
});

// Wiki 投稿一覧
router.get("/wiki", async (req, res) => {
    let types = await mysql.query_p("SELECT DISTINCT `type` FROM Wiki");
    let sql = "SELECT id, title, author, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date`, info, hidden, `type`, `revision`  FROM Wiki WHERE hidden='0'";
    if (req.query.word) {
        const word = req.query.word;
        sql += ` AND (INSTR(title, '${word}') OR INSTR(content, '${word}') OR INSTR(info, '${word}') OR INSTR(author, '${word}'))`;
    }
    else if (req.query.type) {
        sql += ` AND type='${req.query.type}'`;
    }
    else {
        // 何もしない。
    }
    sql += " ORDER BY id DESC";
    let result = await mysql.query_p(sql);
    let message = "";
    if (result.length > 0) {
        message = result.length + " 件の投稿が検索されました。";
        if (req.query.word) {
            message += " 検索ワード：" + req.query.word;
        }
        else if (req.query.type) {
            message += " 区分：" + req.query.type;
        }
        else {
            // 何もしない。
        }
    }
    else {
        message = "投稿がありません。";
    }
    res.render("wiki", {message:message, result:result, types:types});
});

// Wiki のデータを得る。
router.get("/getWikiData", async (req, res) => {
    const id = req.query.id;
    const sql = "SELECT * FROM Wiki WHERE id=" + id;
    let data = await mysql.getRow_p(sql);
    res.json(data);
});

// 最新の Wiki のデータ n 件を得る。
router.get("/getWikiData2", async (req, res) => {
    const n = req.query.n;
    const sql = "SELECT * FROM Wiki ORDER BY id DESC LIMIT " + n;
    let data = await mysql.query_p(sql);
    res.json(data);
});

// Wiki フォーム GET
router.get("/wikiForm", async (req, res) => {
    let data = {};
    let message = "";
    if (req.query.id) {
        const result = await mysql.getRow_p("SELECT id,title,author,content,hidden,info,type,revision FROM Wiki WHERE id=" + req.query.id);
        if (result.id) {
            data.id = result.id;
            data.title = result.title;
            data.author = result.author;
            data.content = result.content;
            data.hidden = result.hidden;
            data.info = result.info;
            data.type = result.type;
            data.revision = result.revision;
            message = "検索されました。";
        }
        else {
            message = "id に対するデータが見つかりません。";
        }
    }
    else {
        data.id = "";
        data.title = "";
        data.author = "";
        data.date = "";
        data.content = "";
        data.info = "";
        data.hidden = '0';
        data.type = "";
        data.revision = 0;
    }
    res.render("wikiForm", {message:"", data:data});
});

// Wiki フォーム POST
router.post("/wikiForm", async (req, res) => {
    const title = req.body.title.replace(/'/g, "''");
    const content = req.body.content.replace(/'/g, "''").replace(/\r/g, "");
    let info = "";
    if (req.body.info) {
        info = req.body.info.replace(/'/g, "''");
    }
    let data = {
        id: req.body.id,
        title: title,
        author: req.body.author,
        date:Date.now(),
        content:content,
        info: info,
        hidden: req.body.hidden ? '1' : '0',
        type: req.body.type,
        revision: req.body.revision
    };
    let sql = "";
    let message = "";
    data.id = req.body.id;
    if (data.id) {
        // 更新
        sql = `UPDATE Wiki SET title='${data.title}', author='${data.author}', date=CURRENT_DATE(), content='${data.content}', info='${data.info}', hidden='${data.hidden}', type='${data.type}', revision=${data.revision} WHERE id=${data.id}`;
        message = `id=${data.id} のデータが更新されました。`;
    }
    else {
        // 挿入
        let id = await mysql.getValue_p("SELECT max(id) FROM Wiki");
        sql = `INSERT INTO Wiki VALUES(NULL, '${data.title}', '${data.author}', CURRENT_DATE(), '${data.content}', '${data.info}', '${data.hidden}', '${data.type}', ${data.revision})`;
        message = `id=${id+1} のデータが挿入されました。`;
    }
    await mysql.execute_p(sql);
    res.render("wikiForm", {message:message, data:data});
});

// Wiki 内容表示
router.get("/wikiContent", async (req, res) => {
    const id = req.query.id;
    let result = await mysql.getRow_p("SELECT title, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date`, content FROM Wiki WHERE id=" + id);
    if (result) {
        res.render("wikiContent", {id:id, date:result.date, title:result.title, message:"id: " + id + " に対する内容が見つかりました。", content:result.content});
    }
    else {
        res.render("wikiContent", {id:"", date:"", title:"エラー", message:"エラー id: " + id + " に対する内容が見つかりませんでした。", content:result.content});
    }
});




/* エクスポート */
module.exports = router;
