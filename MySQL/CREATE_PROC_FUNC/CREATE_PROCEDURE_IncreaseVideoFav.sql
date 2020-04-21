delimiter //
CREATE PROCEDURE IncreaseVideoFav(IN pid INT)
BEGIN
  DECLARE xfav INT;
  SELECT fav INTO xfav FROM Videos WHERE id = pid;
  SET xfav = xfav + 1;
  UPDATE Videos SET fav = xfav WHERE id = pid;
END
//
delimiter ;
