/* Common.js  v1.1 */
'use strict';
const os = require('os');
const util = require('util');

/* コマンドライン引数を得る。*/
exports.getArg = (n) => {
  let count = process.argv.length;
  if (count < 2) {
    return '';
  }

  let args = [];
  for (let i = count - 1; i > 0; i--) {
    if (process.argv[i].endsWith('.js')) {
      break;
    }
    else {
      args.push(process.argv[i]);
    }
  }

  let a = args.reverse();
  if (n < 0 && n >= a.length) {
    return null;
  }
  return a[n];
}


/* コマンドライン引数の数を得る。*/
exports.getArgsCount = () => {
  let count = process.argv.length;
  for (let i = count - 1; i > 0; i--) {
    if (process.argv[i].endsWith('.js')) {
      count = count - i - 1;
    }
  }

  return count;
}

/* フォーマットして出力 */
exports.printf = (format, ...y) => {
  console.log(util.format(format, ...y));
}

/* 文字列を整数にする */
exports.toInt = (s, base = 10) => {
  return parseInt(s, base);
}

/* オブジェクトを文字列にする */
exports.toStr = (i) => {
  return i.toString();
}

/* OS が Windows なら true */
exports.isWindows = () => {
  return (os.platform == 'win32');
}

/* プログラムの終了 */
exports.quit = (code = 0, message = null) => {
  if (message != null) {
    console.error(message);
  }
  process.exit(code);
}

/* 変数の型を文字列で返す。*/
exports.getType = (x) => {
  return typeof(x);
}

