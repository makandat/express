delimiter //
CREATE PROCEDURE user.IncreaseFav(IN pid INT, IN subTable VARCHAR(20))
BEGIN
  DECLARE xfav INT;

  SELECT fav INTO xfav FROM user.Pictures WHERE id = pid;
  SET xfav = xfav + 1;
  UPDATE user.Pictures SET fav = xfav WHERE id = pid;

  IF subTable = 'PicturesManga' THEN
    SELECT fav INTO xfav FROM user.PicturesManga WHERE id = pid;
    SET xfav = xfav + 1;
    UPDATE user.PicturesManga SET fav = xfav WHERE id = pid;
  ELSEIF subTable = 'PicturesHcg' THEN
    SELECT fav INTO xfav FROM user.PicturesHcg WHERE id = pid;
    SET xfav = xfav + 1;
    UPDATE user.PicturesHcg SET fav = xfav WHERE id = pid;
  ELSEIF subTable = 'PicturesDoujin' THEN
    SELECT fav INTO xfav FROM user.PicturesDoujin WHERE id = pid;
    SET xfav = xfav + 1;
    UPDATE user.PicturesDoujin SET fav = xfav WHERE id = pid;
  ELSEIF subTable = 'PicturesPixiv' THEN
    SELECT fav INTO xfav FROM user.PicturesPixiv WHERE id = pid;
    SET xfav = xfav + 1;
    UPDATE user.PicturesPixiv SET fav = xfav WHERE id = pid;
  ELSEIF subTable = 'PicturesPhoto' THEN
    SELECT fav INTO xfav FROM user.PicturesPhoto WHERE id = pid;
    SET xfav = xfav + 1;
    UPDATE user.PicturesPhoto SET fav = xfav WHERE id = pid;
  END IF;
END
//
delimiter ;
