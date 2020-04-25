delimiter //
-- データ1行挿入直前にPictures テーブルの次の sn を返す。(id が連続していること)
CREATE FUNCTION user.NextPicturesSN() RETURNS INT
BEGIN
  DECLARE xmaxid INT;
  DECLARE xsn INT;

  SELECT max(id) INTO xmaxid FROM user.Pictures;
  IF xmaxid IS NULL THEN
    SET xsn = 1;
  ELSE
    SELECT sn + 1 INTO xsn FROM user.Pictures WHERE id = xmaxid;
  END IF;
  RETURN xsn;
END
//
delimiter ;
