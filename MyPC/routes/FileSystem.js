/* FileSystem.js v1.5.1 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');



/* (ローカル関数) ext が配列 exts の要素に含まれていれば true、そうでなければ false を返す。*/
function testExtension(ext, exts) {
  for (let i = 0; i < exts.length; i++) {
    if (exts[i] == ext)
      return true;
  }
  return false;
}


/* フォルダ内のファイル一覧を得る。*/
/*  dir は対象のディレクトリ */
/*  exts は拡張子一覧(配列)  (例) ['.jpg', '.jpeg', '.JPG', '.JPEG'], null の場合は拡張子の指定なしとみなす。 */
/*  callback はファイルパスの一覧(配列)を受け取るコールバック関数 */
exports.getFiles = async (dir, exts, callback) => {
  if (! fs.existsSync(dir))
    callback([]);
  let files = [];
  fs.readdir(dir, {'withFileTypes': true}, (err, items) => {
    if (err) {
      callback(err.message);
    }
    else {
      for (let item of items) {
        let ext = path.extname(item.name);
        if (exts == null) {
          if (item.isFile()) {
            files.push(path.join(dir, item.name));
          }
        }
        else {
          if (item.isFile() && testExtension(ext, exts)) {
            files.push(path.join(dir, item.name));
          }
        }
      }
      callback(files);
    }
  });
}


/* フォルダ内のファイル一覧を得る。*/
/*  dir は対象のディレクトリ */
/*  exts は拡張子一覧(配列)  (例) ['.jpg', '.jpeg', '.JPG', '.JPEG'], null の場合は拡張子の指定なしとみなす。 */
exports.getFiles_p = async (dir, exts) => {
  if (! fs.existsSync(dir))
    return;
  let files = [];
  let prom_items = await fs.promises.readdir(dir, {'withFileTypes': true});
  return new Promise((resolve, reject) =>{
    for (let item of prom_items) {
      let ext = path.extname(item.name);
      if (exts == null) {
        if (item.isFile()) {
          files.push(path.join(dir, item.name));
        }
      }
      else {
        if (item.isFile() && testExtension(ext, exts)) {
          files.push(path.join(dir, item.name));
        }
      }
    }
    resolve(files);
  });
}

/* フォルダ内のサブディレクトリ一覧を得る。*/
/*  dir は対象のディレクトリ */
/*  callback はディレクトリパスの一覧(配列)を受け取るコールバック関数 */
exports.getDirectories = (dir, callback) => {
  if (! fs.existsSync(dir))
    callback([]);
  let dirs = [];
  fs.readdir(dir, {'withFileTypes': true}, (err, items) => {
    if (err) {
      callback(err.message);
    }
    else {
      for (let item of items) {
        if (item.isDirectory()) {
          dirs.push(path.join(dir, item.name));
        }
      }
      callback(dirs);
    }
  });
}

/* フォルダ内のサブディレクトリ一覧を得る。*/
/*  dir は対象のディレクトリ */
exports.getDirectories_p = async (dir) => {
  if (! fs.existsSync(dir))
    return;
  let prom_items = await fs.promises.readdir(dir, {'withFileTypes': true});
  return new Promise((resolve, reject) => {
    let dirs = [];
    for (let item of prom_items) {
      if (item.isDirectory()) {
        dirs.push(path.join(dir, item.name));
      }
    }
    resolve(dirs);
  });
}

/* フォルダ内のシンボリックリンク一覧を得る。*/
/*  dir は対象のディレクトリ */
exports.getSymLinks = (dir, callback) => {
  let dirs = [];
  fs.readdir(dir, {'withFileTypes': true}, (err, items) => {
    if (err) {
      callback(err.message);
    }
    else {
      for (let item of items) {
        if (item.isSymbolicLink()) {
          dirs.push(path.join(dir, item.name));
        }
      }
      callback(dirs);
    }
  });
}

/* フォルダ内のシンボリックリンク一覧を得る。(Promiseバージョン) */
/*  dir は対象のディレクトリ */
exports.getSymLinks_p = async (dir) => {
  let prom_items = await fs.promises.readdir(dir, {'withFileTypes': true});
  return new Promise((resolve, reject) => {
    let dirs = [];
    for (let item of prom_items) {
      if (item.isSymbolicLink()) {
        dirs.push(path.join(dir, item.name));
      }
    }
    resolve(dirs);
  });
}

