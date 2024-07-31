/* music.js */
'use strict';
const express = require('express');
const session = require('express-session');
const mysql = require('./MySQL.js');
const fso = require('./FileSystem.js');
const os = require("os");
const router = express.Router();
const LIMIT = 1000;
const SELECT = "SELECT id, album, title, `path`, artist, media, mark, info, fav, `count`, bindata, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Music";

// Music アルバム一覧表示
router.get('/', async (req, res) => {
    session.music_album = null;
    session.music_orderby = null;
    session.music_sortdir = null;
    session.music_search = null;
    session.music_offset = 0;
    res.render('music', {title:"Music " + os.hostname(), message:""});
});

// Music 項目一覧表示
router.get('/showContent', async (req, res) => {
    let title = "音楽の一覧 ";
    session.music_orderby = "id";
    if (req.query.fav) {
        showFavlist(res);
        return;
    }
    if (!session.music_offset) {
        session.music_offset = 0;
    }
    let album = req.query.album;
    if (!album) {
        album = 0;
    }
    let albumName = "";
    if (album > 0) {
        title += ` (アルバム=${album})`;
        session.music_orderby = "id";
        session.music_sortdir = session.music_sortdir ? session.music_sortdir : "desc";
        session.music_search = null;
        session.music_album = album;
        albumName = await mysql.getValue_p("SELECT name FROM Album WHERE id = " + album + " AND mark='music'");
    }
    if (req.query.reset) {
        session.music_album = 0;
        session.music_orderby = "id";
        session.music_sortdir = "desc";
        session.music_search = null;
        session.music_mark = null;
        session.music_offset = 0;
    }
    if (req.query.sortdir) {
        session.music_sortdir = req.query.sortdir;
        session.music_offset = 0;
    }
    let dirasc = "";
    let dirdesc = "●";
    if (session.music_sortdir == "desc") {
        dirasc = "";
        dirdesc = "●";
    }
    else {
        session.music_sortdir = "asc";
        dirasc = "●";
        dirdesc = "";
    }
    // アルバム一覧を得る。
    const albumList = await mysql.query_p("SELECT id, name FROM Album WHERE mark='music' ORDER BY id");

    // クエリーを行う。
    try {
        let sql = await makeSQL(req);
        let result = await mysql.query_p(sql);
        // 結果を返す。
        let rows = await mysql.query_p("SELECT DISTINCT mark FROM Music");
        let marks = [];
        for (let row of rows) {
            marks.push(row.mark);
        }
        res.render('musiclist', {"title":title, "albumName":albumName, "result": result, "marks":marks, "albumList":albumList,
            "message": result.length == 0 ? "条件に合う結果がありません。" : "",
            dirasc:dirasc, dirdesc:dirdesc, search:req.query.search != undefined ? req.query.search : ""});    
    }
    catch (err) {
        res.render("showInfo", {"title":"Fatal Error", "icon":"cancel.png", "message":"エラー：" + err.message});
    }
});

// アーティスト一覧
router.get("/artistList", (req, res) => {
    let mark = req.query.mark;
    let result = [];
    let sql = "SELECT artist, COUNT(artist) AS artistcount, SUM(`count`) AS sumplayback, SUM(fav) AS sumfav FROM Music";
    if (mark) {
        if (mark != "0") {
            sql += ` WHERE mark='${mark}'`;
        }
    }
    sql += " GROUP BY artist ORDER BY artist";
    mysql.query(sql, (row) => {
        if (row) {
            result.push(row);
        }
        else {
            // マーク一覧を得る。
            let marks = [];
            mysql.query("SELECT DISTINCT mark FROM Music", (m) => {
                if (m) {
                    marks.push(m.mark);
                }
                else {
                    res.render('artistList', {message:"", result:result, marks:marks, mark:mark});
                }
            })
        }
    });
});

// Music 項目の追加・修正 (GET)
router.get('/musicForm', async (req, res) => {
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
    // マーク一覧を得る。
    const marklist = await mysql.query_p("SELECT DISTINCT mark FROM Music");
    let marks = [];
    for (const r of marklist) {
        marks.push(r.mark);
    }
    // メディア一覧を得る。
    const medialist = await mysql.query_p("SELECT name FROM Medias");
    let medias = [];
    for (const r of medialist) {
        medias.push(r.name);
    }
    res.render('formMusic', {message:"", value:value, medias:medias, marks:marks});
});

