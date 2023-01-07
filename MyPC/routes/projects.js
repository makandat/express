/* projects.js */
'use strict';
const express = require('express');
const session = require('express-session');
const mysql = require('./MySQL.js');
const dto = require('./DateTime.js');
const fso = require('./FileSystem.js');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// プロジェクトアルバム一覧表示
router.get('/', (req, res) => {
    res.render('projects', {title:"プロジェクト", message:""});
});

// プロジェクトの追加・修正 (GET)
router.get("/projectForm", async (req, res) => {
    let value = {
        id: "",
        album: 0,
        title: "",
        version: "0.0.0",
        path: "",
        media: "",
        owner: "",
        mark: "",
        info: "",
        git:"",
        backup: "",
        release: dto.getDateString(),
        bindata: 0
    };
    let marks = [];
    let medias = [];
    const marklist = await mysql.query_p("SELECT DISTINCT mark FROM Projects");
    for (const r of marklist) {
        marks.push(r.mark);
    }
    const medialist = await mysql.query_p("SELECT name FROM Medias");
    for (const r of medialist) {
        medias.push(r.name);
    }
    res.render('projectForm', {message:"", marks:marks, medias:medias, value:value});
});

// プロジェクトの追加・修正 (POST)
router.post("/projectForm", async (req, res) => {
    let message = "";
    let id = req.body.id;
    let album = req.body.album ? parseInt(req.body.album) : 0;
    let title = req.body.title.replace(/'/g, "''");
    let version = req.body.version ? req.body.version : "";
    let path = req.body.path.replace(/'/g, "''").replace(/\\/g, "/");
    let media = req.body.media ? req.body.media : "";
    let owner = req.body.owner ? req.body.owner : "";
    let mark = req.body.mark ? req.body.mark : "";
    let info = req.body.info ? req.body.info.replace(/'/g, "''") : "";
    let git = req.body.git ? req.body.git.replace(/'/g, "''") : "";
    let backup = req.body.backup ? req.body.backup.replace(/'/g, "''").replace(/\\/g, "/") : "";
    let release = req.body.release ? req.body.release : dto.getDateString();
    let bindata = req.body.bindata ? parseInt(req.body.bindata) : 0;
    let value = {
        id:id,
        album:album,
        title:title,
        version:version,
        path:path,
        media:media,
        owner:owner,
        mark:mark,
        info:info,
        git:git,
        backup:backup,
        release:release,
        bindata:bindata
    };

    if (!fso.exists(req.body.path)) {
        res.render('showInfo', {title:"エラー", message:path + " が存在しません。", icon:"cancel.png"});
        return;
    }

    let marks = [];
    const marklist = await mysql.query_p("SELECT DISTINCT mark FROM Projects");
    for (const r of marklist) {
        marks.push(r.mark);
    }
    let medias = [];
    const medialist = await mysql.query_p("SELECT name FROM Medias");
    for (const r of medialist) {
        medias.push(r.name);
    }

    if (id) {
        // 更新
        const update = `UPDATE Projects SET album=${album}, title='${title}', \`version\`='${version}', path='${path}', media='${media}', \`owner\`='${owner}', mark='${mark}', info='${info}', git='${git}', \`backup\`='${backup}', \`release\`=DATE('${release}'), bindata=${bindata} WHERE id=${id}`;
        mysql.execute(update, (err) => {
            if (err) {
                message = err.message;
            }
            else {
                message = `(${id}) "${title}" が更新されました。`;
            }
            res.render("projectForm", {message:message, value:value, marks:marks, medias:medias});
        });
    }
    else {
        // 挿入
        const insert = `INSERT INTO Projects VALUES(NULL, ${album}, '${title}', '${version}', '${path}', '${media}', '${owner}', '${mark}', '${info}', '${git}', '${backup}', DATE('${release}'), ${bindata}, CURRENT_DATE())`;
        mysql.execute(insert, (err) => {
            if (err) {
                message = err.message;
            }
            else {
                message = `"${title}" が追加されました。`;
            }
            res.render("projectForm", {message:message, value:value, marks:marks, medias:medias});
        });
    }
});

// データ確認
router.get("/confirmProject/:id", async (req, res) => {
    let id = req.params.id;
    let value = {
        id:id,
        album:0,
        title:"",
        version:"0.0.0",
        path:"",
        owner:"",
        mark:"",
        info:"",
        git:"",
        backup:"",
        release:"",
        bindata:0
    };
    let marks = [];
    const marklist = await mysql.query_p("SELECT DISTINCT mark FROM Projects");
    for (const r of marklist) {
        marks.push(r.mark);
    }
    let medias = [];
    const medialist = await mysql.query_p("SELECT name FROM Medias");
    for (const r of medialist) {
        medias.push(r.name);
    }
    if (!id) {
        res.render("projectForm", {message:"id が正しくありません。", value:value, marks:marks, medias:medias});
        return;
    }
    else {
        let sql = "SELECT id, album, title, `version`, path, media, `owner`, mark, info, git, `backup`, DATE_FORMAT(`release`, '%Y-%m-%d') AS `release`, bindata, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Projects WHERE id = " + id;
        mysql.getRow(sql, (err, row) => {
            if (err) {
                res.render("showInfo", {message:err.message, title:"エラー", icon:"cancel.png"});
            }
            else {
                if (row) {
                    res.render("projectForm", {message:`id=${id} が検索されました。`, value:row, marks:marks, medias:medias});
                }
                else {
                    res.render("showInfo", {message:"不正なパラメータが指定されました。", title:"エラー", icon:"cancel.png"});
                }
            }
        });
    }
});

// プロジェクトの一覧
router.get("/showContent", async (req, res) => {
    let albumName = "";
    const album = req.query.album;
    const mark = req.query.mark;
    let message = "";
    let title = "プロジェクト一覧";
    let albums = await mysql.query_p("SELECT id, name FROM Album WHERE mark='project' ORDER BY id");
    if (album) {
        albumName = await mysql.getValue_p("SELECT name FROM Album WHERE id=" + album);
    }
    const marks = await mysql.query_p("SELECT DISTINCT mark FROM Projects");
    let sortasc = "";
    let sortdesc = "";
    let sql = "SELECT * FROM Projects";
    if (album) {
        sql += ` WHERE album=${album}`;
        title += " (album: " + album + ")";
    }
    else if (mark) {
        sql += ` WHERE mark='${mark}'`;
        title += " (mark: " + mark + ")";
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
    const result = await mysql.query_p(sql);
    if (album) {
        message = "アルバム： " + albumName;
    }
    else if (mark) {
        message = "マーク： " + mark;
    }
    res.render("projectlist", {title:title, message:message, result:result, marks:marks, sortasc:sortasc, sortdesc:sortdesc, albums:albums});
});


// プロジェクト情報詳細表示
router.get("/infoView/:id", (req, res) => {
    let id = req.params.id;
    mysql.getRow("SELECT * FROM Projects WHERE id=" + id, (err, row) => {
        let version = row.version ? row.version : "0.0.0";
        let message = "Version " + row.version + "/ Release " + dto.getDateString(row.release);
        res.render("projectInfoView", {title:row.title, message:message, info:row.info});
    });
});

// ソースの表示
router.get("/showSource", (req, res) => {
    const filePath = req.query.path;
    if (filePath == undefined) {
        res.render('showInfo', {title:"エラー", message:"パラメータ (ソースの指定) が存在しません。", icon:"cancel.png"});
        return;
    }
    if (!fso.isFileSync(filePath)) {
        res.render('showInfo', {title:"エラー", message:"指定したファイルが存在しません。", icon:"cancel.png"});
        return;
    }
    let content = fs.readFileSync(filePath).toString();
    //const src = content.replace(/&/g, '&amp;').replace(/</, '&lt;').replace(/>/g, '&gt;').replace(/\\/g, '\\');
    res.render('showSource', {title:path.basename(filePath), path:filePath, content:content});
});

// エクスポート
module.exports = router;