/* 再帰的にディレクトリをスキャンする。*/
exports.readdirRecursively = async (dir, files=[]) => {
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

/* パスがディレクトリか判別する。*/
/*   callback はブール値を受け取るコールバック関数 */
exports.isDir = async (path, callback) => {
  let prom_stat = await fs.promises.stat(path);
  callback(prom_stat.isDirectory());
}

/* 同期・パスがディレクトリか判別する。*/
exports.isDirSync = (path) => {
  try {
    let st = fs.statSync(path);
    return st.isDirectory();  
  }
  catch (e) {
    return false;
  }
};

/* パスがファイルか判別する。*/
/*   callback はブール値を受け取るコールバック関数 */
exports.isFile = async (path, callback) => {
  let prom_stat = await fs.promises.stat(path);
  callback(prom_stat.isFile());
};

/* 同期・パスがファイルか判別する。*/
exports.isFileSync = (path) => {
  try {
    let st = fs.statSync(path);
    return st.isFile();  
  }
  catch (e) {
    return false;
  }
};

/* パスがSymbolicリンクか判別する。　*/
exports.isLink = async (path, callback) => {
  let prom_stat = await fs.promises.lstat(path);
  callback(prom_stat.isSymbolicLink());
};

/* 同期・パスがSymbolicリンクか判別する。　*/
exports.isLinkSync = (path) => {
  let st = fs.lstatSync(path);
  return st.isSymbolicLink();
};

/* Symbolic リンクのリンク先を得る。*/
exports.getLinkValue = async (path) => {
  let link = await fs.fsPromises.readlink(path);
  return link;
};

/* 同期・パスが存在するか判別する。*/
exports.exists = (path) => {
  let b = true;
  try {
    fs.accessSync(path);
  }
  catch (e) {
    b = false;
  }
  return b;
};

/* ファイルサイズを得る。*/
/*   callback はファイルサイズ(BigInt)を受け取るコールバック関数 */
exports.getSize = async (path, callback) => {
  let prom_stat = await fs.promises.stat(path, true);
  callback(prom_stat.size);
};

/* 同期・ファイルサイズ(BigInt)を得る。*/
exports.getSizeSync = (path) => {
  let st = fs.statSync(path, true);
  return st.size;
};

/* ファイル・ディレクトリの更新日時を得る。*/
/*   callback は更新日時を受け取るコールバック関数 */
/*   optstr は false なら Date 型で、true なら String で結果を返す。*/
exports.getDateTime = async (path, callback, optstr = false) => {
  let prom_stat = await fs.promises.stat(path);
  let time = prom_stat.mtime;
  if (optstr) {
    let sdate = `${time.getFullYear()}-${(time.getMonth()+1).toString().padStart(2, '0')}-${time.getDate().toString().padStart(2, '0')}`;
    let stime = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
    callback(sdate + " " + stime);
  }
  else {
    callback(time);
  }
};

/* 同期・ファイル・ディレクトリの更新日時を得る。*/
/*   optstr は false なら Date 型で、true なら String で結果を返す。*/
exports.getDateTimeSync = (path, optstr = false) => {
  let st = fs.statSync(path);
  let time = st.mtime;
  if (optstr) {
    let sdate = `${time.getFullYear()}-${(time.getMonth()+1).toString().padStart(2, '0')}-${time.getDate().toString().padStart(2, '0')}`;
    let stime = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
    return sdate + " " + stime;
  }
  else {
    return time;
  }
};

/* ファイルの属性を得る。　*/
/* optstr が true なら UNIX 形式の文字列としてファイル属性を返す。そうでなければ数として返す。*/
exports.getAttr = async (path, callback, optstr = false) => {
  let st = await fs.promises.lstat(path);
  if (st.isSymbolicLink()) {
    st = await fs.promises.lstat(path);
  }
  else {
    st = await fs.promises.stat(path);
  }
  if (optstr) {
    callback(translateMode(st.mode));
  }
  else {
    callback(st.mode);
  }
};

/* 同期・ファイルの属性を得る。　*/
exports.getAttrSync = (path, optstr = false, pre = "") => {
  let st = fs.lstatSync(path);
  if (st.isSymbolicLink()) {
    st = fs.lstatSync(path);
  }
  else {
    st = fs.statSync(path);
  }
  if (optstr) {
    return translateMode(st.mode, pre);
  }
  else {
    return st.mode;
  }
};

/* ファイル属性を UNIX 風の文字列で表す。*/
let translateMode = (mode, pre="") => {
  let strmode = "";
  if (mode & 0o1) {
    strmode = "x" + strmode;
  }
  else {
    strmode = "-" + strmode;
  }
  if (mode & 0o2) {
    strmode = "w" + strmode;
  }
  else {
    strmode = "-" + strmode;
  }
  if (mode & 0o4) {
    strmode = "r" + strmode;
  }
  else {
    strmode = "-" + strmode;
  }
  if (mode & 0o10) {
    strmode = "x" + strmode;
  }
  else {
    strmode = "-" + strmode;
  }
  if (mode & 0o20) {
    strmode = "w" + strmode;
  }
  else {
    strmode = "-" + strmode;
  }
  if (mode & 0o40) {
    strmode = "r" + strmode;
  }
  else {
    strmode = "-" + strmode;
  }
  if (mode & 0o100) {
    strmode = "x" + strmode;
  }
  else {
    strmode = "-" + strmode;
  }
  if (mode & 0o200) {
    strmode = "w" + strmode;
  }
  else {
    strmode = "-" + strmode;
  }
  if (mode & 0o400) {
    strmode = "r" + strmode;
  }
  else {
    strmode = "-" + strmode;
  }
  strmode = pre + strmode;

  return strmode;
};

/* パスの拡張子を得る。同期関数 */
exports.getExtension = (p) =>{
  return path.extname(p);
};

/* パスのディレクトリ部分を得る。同期関数 */
exports.getDirectory = (p) => {
  return path.dirname(p);
};

/* パスのファイル部分を得る。同期関数 */
exports.getFileName = (p) => {
  return path.basename(p);
};

/* ホームディレクトリ 同期関数 */
exports.getHome = () => {
  return os.homedir();
};

/* 一時ディレクトリ 同期関数 */
exports.getTemp = () => {
  return os.tmpdir();
};


/* テキストファイルの読み込み */
exports.readFileSync = (path) => {
    return fs.readFileSync(path).toString();
}

/* テキストファイルの書き込み */
exports.writeFileSync = (path, content) => {
    return fs.writeFileSync(path, content);
}
