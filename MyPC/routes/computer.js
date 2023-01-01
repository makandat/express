/* computer.js */
'use strict';
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const upload = multer({ dest: './uploads/' });
const unzipper = require('unzipper');
const zipdir = require('zip-dir');
const tempnam = require('tempnam');
const fs = require('fs');
const os = require('os');
const path = require('path');
const iconv = require('iconv-lite');
const child_process = require('child_process');
const fso = require('./FileSystem.js');
const com = require("./Common.js");
const router = express.Router();
const OK = 200;
const NG = 500;

/* session 変数 */
// session.orderby : 表示順を名前でするか時間でするかを決める。値はそれぞれ "name" , "time"。
// session.sortdir : 表示方向を昇順か降順かを決める。値はそれぞれ "asc", "desc"。
// session.currentDir : 現在の場所 (ディレクトリ)

// フォルダ定義一覧 JSON ファイルを読む。
function getFolderList() {
    let pstr = fs.readFileSync("folders.json", "utf-8");
    let flist = JSON.parse(pstr);
    return flist;  
}

// 3桁ごとにカンマを挿入する。
function insertCommas(num) {
    return String(num).split("").reverse().join("").match(/\d{1,3}/g).join(",").split("").reverse().join("");
}

// フォルダリストを作成する。
function folderList() {
    let flist = getFolderList();
    let html = "<option>--- Select ---</option>\n";
    for (let item of flist) {
        html += (`<option>${item}</option>\n`);
    }
    return html;
}

// 現在の場所にフォルダごとへのジャンプ用リンクを埋め込む。
function embedHyperlinks(place) {
  let places = place.split('/');
  let folders = [];
  let s = "";
  for (let i = 0; i < places.length; i++) {
    s += places[i];
    if (i < places.length - 1) {
      s += "/";
    }
    folders.push(s);
  }
  let rs = "";
  for (let i = 0; i < places.length; i++) {
      if (i == 0) {
        rs += `<a href="/computer/folder?folder=${folders[i]}">${places[i]}</a>`;
      }
      else {
        rs += `<a href="/computer/folder?folder=${folders[i]}">/${places[i]}</a>`;
      }
  }
  return rs;
}


