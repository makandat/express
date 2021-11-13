/* Private JS Library */

// URL エスケープ
function escUrl(str) {
    str = str.replace(/\s/g, "%20");
    str = str.replace(/#/g, "%23");
    str = str.replace(/\$/g, "%24");
    str = str.replace(/%/g, "%25");
    str = str.replace(/&/g, "%26");
    str = str.replace(/\+/g, "%2B");
    str = str.replace(/\?/g, "%3F");
    return str;
}

// id, type (index) で指定したエレメントを取得する。
function elem(id, type="i", index=0) {
  var el = null;
  switch (type) {
    case "i":  // id
      el = document.getElementById(id);
      break;
    case "n":  // name
      el = document.getElementsByName(id)[index];
      break;
    case "c":  // class
      el = document.getElementsByClassName(id)[index];
      break;
    case "t":  // tag
      el = document.getElementsByTagName(id)[index];
      break;
    default:  // id
      el = document.getElementById(id);
      break;
  }
  return el;
}

// 要素の値を得る。
function getElValue(id) {
  if (typeof id == 'string') {
    if (elem(id).value == undefined) {
      return elem(id).innerText;
    }
    else {
      return elem(id).value;
    }
  }
  else if (typeof id == 'object') {
    if (id.value == undefined) {
      return id.innerText;
    }
    else {
      return id.value;
    }
  }
  else {
    return undefined;
  }
}

// 要素の値を設定する。。
function setElValue(id, value, escape=true) {
  if (typeof id == 'string') {
    if (elem(id).value == undefined) {
      if (escape) {
        if (value == null) {
          elem(id).innerText = "null";
        }
        else {
          elem(id).innerText = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
      }
      else {
        elem(id).innerHTML = value;
      }
    }
    else {
      elem(id).value = value;
    }
  }
  else if (typeof id == 'object') {
    if (id.value == undefined) {
      if (escape) {
        id.innerText = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
      else {
        id.innerHTML = value;
      }
    }
    else {
      id.value = value;
    }
  }
  else {
    // 何もしない。
  }
}

// HTML文字列をタグの前後に挿入する。
function insertElHTML(id, html, position=0) {
  let el = id;
  if (typeof id == 'string') {
    el = elem(id);
  }
  switch (position) {
    case 0:
      el.insertAdjacentHTML('beforebegin', html);  // 開始タグの直前
      break;
    case 1:
      el.insertAdjacentHTML('afterbegin', html);  // 開始タグの直後
      break;
    case 2:
      el.insertAdjacentHTML('beforeend', html);   // 終了タグの直前
      break;
    case 3:
      el.insertAdjacentHTML('afterend', html);   // 終了タグの直後
      break;
    default:
      break;
  }
}

// 要素を作成する。
function addEl(tag) {
  return document.createElement(tag);
}

// 子要素を作成する。
function addChild(parent, child) {
  return parent.appendChild(child);
}


// 要素の属性を得る。
function getElAttr(id, attr) {
  let el = id;
  if (typeof el == 'string') {
    el = elem(id);
  }
  return el.getAttribute(attr);
}

// 要素の属性を設定する。
function setElAttr(id, attr, value) {
  let el = id;
  if (typeof el == 'string') {
    el = elem(id);
  }
  el.setAttribute(attr, value);
}

// 要素の属性を削除する。
function dropElAttr(id, attr) {
  let el = id;
  if (typeof el == 'string') {
    el = elem(id);
  }
  el.removeAttribute(attr);
}


// 指定した URL から GET/POST メソッドでテキストを得る。
function fetchText(url, data, method, callback) {
  if (method == 'GET') {
    let param = "?";
    Object.keys(data).forEach((key) => {
      if (param != '?') {
        param += '&';
      }
      param += `${key}=${data[key]}`;
    });
    fetch(url + param)
    .then(res => res.text())
    .then(text => callback(null, text))
    .catch(err => callback(err, null));
  }
  else if (method == 'POST') {
    fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)})
    .then(res => res.text())
    .then(text => callback(null, text))
    .catch(err => callback(err, null));
  }
  else {
    // 他のメソッドはサポートしない
  }
}


// 指定した URL から GET/POST メソッドで JSON を得る。
function fetchJSON(url, data, method, callback) {
  if (method == 'GET') {
    let param = "?";
    Object.keys(data).forEach((key) => {
      if (param != '?') {
        param += '&';
      }
      param += `${key}=${data[key]}`;
    });
    fetch(url + param)
    .then(res => res.json())
    .then(data => callback(null, data))
    .catch(err => callback(err, null));
  }
  else if (method == 'POST') {
    fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)})
    .then(res => res.json())
    .then(data => callback(null, data))
    .catch(err => callback(err, null));
  }
  else {
    // 他のメソッドはサポートしない
  }
}


// 指定した URL から GET/POST メソッドで BLOB (画像など) を得る。
function fetchBLOB(url, data, method, callback) {
  if (method == 'GET') {
    let param = "?";
    Object.keys(data).forEach((key) => {
      if (param != '?') {
        param += '&';
      }
      param += `${key}=${data[key]}`;
    });
    fetch(url + param)
    .then(res => res.blob())
    .then(blob => callback(null, window.URL.createObjectURL(blob)))
    .catch(err => callback(err, null));
  }
  else if (method == 'POST') {
    fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)})
    .then(res => res.blob())
    .then(blob => callback(null,  window.URL.createObjectURL(blob)))
    .catch(err => callback(err, null));
  }
  else {
    // 他のメソッドはサポートしない
  }
}

// 指定した URL から GET/POST メソッドで ArrayBuffer (純粋なバイナリー配列) を得る。
function fetchArrayBuffer(url, data, method, callback) {
  if (method == 'GET') {
    let param = "?";
    Object.keys(data).forEach((key) => {
      if (param != '?') {
        param += '&';
      }
      param += `${key}=${data[key]}`;
    });
    fetch(url + param)
    .then(res => res.arrayBuffer())
    .then(buffer => callback(null, buffer))
    .catch(err => callback(err, null));
  }
  else if (method == 'POST') {
    fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)})
    .then(res => res.arrayBuffer())
    .then(buffer => callback(null,  buffer))
    .catch(err => callback(err, null));
  }
  else {
    // 他のメソッドはサポートしない
  }
}


// フォームをポストする。
//  (input[type="file"] を含む enctype="multipart/form-data" 指定のフォームも可能)
function postFormData(url, form, callback) {
  const formData = new FormData(form);
  fetch(url, {method:'POST', body:formData})
  .then(res => res.json())
  .then(data => callback(null, data))
  .catch(err => callback(err, null));
}

// JSONデータをポストする。
function postJSON(url, data, callback) {
  fetch(url, {"method":"POST", "headers":{"Content-Type":"application/json"}, "body":JSON.stringify(data)})
  .then(res => res.json())
  .then(data => callback(null, data))
  .catch(err => callback(err, null));
}


// click イベントハンドラを追加する。
function clickEvent(id, callback) {
  let el = id;
  if (typeof id == 'string') {
    el = elem(id);
  }
  el.addEventListener('click', callback);
}

// change イベントハンドラを追加する。
function changeEvent(id, callback) {
  let el = id;
  if (typeof id == 'string') {
    el = elem(id);
  }
  el.addEventListener('change', callback);
}
