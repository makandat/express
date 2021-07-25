/* music.js */
'use strict';
const express = require('express');
const session = require('express-session');
const mysql = require('./MySQL.js');
const dto = require('./DateTime.js');
const fso = require('./FileSystem.js');
const os = require("os");
const router = express.Router();
const LIMIT = 1000;
const ENDLIMIT = 1000000;

// Music アルバム一覧表示
router.get('/', async (req, res) => {
    session.music_album = null;
    session.music_orderby = null;
    session.music_sortdir = null;
    session.music_search = null;
    session.music_start = 1;
    res.render('music', {title:"Music " + os.hostname(), message:""});
});

// Music 項目一覧表示
router.get('/showContent', async (req, res) => {
    let title = "音楽の一覧 ";
    let album = req.query.album;
    if (album == undefined) {
        album = 0;
    }
    let ms = await mysql.query_p("SELECT DISTINCT mark FROM Music");
    let marks = [];
    for (let m of ms) {
        marks.push(m.mark);
    }
    let fav = req.query.fav;
    if (fav) {
        const FAVSQL = "SELECT id, album, title, `path`, artist, media, mark, info, fav, `count`, bindata, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Music WHERE fav > 0 ORDER BY fav DESC";
        mysql.query(FAVSQL, (row) => {
            let result = [];
            if (row) {
                result.push(row);
            }
            else {
                res.render('musiclist', {"title":"好きな" + title, "albumName":"", "result": result, "marks":marks, "message": result.length == 0 ? "条件に合う結果がありません。" : "", dirasc:"", dirdesc:"●", search:""});
            }
        });
        return;
    }
    let albumName = "";
    if (album > 0) {
        title += ` (アルバム=${album})`;
        session.music_orderby = "id";
        session.music_sortdir = "asc";
        session.music_search = null;
        session.music_start = 1;
        session.music_mark = null;
        albumName = await mysql.getValue_p("SELECT name FROM Album WHERE id = " + album + " AND mark='music'");
    }
    if (req.query.reset) {
        session.music_album = 0;
        session.music_orderby = "id";
        session.music_sortdir = "asc";
        session.music_search = null;
        session.music_mark = null;
        session.music_start = 1;
    }
    if (req.query.sortdir) {
        session.videos_sortdir = req.query.sortdir;
    }
    let sql = await makeSQL(req);
    let result = [];
    mysql.query(sql, (row) => {
        if (row) {
            result.push(row);
        }
        else {
            let dirasc = "●";
            let dirdesc = "";
            if (req.query.sortdir == "desc") {
                dirasc = "";
                dirdesc = "●";
                session.music_start = 1000000;
            }
            else {
                dirasc = "●";
                dirdesc = "";
                session.music_start = 1;
            }
            res.render('musiclist', {"title":title, "albumName":albumName, "result": result, "marks":marks, "message": result.length == 0 ? "条件に合う結果がありません。" : "", dirasc:dirasc, dirdesc:dirdesc, search:session.music_search});
        }
    });
});

// Music 項目の追加・修正 (GET)
router.get('/musicForm', (req, res) => {
    let value = {
        id: "",
        album: 0,
        title: "",
        path: "",
        artist: "",
        media: "",
        mark: "",
        info: "",
        fav: 0,
        bindata: 0
    };
    res.render('formMusic', {message:"", value:value});
});

// Music 項目の確認 (GET)
router.get('/confirmMusic/:id', (req, res) => {
    let id = req.params.id;
    let sql = "SELECT * FROM Music WHERE id = " + id;
    mysql.getRow(sql, (err, row) => {
        if (!err) {
            let value = {
                id: id,
                album: row.album,
                title: row.title,
                path: row.path,
                artist: row.artist,
                media: row.media,
                mark: row.mark,
                info: row.info,
                fav: row.fav,
                bindata: row.bindata
            };
            res.render('formMusic', {message:`id: ${id} が検索されました。`, value:value});
        }
        else {
            let value = {
                id: id,
                album: 0,
                title: "",
                path: "",
                artist: "",
                media: "",
                mark: "",
                info: "",
                fav: 0,
                bindata: 0
            };
            res.render('formMusic', {message:"エラー： データがありません。", value:value});
        }
    });
});

