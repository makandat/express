delimiter //
CREATE PROCEDURE IncreaseFav(IN pid INT, IN subTable VARCHAR(20))
BEGIN
  DECLARE xfav INT;

  SELECT fav INTO xfav FROM Pictures WHERE id = pid;
  SET xfav = xfav + 1;
  UPDATE Pictures SET fav = xfav WHERE id = pid;

  IF subTable = 'PicturesManga' THEN
    SELECT fav INTO xfav FROM PicturesManga WHERE id = pid;
    SET xfav = xfav + 1;
    UPDATE PicturesManga SET fav = xfav WHERE id = pid;
  ELSEIF subTable = 'PicturesHcg' THEN
    SELECT fav INTO xfav FROM PicturesHcg WHERE id = pid;
    SET xfav = xfav + 1;
    UPDATE PicturesHcg SET fav = xfav WHERE id = pid;
  ELSEIF subTable = 'PicturesDoujin' THEN
    SELECT fav INTO xfav FROM PicturesDoujin WHERE id = pid;
    SET xfav = xfav + 1;
    UPDATE PicturesDoujin SET fav = xfav WHERE id = pid;
  ELSEIF subTable = 'PicturesPixiv' THEN
    SELECT fav INTO xfav FROM PicturesPixiv WHERE id = pid;
    SET xfav = xfav + 1;
    UPDATE PicturesPixiv SET fav = xfav WHERE id = pid;
  ELSEIF subTable = 'PicturesPhoto' THEN
    SELECT fav INTO xfav FROM PicturesPhoto WHERE id = pid;
    SET xfav = xfav + 1;
    UPDATE PicturesPhoto SET fav = xfav WHERE id = pid;
  END IF;
END
//
delimiter ;
