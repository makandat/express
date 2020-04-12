-- Creators テーブルの内容作成
TRUNCATE TABLE Creators;
INSERT INTO Creators SELECT null, creator, '' as marks, '' as info, sum(fav) as fav, sum(count) as refcount, count(creator) as titlecount FROM Pictures GROUP BY creator;
CALL NewCreatorMarks();