// Music 項目の確認 (GET)
router.get('/confirmMusic/:id', async (req, res) => {
    let id = req.params.id;
    let sql = "SELECT * FROM Music WHERE id = " + id;
    // マーク一覧を得る。
    const marklist = await mysql.query_p("SELECT DISTINCT mark FROM Music");
    let marks = [];
    for (const r of marklist) {
        marks.push(r.mark);
    }
    // メディア一覧を得る。
    const medialist = await mysql.query_p("SELECT name FROM Medias");
    let medias = [];
    for (const r of medialist) {
        medias.push(r.name);
    }
    mysql.getRow(sql, (err, row) => {
        if (row) {
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
            res.render('formMusic', {message:"", value:value, medias:medias, marks:marks});
        }
        else {
            res.render('showInfo', {message:"エラー： データがありません。", title:"エラー", icon:"cancel.png"});
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
    let path = req.body.path.replace(/\\/g, "/").replace("'", "''").replace("\"", "");
    let artist = req.body.artist.replace("'", "''");
    let media = req.body.media;
    let mark = req.body.mark;
    let info = req.body.info.replace("'", "''");
    let fav = req.body.fav;
    let bindata = req.body.bindata;
    let value = {
        id: id,
        album: album,
        title: title,
        path: path,
        artist: artist,
        media: media,
        mark: mark,
        info: info,
        fav: fav,
        bindata: bindata
    };
    if (!fso.exists(req.body.path)) {
        res.render('showInfo', {title:"エラー", message:path + " が存在しません。", icon:"cancel.png"});
        return;
    }
    // マーク一覧を得る。
    const marklist = await mysql.query_p("SELECT DISTINCT mark FROM Music");
    let marks = [];
    for (const r of marklist) {
        marks.push(r.mark);
    }
    // メディア一覧を得る。
    const medialist = await mysql.query_p("SELECT name FROM Medias");
    let medias = [];
    for (const r of medialist) {
        medias.push(r.name);
    }
    if (id) {
        //  更新
        let update = `UPDATE Music SET album=${album}, title='${title}', path='${path}', artist='${artist}', media='${media}', mark='${mark}', info='${info}', fav=${fav}, bindata=${bindata} WHERE id=${id}`;
        mysql.execute(update, (err) => {
            if (err) {
                res.render('formMusic', {message:err.message, value:value, marks:marks, medias:medias});
            }
            else {
                res.render('formMusic', {message:`${title} が更新されました。`, value:value, marks:marks, medias:medias});
            }
        });
    }
    else {
        // 追加
        let insert = `INSERT INTO Music(id, album, title, path, artist, media, mark, info, fav, count, bindata, date) VALUES(NULL, ${album}, '${title}', '${path}', '${artist}', '${media}', '${mark}', '${info}', ${fav}, 0, ${bindata}, CURRENT_DATE())`;
        mysql.execute(insert, (err) => {
            if (err) {
                res.render('formMusic', {message:err.message, value:value, marks:marks, medias:medias});
            }
            else {
                res.render('formMusic', {message:`${title} が追加されました。`, value:value, marks:marks, medias:medias});
            }
        });
    }        
});

// 音楽演奏フォーム (id 指定)
router.get('/playForm/:id', async (req, res) => {
    const MSG = "音楽ファイルの形式によっては音が鳴らないことがあります。パスが間違っている場合も同様です。";
    let id = req.params.id ? req.params.id : 0;
    if (id == 'prev') {
        let id = session.music_playid - 1;
        if (id == 0) {
            res.render('showInfo', {title:"エラー", icon:"cancel.png", message:"もう音楽がありません。"});
            return;
        }
        while (id > 0) {
            let sql = `SELECT title, path FROM Music WHERE id=${id}`;
            let row = await mysql.getRow_p(sql);
            if (row) {
                session.music_playid = id;
                countup(id);
                res.render('playForm', {title:row.title, path:row.path, message:"(" + id + ") " + row.path});
                return;
            }
            else {
                id--;
            }
        }        
    }
    else if (id == 'next') {
        let id = session.music_playid + 1;
        let maxId = await mysql.getValue_p("SELECT MAX(id) FROM Music");
        if (id > maxId) {
            res.render('showInfo', {title:"エラー", icon:"cancel.png", message:"もう音楽がありません。"});
            return;
        }
        while (id <= maxId) {
            let sql = `SELECT title, path FROM Music WHERE id=${id}`;
            let row = await mysql.getRow_p(sql);
            if (row) {
                session.music_playid = id;
                countup(id);
                res.render('playForm', {title:row.title, path:row.path, message:"(" + id + ") " + row.path});
                return;
            }
            else {
                id++;
            }
        }     
    }
    else {
        session.music_playid = parseInt(id);
        mysql.getRow("SELECT title, path FROM Music WHERE id=" + id, (err, row) =>{
            if (err) {
                res.render('showInfo', {title:"エラー " + row.title, icon:"cancel.png", message:err.message});
            }
            else {
                countup(id);
                res.render('playForm', {title:row.title, path:row.path, message:MSG});
            }
        });
    }
});

// 音楽演奏フォーム (path 指定)
router.get('/playPath', (req, res) => {
    let path = req.query.path;
    mysql.getRow("SELECT id, title FROM Music WHERE path='" + path + "'", (err, row) =>{
        if (err) {
            res.render('showInfo', {title:"エラー " + row.title, icon:"cancel.png", message:err.message});
        }
        else {
            countup(row.id);
            res.render('playForm', {title:row.title, path:path, message:"音楽ファイルの形式によっては音が鳴らないことがあります。(mp3 推奨)"});
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
    let result = await mysql.query_p("SELECT id, title, items, info, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date`, BINDATA FROM Playlists");
    res.render('playlistForm', {message:"", result:result,value:value});
});

// プレイリストの内容
router.get('/showPlaylist/:id', async (req, res) =>{
    let id = req.params.id;
    let row = await mysql.getRow_p("SELECT id, title, items, info, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date`, BINDATA FROM Playlists WHERE id=" + id);
    let items = row.items.split("\n");
    res.render('showPlaylist', {title:`id: ${id} ${row.title}`, message:"", result:items});
});

// 音楽ファイルを取得する。
router.get('/getmusic', (req, res) => {
    let path = req.query.path;
    res.sendFile(path);
});

// SQL を作成する。
async function makeSQL(req) {
    if (req.query.artist) {
        return SELECT + ` WHERE artist='${req.query.artist}' ORDER BY id DESC`;
    }
    if (req.query.album) {
        return SELECT + ` WHERE album=${req.query.album} ORDER BY id DESC`;
    }
    if (session.music_offset == undefined) {
        session.music_offset = 0;
    }
    if (session.music_sortdir == undefined) {
        session.music_sortdir = "desc";
    }

    if (req.query.reset) {
        session.music_offset = 0;
        session.music_sortdir = "desc";
        session.music_mark = undefined;
    }
    if (req.query.move) {
        let sql2 = 'SELECT count(*) AS n FROM Pictures';
        if (session.music_mark) {
            sql2 += ` WHERE mark='${session.music_mark}'`;
        }
        let n = await mysql.getValue_p(sql2);
        switch (req.query.move) {
            case 'first':
                session.music_offset = 0;
                break;
            case 'prev':
                session.music_offset -= LIMIT;
                if (session.music_offset < 0) {
                    session.music_offset = 0;
                }    
                break;
            case 'next':
                session.music_offset += LIMIT;
                if (session.music_offset >= n) {
                    session.music_offset = n - 1;
                }    
                break;
            case 'last':
                session.music_offset = n - 1;
                break;
            default:  // '0'
                break;
        }
    }
    let sql = SELECT;
    let where = true;
    if (req.query.mark) {
        sql += ` WHERE mark='${req.query.mark}'`;
        session.music_mark = req.query.mark;
        session.music_offset = 0;
        session.music_sortdir = "desc";
        where = false;
    }
    else if (session.music_mark) {
        sql += ` WHERE mark='${session.music_mark}'`;
        where = false;
    }
    else {
        // 何もしない。
    }
    if (req.query.search) {
        let search = req.query.search.replace(/'/g, "''");
        if (where) {
            sql += ' WHERE ';
        }
        else {
            sql += ' AND ';
        }
        sql += `(title LIKE '%${search}%' OR path LIKE '%${search}%' OR artist LIKE '%${search}%' OR info LIKE '%${search}%')`;        
    }
    sql += ` ORDER BY id ${session.music_sortdir} LIMIT ${LIMIT} OFFSET ${session.music_offset}`;
    return sql;
}

// 指定された id の fav を ＋１する。
router.get('/favorite/:id', async (req, res) => {
    let id = req.params.id;
    mysql.execute(`CALL user.favup(3, ${id})`, (err) => {
        res.redirect(req.get('referer'));
    });
});

// 指定された id の count を ＋１する。
async function countup(id) {
    mysql.execute(`CALL user.countup(3, ${id})`, (err) => {
        // res.render と競合するので不要。
        //res.status(200).send(0);
    });
}

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

// 音楽を返す。
router.get('/play/:move', async (req, res) => {
    let move = req.params.move;
    let path = req.query.path;
    let sql = `SELECT id FROM Music WHERE path = '${path}'`;
    let id0 = await mysql.getValue_p(sql);
    switch (move) {
        case "prev": {
                let id = id0 - 1;
                while (id > 0) {
                    sql = `SELECT path FROM Music WHERE id='${id}'`;
                    let p = await mysql.getValue_p(sql);
                    if (p) {
                        res.sendFile(p);
                        return;
                    }
                    else {
                        id--;
                    }
                } 
            }           
            break;
        case "next": {
                let id = id0 + 1;
                let maxId = await mysql.getValue_p("SELECT MAX(id) FROM Music");
                while (id <= maxId) {
                    sql = `SELECT path FROM Music WHERE id=${id}`;
                    let p = await mysql.getValue_p(sql);
                    if (p) {
                        res.sendFile(p);
                        return;
                    }
                    else {
                        id++;
                    }
                }
            }            
            break;
        default:
            res.sendFile(path);
            break;
    }
});


// ルータをエクスポート
module.exports = router;
