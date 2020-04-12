delimiter //
-- Pictures の指定した id の行を PicturesHcg に挿入する。
CREATE PROCEDURE InsertPictHcg(IN pid INT)
BEGIN
  DECLARE last INT;
  SELECT MAX(sn) INTO last FROM PicturesHcg;
  INSERT INTO PicturesHcg SELECT * FROM Pictures WHERE id = pid;
  SET last = last + 1;
  UPDATE PicturesHcg SET sn = last WHERE id = pid;
END
//
delimiter ;
