delimiter //
-- Pictures の指定した id の行を PicturesManga に挿入する。
CREATE PROCEDURE InsertPictManga(IN pid INT)
BEGIN
  DECLARE last INT;
  SELECT MAX(sn) INTO last FROM PicturesManga;
  INSERT INTO PicturesManga SELECT * FROM Pictures WHERE id = pid;
  SET last = last + 1;
  UPDATE PicturesManga SET sn = last WHERE id = pid;
END
//
delimiter ;
