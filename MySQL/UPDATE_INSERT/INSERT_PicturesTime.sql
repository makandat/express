TRUNCATE PicturesTime;
INSERT INTO PicturesTime SELECT * FROM Pictures ORDER BY `date`;
CALL TimeSN();