// ファイル一覧を表示する。
function showItems(dir, res, message = "") {
    if (dir == undefined || dir.startsWith('-')) {
        res.render('computer', 
          {
            "folders":folderList(),
            "result":[],
            "place":"- 表示するフォルダを指定してください。-",
            "currentDir":"",
            "hostname": os.hostname(),
            "orderbyname": "●",
            "orderbytime": "",
            "sortdirasc": "●",
            "sortdirdesc": "",
            "hiddenItems": "",
            "message": ""
          });
    }
    else {
        let resultFiles = [];
        let resultDirs = [];
        let resultSymLinks = [];
        let i = 0;
        fso.getDirectories(dir, (dirs) => {
            let row = [];
            if (com.getType(dirs) == 'string') {
                res.render('computer', 
                  {
                    "folders":folderList(),
                    "result":[dirs],
                    "place":embedHyperlinks(dir),
                    "currentDir":dir,
                    "hostname":os.hostname(),
                    "orderbyname": session.orderby == "name" ? "●" : "",
                    "orderbytime": session.orderby == "time" ? "●" : "",
                    "sortdirasc": session.sortdir == "asc" ? "●" : "",
                    "sortdirdesc": session.sortdir == "desc" ? "●" : "",
                    "hiddenItems": session.hiddenItems ? "checked" : "",
                    "message": "エラー： サブディレクトリがありません。"
                });
            }
            else {
                // サブディレクトリ
                for (let d of dirs) {
                    try {
                        d = d.replace(/\\/g, '/') + "/";
                        if (includesHidden(d, session.hiddenItems)) {
                            row.push(`<a href="javascript:copyPath(${i})">${i + 1}</a>`);
                            row.push(fso.getAttrSync(d, true, "d"));
                            row.push(`<a href="/computer/folder/?folder=${d}" id="no${i + 1}">${d}</a>`);
                            row.push("d");
                            row.push("-");
                            row.push(fso.getDateTimeSync(d, true));
                            resultDirs.push(row);
                            row = [];
                            i++;    
                        }
                    }
                    catch (err) {
                        row = [];
                    }
                }

                fso.getFiles(dir, null, (files) => {
                    // ファイル
                    try {
                        let row = [];
                        for (let f of files) {
                            f = f.replace(/\\/g, '/');
                            if (includesHidden(f, session.hiddenItems)) {
                                row.push(`<a href="javascript:copyPath(${i})">${i + 1}</a>`);
                                row.push(fso.getAttrSync(f, true, "-"));
                                row.push(`<a href="/computer/download/?file=${f}" target="_blank" id="no${i + 1}">${f}</a>`);
                                row.push("f");
                                row.push(insertCommas(fso.getSizeSync(f)));
                                row.push(fso.getDateTimeSync(f, true));
                                resultFiles.push(row);
                                row = [];
                                i++;    
                            }
                        }    
                    }
                    catch (err) {
                        row = [];
                    }
                    fso.getSymLinks(dir, (symlinks) => {
                        // Symbolic リンク
                        try {
                            let row = [];
                            for (let f of symlinks) {
                                f = f.replace(/\\/g, '/');
                                row.push(`<a href="javascript:copyPath(${i})">${i + 1}</a>`);
                                row.push(fso.getAttrSync(f, true, "l"));
                                let realPath = fs.realpathSync(f).replace(/\\/g, "/");
                                if (fso.isFileSync(realPath)) {
                                    row.push(`<a href="/computer/download/?file=${realPath}" target="_blank" id="no${i + 1}">${f} [${realPath}]</a>`);
                                }
                                else {
                                    row.push(`<a href="/computer/folder/?folder=${realPath}" id="no${i}">${f} [${realPath}]</a>`);
                                }
                                row.push("l");
                                row.push(insertCommas(fso.getSizeSync(f)));
                                row.push(fso.getDateTimeSync(f, true));
                                resultSymLinks.push(row);
                                row = [];
                                i++;
                            }    
                        }
                        catch (err) {
                            row = [];
                        }
                        let result = [];
                        if (session.orderby == "name" && session.sortdir =="asc") {
                            // 標準の場合、そのままサブディレクトリとファイルを一緒にする。
                            result = resultDirs.concat(resultFiles).concat(resultSymLinks);
                        }
                        else {
                            // サブディレクトリを並べ替え
                            resultDirs = sortRows(resultDirs, session.sortdir, session.orderby);
                            // ファイルを並べ替え
                            resultFiles = sortRows(resultFiles, session.sortdir, session.orderby);   
                            // シンボリックリンクを並べ替え
                            resultSymLinks = sortRows(resultSymLinks, session.sortdir, session.orderby);   
                            // サブディレクトリとファイルを一緒にする。
                            result = resultDirs.concat(resultFiles).concat(resultSymLinks);
                            if (result.length == 0) {
                                message = "フォルダ内に項目がありません。";
                            }
                        }
                        res.render('computer', 
                          {
                            "folders": folderList(),
                            "result": result,
                            "place": embedHyperlinks(dir),
                            "currentDir":dir,
                            "hostname": os.hostname(),
                            "orderbyname": session.orderby == "name" ? "●" : "",
                            "orderbytime": session.orderby == "time" ? "●" : "",
                            "sortdirasc": session.sortdir == "asc" ? "●" : "",
                            "sortdirdesc": session.sortdir == "desc" ? "●" : "",
                            "hiddenItems": session.hiddenItems ? "checked" : "",
                            "message": message
                          }                     
                        );
                    });
                });    
            }
        });
    }
}

