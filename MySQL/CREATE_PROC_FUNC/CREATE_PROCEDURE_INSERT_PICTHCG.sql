delimiter //
-- Pictures の指定した id の行を PicturesHcg に挿入する。
CREATE PROCEDURE user.InsertPictHcg(IN pid INT)
BEGIN
  DECLARE last INT;
  SELECT MAX(sn) INTO last FROM PicturesHcg;
  INSERT INTO user.PicturesHcg SELECT * FROM user.Pictures WHERE id = pid;
  SET last = last + 1;
  UPDATE user.PicturesHcg SET sn = last WHERE id = pid;
END
//
delimiter ;
