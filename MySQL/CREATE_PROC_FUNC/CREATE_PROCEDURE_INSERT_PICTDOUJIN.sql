delimiter //
-- Pictures の指定した id の行を PicturesDoujin に挿入する。
CREATE PROCEDURE InsertPictDoujin(IN pid INT)
BEGIN
  DECLARE last INT;
  SELECT MAX(sn) INTO last FROM PicturesDoujin;
  INSERT INTO PicturesDoujin SELECT * FROM Pictures WHERE id = pid;
  SET last = last + 1;
  UPDATE PicturesDoujin SET sn = last WHERE id = pid;
END
//
delimiter ;