// 隠しアイテムを含めるかチェック
function includesHidden(path, session) {
    let fn = fso.getFileName(path);
    if (session) {
        return true;
    }
    else {
        return !fn.startsWith(".");
    }
}

// ファイルの並べ替え
function sortRows(rows, sortdir, orderby) {
    if (orderby == 'name') {        
        rows.sort((a, b) => {
            if (sortdir == 'desc') {
                // 名前・降順
                if (a[2] < b[2]) {
                    return 1;
                }
                else if (a[2] > b[2]) {
                    return -1;
                }
                else {
                    return 0;
                }
            }
            else if (sortdir == 'asc') {
                // 名前・昇順
                if (a[2] > b[2]) {
                    return 1;
                }
                else if (a[2] > b[2]) {
                    return -1;
                }
                else {
                    return 0;
                }
            }
            else {
                return 0;
            }
        });
    }
    else if (orderby == 'time') {
        rows.sort((a, b) => {
            if (sortdir == 'desc') {
                // 時刻・降順
                if (a[5] < b[5]) {
                    return 1;
                }
                else if (a[5] > b[5]) {
                    return -1;
                }
                else {
                    return 0;
                }
            }
            else if (sortdir == 'asc') {
                // 時刻・昇順
                if (a[5] > b[5]) {
                    return 1;
                }
                else if (a[5] < b[5]) {
                    return -1;
                }
                else {
                    return 0;
                }
            }
            else {
                return 0;
            }
        });
    }
    else {
            // 何もしない
    }
    return rows;
}

// file が画像ファイルかどうかを判別する。
function isImage(file) {
    let ext = fso.getExtension(file).toLowerCase();
    return (ext == '.jpg' || ext == '.png' || ext == '.gif');
}

// file がテキストファイルかどうかを判別する。
function isText(file) {
    // ** テキストファイルの拡張子を定義 ***
    let exts = ['.txt', '.html', '.css', '.xml', '.json', '.js', '.c', '.cpp', '.py', '.pl', '.php', '.rb', '.h', '.hpp', '.java', '.log', '.ini', '.sql', '.jl', '.rs', '.toml', '.scala', '.groovy'];
    if (fso.exists('textfiles.json')) {  // textfiles.json が存在する場合は、上の exts は使用せず textfiles.json の内容に従う。
        let pstr = fs.readFileSync("textfiles.json", "utf-8");
        exts = JSON.parse(pstr);    
    }
    let ext = fso.getExtension(file).toLowerCase();
    return exts.includes(ext);
}

// テキストを表示する。
function showText(file, res, encoding) {
    if (encoding.toLowerCase() == "utf8" || encoding.toLowerCase() == "utf-8") {
        fs.readFile(file, (err, data) => {
            if (err) {
                res.render("textView", {"title": "エラー", "path":"エラー", "content": err.message});
            }
            else {
                res.render("textView", {"title": fso.getFileName(file), "path": file, "content": data});
            }
        });    
    }
    else {
        let buffer = "";
        let reader = fs.createReadStream(file)
            .pipe(iconv.decodeStream(encoding));
        reader.on("data", (chunk) => {
            buffer += chunk;
        });
        reader.on("end", () => {
            res.render("textView", {"title": fso.getFileName(file), "path": file, "content": buffer});
        });
    }
}

// 画像を表示する。
function showImage(file, res) {
    res.render('imageView', {'title':fso.getFileName(file), 'path': file});
}

// 自分のPCの状態一覧表示、コマンド実行など
router.get('/', (req, res) => {
    session.orderby = "name";
    session.sortdir = "asc";
    let result = [];
    // 初期表示
    res.render('computer', {
      "folders":folderList(), 
      "result":result,
      "place":"- 表示するフォルダを指定してください。-",
      "currentDir":"",
      "hostname":os.hostname(),
      "orderbyname": "●",
      "orderbytime": "",
      "sortdirasc": "●",
      "sortdirdesc": "",
      "hiddenItems": "",
      "message": "MyPC: 正常に起動しました。表示するフォルダを選んでください。"
    });
});

