-- Pixiv3 と BINDATA でタイトルが同じものの id を求める。
SELECT B.id, P.id FROM BINDATA B INNER JOIN Pixiv3 P ON B.title = P.Title;
