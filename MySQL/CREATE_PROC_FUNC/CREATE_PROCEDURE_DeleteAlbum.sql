-- アルバムを削除する。
delimiter //
CREATE PROCEDURE DeleteAlbum(IN pid INT)
BEGIN
  DELETE FROM PictureAlbum WHERE album = pid;
  DELETE FROM Album WHERE id = pid;
END;
//
delimiter ;