// 自分のPCの状態一覧表示、コマンド実行など
router.get('/folder', (req, res) => {
    let folder = req.query.folder.trim();
    if (folder && folder == '$') {
        // カレントディレクトリを変更しない
    }
    else if (folder == '') {
        session.currentDir = "-";
    }
    else {
        session.currentDir = folder.endsWith(":") ? folder + "/" : folder;
    }
    session.hiddenItems = req.query.hiddenItems;
    showItems(session.currentDir, res);
});

// ファイル内容表示またはダウンロード
router.get('/download', (req, res) => {
    let file = req.query.file;
    let encoding = req.query.encoding;
    if (!encoding) {
        encoding = "UTF8";
    }
    if (isImage(file)) {
        // 画像は表示
        showImage(file, res);
    }
    else if (isText(file)) {
        // テキストファイルは表示
        showText(file, res, encoding);
    }
    else {
        // その他はダウンロード
        res.download(file);
    }
});

// 名前順/時刻順に表示
router.get('/orderby/:item', (req, res) => {
  session.orderby = req.params.item;
  showItems(session.currentDir, res);
});

// ソート順の指定
router.get('/sortdir/:dir', (req, res) => {
  session.sortdir = req.params.dir;
  showItems(session.currentDir, res);
});

// ファイル操作コマンド実行 (GET)
router.get('/command', (req, res) => {
    // 初期画面を開く
    res.render('command', {});
});

// ファイル操作コマンド実行 (POST)
router.post('/command', (req, res) => {
    let cmd = req.body.command;
    if (cmd == undefined) {
        res.status(NG).send("エラー: コマンドが未定義です。").end();
        return;
    }
    let cmdtokens = getTokens(cmd);
    if (cmdtokens.length <= 1) {
        res.status(NG).send("エラー: コマンドの書式が不正です。").end();
        return;
    }
    let cmdName = cmdtokens[0];
    switch (cmdName) {
        case "rm":
            // ファイル削除
            deleteFile(cmdtokens, res);
            break;
        case "cp":
            // ファイルコピー
            copyFile(cmdtokens, res, false);
            break;
        case "mv":
            // ファイル移動
            copyFile(cmdtokens, res, true);
            break;
        case "md":
            // ディレクトリ作成
            makeDir(cmdtokens, res);
            break;
        case "rd":
            // ディレクトリ削除
            removeDir(cmdtokens, res);
            break;
        case "cm":
            // 属性変更
            changeMode(cmdtokens, res);
            break;
        case "go":
            // コマンド実行
            execCommand(cmdtokens, res);
            break;
        case "np":
            // No Operation (for Test)
            res.status(OK).send(cmd).end();
            break;
        default:
            res.status(500).send("エラー: 不正なコマンドです。").end();
            break;
    }
});

// 表示フォルダの編集 (GET)
router.get('/folderedit', (req, res) => {
    let folderList = fs.readFileSync("./folders.json");
    res.render("folderedit", {"folderList": folderList, "message": ""});
});

// 表示フォルダの編集 (POST)
router.post('/folderedit', (req, res) => {
    let data = req.body.editor;
    try {
        JSON.parse(data);
        fs.writeFileSync("./folders.json", data);
        res.render("folderedit", {"folderList": data, "message": "表示フォルダ一覧を更新しました。"});   
    }
    catch (err) {
        res.render("folderedit", {"folderList": data, "message": "データの形式が間違っています。正確な JSON 形式で記述する必要があります。"});
    }
});

// ファイル編集 (GET)
router.get('/textEditor', (req, res) => {
    res.render('textEditor', {'content':"", 'path':"", 'message':""});
});

