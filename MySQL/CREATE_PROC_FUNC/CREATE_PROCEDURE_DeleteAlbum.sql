-- アルバムを削除する。
delimiter //
CREATE PROCEDURE user.DeleteAlbum(IN pid INT)
BEGIN
  DELETE FROM user.PictureAlbum WHERE album = pid;
  DELETE FROM user.Album WHERE id = pid;
END;
//
delimiter ;
