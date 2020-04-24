delimiter //
CREATE PROCEDURE user.IncreaseVideoFav(IN pid INT)
BEGIN
  DECLARE xfav INT;
  SELECT fav INTO xfav FROM user.Videos WHERE id = pid;
  SET xfav = xfav + 1;
  UPDATE user.Videos SET fav = xfav WHERE id = pid;
END
//
delimiter ;
