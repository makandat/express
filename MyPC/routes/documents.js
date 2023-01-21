/* documents.js */
'use strict';
const express = require('express');
const session = require('express-session');
const mysql = require('./MySQL.js');
const dto = require('./DateTime.js');
const fso = require('./FileSystem.js');
const router = express.Router();

// 書棚一覧表示
router.get('/', (req, res) => {
    res.render('documents', {title:"文書(書棚)一覧", message:""});
});

// 文書の追加・修正 (GET)
router.get("/documentForm", async (req, res) => {
    let value = {
        id: "",
        album: 0,
        title: "",
        revision: "0",
        media: "",
        path: "",
        writer: "",
        mark: "",
        info: "",
        backup: "",
        release: dto.getDateString(),
        bindata: 0
    };
    let marks = [];
    const marklist = await mysql.query_p("SELECT DISTINCT mark FROM Documents");
    for (const r  of marklist) {
        marks.push(r.mark);
    }
    let medias = [];
    const medialist = await mysql.query_p("SELECT name FROM Medias");
    for (const r  of medialist) {
        medias.push(r.name);
    }
    let message = "";
    if (req.query.id) {
        const result = await mysql.query_p("SELECT * FROM Documents WHERE id=" + req.query.id);
        value.id = req.query.id;
        value.album = result.album;
        value.title = result.title;
        value.revision = result.revision;
        value.media = result.media;
        value.path = result.path;
        value.writer = result.writer;
        value.mark = result.mark;
        value.info = result.info;
        value.backup = result.backup;
        value.release = result.release;
        value.bindata = result.bindata;
        message = `Id = ${req.query.id} が検索されました。`;
    }
    res.render("documentForm", {message:message, value:value, marks:marks, medias:medias});
});

