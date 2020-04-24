delimiter //
-- Pictures の指定した id の行を PicturesDoujin に挿入する。
CREATE PROCEDURE user.InsertPictDoujin(IN pid INT)
BEGIN
  DECLARE last INT;
  SELECT MAX(sn) INTO last FROM user.PicturesDoujin;
  INSERT INTO user.PicturesDoujin SELECT * FROM user.Pictures WHERE id = pid;
  SET last = last + 1;
  UPDATE user.PicturesDoujin SET sn = last WHERE id = pid;
END
//
delimiter ;
