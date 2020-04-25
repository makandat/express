delimiter //
-- データ1行挿入直後にPictureAlbum テーブルの次の sn を返す。(id が連続していること)
CREATE FUNCTION user.NextPictureAlbumSN() RETURNS INT
BEGIN
  DECLARE xmaxid INT;
  DECLARE xsn INT;

  SELECT max(id) INTO xmaxid FROM user.PictureAlbum;
  IF xmaxid IS NULL THEN
    SET xsn = 1;
  ELSE
    SELECT sn + 1 INTO xsn FROM user.PictureAlbum WHERE id = xmaxid;
  END IF;
  RETURN xsn;
END
//
delimiter ;