// Music 項目の追加・修正 (POST)
router.post('/musicForm', async (req, res) => {
    let id = req.body.id;
    let album = req.body.album;
    if (album == undefined) {
        album = 0;
    }
    let title = req.body.title.replace("'", "''");
    let path = req.body.path.replace(/\\/g, "/").replace("'", "''");
    let artist = req.body.artist.replace("'", "''");
    let media = req.body.media;
    let mark = req.body.mark;
    let info = req.body.info.replace("'", "''");
    let fav = req.body.fav;
    let bindata = req.body.bindata;
    let value = {
        id: req.body.id,
        album: req.body.album,
        title: req.body.title,
        path: req.body.path,
        artist: req.body.artist,
        media: req.body.media,
        mark: req.body.mark,
        info: req.body.info,
        fav: req.body.fav,
        bindata: req.body.bindata
    };

    if (id) {
        //  更新
        let update = `UPDATE Music SET album=${album}, title='${title}', path='${path}', artist='${artist}', media='${media}', mark='${mark}', info='${info}', fav=${fav}, bindata=${bindata} WHERE id=${id}`;
        mysql.execute_p(update)
        .catch(err => res.render('formMusic', {message:err.message, value:value}))
        .then(data => res.render('formMusic', {message:`${title} が更新されました。`, value:value}));
    }
    else {
        // 追加
        let insert = `INSERT INTO Music(album, title, path, artist, mark, info, fav, bindata, date) VALUES(${album}, '${title}', '${path}', '${artist}', '${media}', '${mark}', '${info}', ${fav}, ${bindata}, CURRENT_DATE())`;
        mysql.execute_p(insert)
        .catch(err => res.render('formMusic', {message:err.message, value:value}))
        .then(data => res.render('formMusic', {message:`${title} が追加されました。`, value:value}));
    }
});

// 音楽演奏フォーム
router.get('/playForm/:id', (req, res) => {
    let id = req.params.id;
    mysql.getRow("SELECT title, path FROM Music WHERE id=" + id, (err, row) =>{
        if (err) {
            res.render('playForm', {title:row.title, path:row.path, message:err.message});
        }
        else {
            countup(id);
            res.render('playForm', {title:row.title, path:row.path, message:"音楽ファイルの形式によっては音が鳴らないことがあります。"});
        }
    });
});

// プレイリストの管理
router.get('/musicPlForm', async (req, res) => {
    let value = {
        id:"",
        title:"",
        info:"",
        items:""
    };
    let result = await mysql.query_p("SELECT * FROM Playlists");
    res.render('playlistForm', {message:"", result:result,value:value});
});

// プレイリストの内容
router.get('/showPlaylist/:id', async (req, res) =>{
    let id = req.params.id;
    let row = await mysql.getRow_p(`SELECT * FROM Playlists WHERE id=${id}`);
    let items = row.items.split("\n");
    res.render('showPlaylist', {title:`id: ${id} ${row.title}`, message:"", result:items});
});

// 音楽ファイルを取得する。
router.get('/getmusic', (req, res) => {
    let path = req.query.path;
    res.sendFile(path);
});

