delimiter //
-- Pictures テーブルの作者修正
CREATE PROCEDURE user.PicturesPixivCreator()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE xid INT;
  DECLARE xtitle VARCHAR(180);
  DECLARE xcreator VARCHAR(100);
  DECLARE cur CURSOR FOR SELECT id, title, creator FROM user.Pictures WHERE mark = 'PIXIV' AND creator='作者';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO xid, xtitle, xcreator;
    IF done THEN
      LEAVE read_loop;
    END IF;
    UPDATE user.Pictures SET creator = xtitle WHERE id = xid;
  END LOOP;
  CLOSE cur;
END
//
delimiter ;