// 文書の追加・修正 (POST)
router.post("/documentForm", async (req, res) => {
    let message = "";
    let id = req.body.id;
    let album = req.body.album ? parseInt(req.body.album) : 0;
    let title = req.body.title.replace(/'/g, "''");
    let revision = req.body.revision ? req.body.revision : "";
    let path = req.body.path.replace(/'/g, "''").replace(/\\/g, "/").replace("\"", "");
    let media = req.body.media.replace(/'/g, "''");
    let writer = req.body.writer ? req.body.writer : "";
    let mark = req.body.mark ? req.body.mark : "";
    let info = req.body.info ? req.body.info.replace(/'/g, "''") : "";
    let backup = req.body.backup ? req.body.backup.replace(/'/g, "''").replace(/\\/g, "/") : "";
    let release = req.body.release ? req.body.release : dto.getDateString();
    let bindata = req.body.bindata ? parseInt(req.body.bindata) : 0;
    let value = {
        id:id,
        album:album,
        title:title,
        revision:revision,
        media:media,
        path:path,
        writer:writer,
        mark:mark,
        info:info,
        backup:backup,
        release:release,
        bindata:bindata
    };

    if (!req.body.path.startsWith('https://')) {
        if (!fso.exists(req.body.path)) {
            res.render('showInfo', {title:"エラー", message:path + " が存在しません。", icon:"cancel.png"});
            return;
        }    
    }
    let marks = [];
    const marklist = await mysql.query_p("SELECT DISTINCT mark FROM Documents");
    for (const r  of marklist) {
        marks.push(r.mark);
    }
    let medias = [];
    const medialist = await mysql.query_p("SELECT name FROM Medias");
    for (const r  of medialist) {
        medias.push(r.name);
    }
    if (id) {
        // 更新
        let update = `UPDATE Documents SET album=${album}, title='${title}', revision='${revision}', media='${media}', path='${path}', writer='${writer}', mark='${mark}', info='${info}', backup='${backup}', \`release\`=DATE('${release}'), bindata=${bindata} WHERE id=${id}`;
        mysql.execute(update, (err) => {
            if (err) {
                message = err.message;
            }
            else {
                message = `(${id}) "${title}" が更新されました。`;
            }
            res.render("documentForm", {message:message, value:value, marks:marks, medias:medias});
        });
    }
    else {
        // 挿入
        let insert = `INSERT INTO Documents VALUES(NULL, ${album}, '${title}', '${revision}', '${media}', '${path}', '${writer}', '${mark}', '${info}', '${backup}', '${release}', ${bindata}, CURRENT_DATE())`;
        mysql.execute(insert, (err) => {
            if (err) {
                message = err.message;
            }
            else {
                message = `"${title}" が追加されました。`;
            }
            res.render("documentForm", {message:message, value:value, marks:marks, medias:medias});
        });
    }
});

// データ確認
router.get("/confirmDocument", async (req, res) => {
    let id = req.query.id;
    let value = {
        id:id,
        album:0,
        title:"",
        revision:"0",
        path:"",
        writer:"",
        mark:"",
        info:"",
        backup:"",
        release:"",
        bindata:0
    };
    let marks = [];
    const marklist = await mysql.query_p("SELECT DISTINCT mark FROM Documents");
    for (const r  of marklist) {
        marks.push(r.mark);
    }
    let medias = [];
    const medialist = await mysql.query_p("SELECT name FROM Medias");
    for (const r  of medialist) {
        medias.push(r.name);
    }
    if (!id) {
        res.render("showInfo", {message:"id が正しくありません。", title:"エラー", icon:"cancel.png"});
        return;
    }
    else {
        let sql = `SELECT * FROM Documents WHERE id=${id}`;
        mysql.getRow(sql, (err, row) => {
            if (err) {
                res.render("showInfo", {message:err.message, title:"エラー", icon:"cancel.png"});
            }
            else {
                if (row) {
                    res.render("documentForm", {message:`id=${id} が検索されました。`, value:row, marks:marks, medias:medias});
                }
                else {
                    res.render("showInfo", {message:"不正なパラメータが指定されました。", title:"エラー", icon:"cancel.png"});
                }
            }
        });    
    }
});

// 文書の一覧
router.get("/showContent", async (req, res) => {
    let result = [];
    let marks = [];
    let message = "";
    let title = "文書一覧";
    const album = req.query.album;
    let albumName = "";
    if (album != undefined) {
        albumName = await mysql.getValue_p("SELECT name FROM Album WHERE id=" + album);
    }
    let albumList = await mysql.query_p("SELECT id, name FROM Album WHERE mark='document' ORDER BY id");
    mysql.query("SELECT DISTINCT mark FROM Documents", (row) => {
        if (row) {
            if (row.mark) {
                marks.push(row.mark);
            }
        }
        else {
            let sortasc = "";
            let sortdesc = "";
            let sql = "SELECT * FROM Documents";
            if (album) {
                sql += ` WHERE album=${album}`;
                message = "アルバム： " + albumName;
                title += " (album: " + album + ")"
            }
            else if (req.query.mark) {
                sql += ` WHERE mark='${req.query.mark}'`;
                message = "マーク： " + req.query.mark;
                title += " (mark: " + req.query.mark + ")"
            }
            else if (req.query.search) {
                const search = `'${req.query.search}'`;
                sql += ` WHERE INSTR(title, ${search}) or INSTR(path, ${search}) or INSTR(info, ${search})`;
                message = "検索： " + req.query.search;
                title += " (" + req.query.search + ")";
            }
            if (req.query.sortdir) {
                session.projects_sortdir = req.query.sortdir;
                if (session.projects_sortdir == "desc") {
                    sortasc = "";
                    sortdesc = "●";   
                }
                else {
                    sortasc = "●";
                    sortdesc = "";
                }
            }
            else {
                session.projects_sortdir = "asc";
                sortasc = "●";
                sortdesc = "";
            }
            sql += " ORDER BY id " + session.projects_sortdir;
            try {
                mysql.query(sql, (row) => {
                    if (row) {
                        result.push(row);
                    }
                    else {
                        res.render("documentlist", {title:title, message:message, result:result, marks:marks, sortasc:sortasc, sortdesc:sortdesc, albumList:albumList});
                    }
                });    
            }
            catch (err) {
                res.render("documentlist", {message:"致命的エラー：" + err.message, result:[], marks:[]});
            }
        }
    });
});

// エクスポート
module.exports = router;