// SQL を構築する。
async function makeSQL(req) {
    session.music_album = req.query.album;
    // アルバム指定あり？
    if (!session.music_album) {
        session.music_album = 0;
    }
    // 並び順のフィールド
    if (req.query.orderby) {
        session.music_orderby = req.query.orderby;
    }
    else {
        session.music_orderby = "id";
    }
    // 並び替えの方向
    if (req.query.sortdir) {
        session.music_sortdir = req.query.sortdir;
        if (session.music_sortdir == "desc") {
            // 降順
            session.music_start = ENDLIMIT;
            session.music_end = 1;
        }
        else {
            // 昇順
            session.music_start = 1;
            session.music_end = ENDLIMIT;
        }
    }
    else {
        session.music_start = 1;
        session.music_end = ENDLIMIT;
    }
    // 検索文字列
    if (req.query.search) {
        session.music_search = req.query.search;
    }
    // 検索開始位置あり
    if (req.query.start) {
        session.music_start = req.query.start;
        if (session.music_sortdir == "desc") {
            session.music_end = 1;
        }
        else {
            session.music_end = ENDLIMIT;
        }
    }
    // マーク指定あり
    if (req.query.mark) {
        session.music_mark = req.query.mark;
    }
    else {
        session.music_mark = "";
    }
    // 最大 id
    let lastid = await mysql.getValue_p("SELECT MAX(id) From Music");

    // ページ移動
    if (req.query.move == "first") {
        // 最初のページへ移動
        session.music_start = session.music_sortdir == "asc" ? 1 : lastid;
        session.music_end = ENDLIMIT;
    }
    else if (req.query.move == "last") {
        // 最後のページへ移動
        if (session.music_sortdir) {
            if (session.music_sortdir == "asc") {
                // 昇順
                session.music_start = lastid;
                session.music_end = ENDLIMIT;
            }
            else {
                // 降順
                let minId = await mysql.getValue_p("SELECT MIN(id) FROM Music");
                session.music_start = minId;
                session.music_end = minId;
            }
        }
        else {
            session.music_sortdir = "asc";
            session.music_start = lastid;
            session.music_end = ENDLIMIT;
        }
    }
    else if (req.query.move == "prev") {
        // 前のページへ移動
        if (session.music_sortdir == "desc") {
            // 降順の場合 (100, 99, 98, ...)
            session.music_end = session.music_start;
            let rows = await mysql.query_p(`SELECT id FROM Music WHERE id > ${session.music_start}`);
            if (rows) {
                let i = 0;
                if (rows.length > LIMIT) {
                    for (let a of rows) {
                        if (i == LIMIT - 1) {
                            session.music_start = a.id;
                            break;
                        }
                        i++;
                    }
                }
                else {
                    session.music_start = lastid;
                    session.music_end = 1;
                }
            }
            else {
                session.music_end = 1;
            }
        }
        else {
            // 昇順の場合 (1, 2, 3, ...)
            session.music_end = session.music_start;
            let rows = await mysql.query_p(`SELECT id FROM Music WHERE id < ${session.music_start}`);
            if (rows) {
                let i = 0;
                if (rows.length > LIMIT) {
                    for (let a of rows) {
                        if (rows.length - LIMIT == i) {
                            session.music_start = a.id;
                            break;
                        }
                        i++;
                    }
                }
                else {
                    session.music_start = 1;
                }
            }
            else {
                session.music_start = 1;
            }
        }
    }
    else if (req.query.move == "next") {
        // 次のページへ移動
        if (session.music_sortdir == "desc") {
            // 降順
            session.music_start = session.music_end;
        }
        else {
            // 昇順
            session.music_sortdir = "asc";
            session.music_start = session.music_end;
        }
    }
    else {
        // その他 そのまま
    }

    // SQL 文作成
    let sql = "SELECT id, album, title, `path`, artist, media, mark, info, fav, `count`, bindata, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Music";
    let needWhere = true;
    let needAnd = true;
    if (session.music_album > 0) {
        // アルバム指定あり
        sql += ` WHERE album=${session.music_album}`;
        needWhere = false;
        if (session.music_sortdir == "desc") {
            sql += " AND id <= " + session.music_start;
        }
        else {
            sql += " AND id >= " + session.music_start;
        }
        if (session.music_search || session.music_mark) {
            sql += " AND " + getCriteria(session.music_search, session.music_mark);
        }
        else {
            // そのまま
        }
    }
    else {
        // アルバム指定なし
        if (session.music_sortdir == "desc") {
            // 降順
            sql += " WHERE id <= " + session.music_start;
        }
        else {
            // 昇順
            sql += " WHERE id >= " + session.music_start;
        }
        if (session.music_search || session.music_mark) {
            sql += " AND " + getCriteria(session.music_search, session.music_mark);
        }
        else {
            // そのまま
        }
    }
    if (session.music_orderby) {
        // 並び順指定あり
        sql += " ORDER BY " + session.music_orderby;
        if (session.music_sortdir) {
            sql += " " + session.music_sortdir;
        }
        else {
            // そのまま
        }
    }
    else {
        // 並び順指定なしは id とする。
        sql += " ORDER BY id";
        if (session.music_sortdir) {
            sql += " " + session.music_sortdir;
        }
        else {
            // そのまま
        }
    }
    sql += ` LIMIT ${LIMIT}`;
    return sql;
}

// 指定された id の fav を ＋１する。
router.get('/favorite/:id', async (req, res) => {
    let id = req.params.id;
    let fav = await mysql.getValue_p("SELECT fav FROM Music WHERE id = " + id);
    fav++;
    await mysql.execute_p(`UPDATE Music SET fav=${fav} WHERE id=${id}`);
    //res.send(fav);
});

// 指定された id の count を ＋１する。
async function countup(id) {
    let count = await mysql.getValue_p("SELECT count FROM Music WHERE id = " + id);
    count++;
    await mysql.execute_p(`UPDATE Music SET count=${count} WHERE id=${id}`);
};

// サーチワードからSQLの条件に変換する。
function getCriteria(search, mark) {
    let criteria = "";
    let needAnd = false;
    if (search) {
        criteria += `INSTR(title, '${search}') OR INSTR(path, '${search}') OR INSTR(info, '${search}')`;
        needAnd = true;
    }
    if (mark) {
        if (needAnd) {
            criteria += " AND ";
        }
        criteria += `mark='${mark}'`;
    }
    return criteria;
}


// ルータをエクスポート
module.exports = router;
