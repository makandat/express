-- Pictures テーブルをもとに mark を更新する。
delimiter //
CREATE PROCEDURE NewCreatorMarks()
BEGIN
  DECLARE xcreator VARCHAR(50);
  DECLARE xmark VARCHAR(20);
  DECLARE done INT DEFAULT FALSE;
  DECLARE cur CURSOR FOR SELECT creator, min(mark) AS minmark FROM Pictures GROUP BY creator;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO xcreator, xmark;
    IF done THEN
      LEAVE read_loop;
    END IF;
    UPDATE Creators SET marks = xmark WHERE creator = xcreator;
  END LOOP;
  CLOSE cur;
END
//
delimiter ;