// ファイル編集 (POST)
router.post('/textEditor', (req, res) => {
    let content = req.body.content;
    let path = req.body.path;
    if (req.body.update) {
        // ファイル更新または新規作成
        fs.writeFile(path, content, (err) => {
            if (err) {
                res.render('textEditor', {'path':path, 'content':"", 'message':"エラー: " + err.message});    
            }
            else {
                let fileName = fso.getFileName(path);
                res.render('textEditor', {'path':path, 'content':content, 'message':`${fileName}が更新または作成されました。`});    
            }
        });
    } else if (req.body.read) {
        // ファイル読み込み
        fs.readFile(path, (err, data) => {
            if (err) {
                res.render('textEditor', {'path':path, 'content':"", 'message':"エラー: " + err.message});    
            }
            else {
                let fileName = fso.getFileName(path);
                res.render('textEditor', {'path':path, 'content':data, 'message':`${fileName}が読み込まれました。`});    
            }
        });
    }
    else {
        // ありえないケース
    }
});

// 画像データを送る。
router.get('/image', (req, res) => {
    let file = req.query.path;
    res.sendFile(file);
});

// ファイルデータを送る。（ダウンロードする)
router.get('/getfile', (req, res) => {
    fs.readFile(req.query.path, (err, data) => {
        if (!err) {
            let fileName = encodeURIComponent(fso.getFileName(req.query.path));
            res.set({'Content-Disposition': `attachment; filename=${fileName}`});
            res.status(OK).send(data);    
        }
        else {
            res.status(NG);
        }
    });
});

// ファイルアップロード
router.post('/upload', upload.single('uploadFile'), (req, res) => {
    let path = req.file.path;
    let target = session.currentDir + "/" + req.file.originalname;
    fs.copyFile(path, target, fs.constants.COPYFILE_EXCL, () => {
        showItems(session.currentDir, res, req.file.originalname + "をアップロードしました。");
        fs.unlinkSync(path);
    });
});


