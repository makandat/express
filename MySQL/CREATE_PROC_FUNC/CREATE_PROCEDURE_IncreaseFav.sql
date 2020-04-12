delimiter //
CREATE PROCEDURE IncreaseFav(IN pid INT)
BEGIN
  DECLARE xfav INT;
  SELECT fav INTO xfav FROM user.Pictures WHERE id = pid;
  SET xfav = xfav + 1;
  UPDATE user.Pictures SET fav = xfav WHERE id = pid;
END
//
delimiter ;
