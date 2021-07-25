# MyPC について
このアプリケーションは、node.js/Express4 で動作します。
また、データベースとして MySQL or MariaDB を使用しています。
MyPC は家庭で主に使用しているデスクトップ機あるいは大容量ディスクが接続されたサーバー機のデータを Chrome Book など低性能なマシンで利用するために使用します。
家庭内 LAN を使用して Chrome Book などでサーバーのファイルを便利に使うために作成しました。

# インストール
1. 次のコマンドでダウンロードします。
  git clone https://github.com/makandat/express

2. express フォルダには MyPC 以外のサブフォルダがありますが、不要なので削除します。

3. 次のコマンドで必要なモジュールをインストールします。
  npm install

4. MySQL クライアントを起動して create_tables.sql を実行します。(create_tables.sql と同じフォルダで実行します)
  mysql> \. create_tables.sql
    （注意） MySQL ユーザは 'user' となっているので必要なら環境に応じて SQL ファイルを変更します。

5. MyPC/mysql.json を編集してパスワードを設定します。(必要ならユーザ名も)

6. MyPC/folders.json を環境に合わせて変更します。

7. 必要なら MyPC/textfiles.json を編集します。このファイルはテキストファイルとして扱う拡張子を指定します。

# 実行
 Windows ならコマンドプロンプトまたは PowerShell を開いて MyPC フォルダへ移動し、runMyPC.bat を実行します。
 Linux ならシェルで MyPC フォルダへ移動し、run を実行します。
 ブラウザで http://url:3300 を開きます。ただし、url は MyPC を実行しているマシンの URL です。