/****** Helper Functions *******/
// コマンドをトークンに分解する。
function getTokens(cmd) {
    let parts = cmd.split(/\s+/g);
    if (parts.length <= 0)
        return null;
    let cmdcode = parts[0];
    let re = /".+"/g;
    if (re.test(cmd)) {
        // 空白を含むパス名がある。
        let whitepaths = re.exec(cmd);
        let tokens = [];
        if (whitepaths.length == 2) {
            // オペランドが2つでどちらも引用符で囲まれている。
            tokens.push(cmdcode);
            tokens.push(whitepaths[0]);
            tokens.push(whitepaths[1]);
        } else if (whitepaths.length == 2 && cmd.endsWith('"') == true) {
            // オペランドが2つで２つめが引用符で囲まれている。
            tokens.push(cmdcode);
            tokens.push(parts[1]);
            tokens.push(whitepaths[0]);

        } else if (whitepaths.length == 2 && cmd.endsWith('"') == false) {
            // オペランドが2つで１つめが引用符で囲まれている。
            tokens.push(cmdcode);
            tokens.push(whitepaths[0]);
            let parts = cmd.split(/"/g);
            let operand = parts[parts.length-1].trim();
            tokens.push(operand);
        } else if (whitepaths.length == 1) {
            // オペランドが１つで引用符で囲まれている。
            tokens.push(cmdcode);
            tokens.push(whitepaths[0]);
        }
        else {
            // 存在しないケース
        }
    }
    else {
        // 空白を含むパス名がない。
        return parts;
    }
}

// ファイル削除
function deleteFile(cmdtokens, res) {
    let path = cmdtokens[1];
    if (fso.isFileSync(path)) {
        fs.unlinkSync(path);
        res.status(OK).send("rm OK.").end();
    }
    else {
        res.status(NG).send("NG").end();
    }
}

// ファイルコピー / 移動
function copyFile(cmdtokens, res, optMove = false) {
    if (cmdtokens.length != 3) {
        res.status(NG).send("NG").end();
        return;
    }
    if (!fso.isFileSync(cmdtokens[1])) {
        res.status(NG).send("NG").end();
        return;
    }
    fs.copyFile(cmdtokens[1], cmdtokens[2], () => {
        if (optMove) {
            fs.unlinkSync(cmdtokens[1]);
        }
        res.status(OK).send("cp/mv OK.").end();
    });
}

// ディレクトリ作成
function makeDir(cmdtokens, res) {
    let path = cmdtokens[1];
    fs.mkdir(path, {'recursive':true}, (err) => {
        if (err) {
            res.status(NG).send("NG").end();
        }
        else {
            res.status(OK).send("md OK.").end();
        }
    });
}

// ディレクトリ削除
function removeDir(cmdtokens, res) {
    let path = cmdtokens[1];
    fs.rmdir(path, (err) => {
        if (err) {
            res.status(NG).send("NG").end();
        }
        else {
            res.status(OK).send("rd OK.").end();
        }
    });  
}

// 属性変更
function changeMode(cmdtokens, res) {
    let mode = cmdtokens[1];
    let path = cmdtokens[2];
    fs.chmod(path, mode, (err) => {
        if (err) {
            res.status(NG).send("NG").end();
        }
        else {
            res.status(OK).send("cm OK.").end();
        }
    });
}

// コマンド実行
function execCommand(cmdtokens, res) {
    let commandFile = cmdtokens[1];
    let args = cmdtokens.slice(2);
    if (cmdtokens.length <= 2) {
        child_process.execFile(commandFile, (err, stdout, stderr) => {
            if (err) {
                res.status(NG).send("NG").end();
            }
            else {
                res.status(OK).send("go OK.").end();
            }
        });    
    }
    else {
        child_process.execFile(commandFile, args, (err, stdout, stderr) => {
            if (err) {
                res.status(NG).send("NG").end();
            }
            else {
                res.status(OK).send("go OK.").end();
            }
        });    
    }
}

// 圧縮ファイルフォーム (GET)
router.get("/zipfile", (req, res) => {
    res.render("zipfile", {message:"", folder:""});
});

// 圧縮ファイルフォーム (POST)
router.post("/zipfile", upload.single('uploadFile'), async (req, res) => {
    let ope = req.body.ope;  // 圧縮か解凍か
    let folder = req.body.folder.replace(/\\/g, "/");  // 圧縮するフォルダまたは解凍先のフォルダ
    if (!folder) {
        res.render("zipfile", {message:"エラー：フォルダの指定がありません。", folder:""});
        return;
    }
    if (ope == "inflate") {
        // アップロードされたファイルを解凍する。
        let path = req.file.path;
        let target = folder + "/" + req.file.originalname;
        fs.copyFile(path, target, fs.constants.COPYFILE_EXCL, () => {
            // 解凍する。
            fs.createReadStream(target).pipe(unzipper.Extract({path: folder}));
            // 不要になった圧縮ファイルを削除
            fs.unlinkSync(path);
            res.render("zipfile", {message:`${req.file.originalname} を ${folder} に解凍しました。`, folder:folder});
        });
    }
    else if (ope == "deflate") {
        // フォルダを圧縮してダウンロードする。
        let buffer = await zipdir(folder);
        zipdir(folder, (err, buffer) => {
            let temp;
            let tmpdir = (path.dirname(__dirname) + "/tmp").replace(/\\/g, "/");
            tempnam.tempnam(tmpdir, "mypc_", (err, fileName) => {
                let zipFile = fileName + ".zip";
                fs.writeFile(zipFile, buffer, () => {
                    res.render("zipfile", {message:`OK: <a href="/download?path=${zipFile}">ダウンロード</a>`, folder:""});
                });
            });
        });
    }
    else {
        // ラジオボタンがどちらもチェックされていない場合
        res.render("zipfile", {message:"エラー：操作の指定がありません。", folder:""});
    }
});


//  ~~~~~~~~~~~~~~~~~~~~~~~
//  ルータをエクスポートする。
//  ~~~~~~~~~~~~~~~~~~~~~~~
module.exports = router;
