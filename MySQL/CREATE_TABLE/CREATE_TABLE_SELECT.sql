CREATE TABLE PicturesManga SELECT * FROM Pictures WHERE mark='MANGA';
CREATE TABLE PicturesHcg SELECT * FROM Pictures WHERE mark='HCG';
CREATE TABLE PicturesPixiv SELECT * FROM Pictures WHERE mark='PIXIV';
CREATE TABLE PicturesDoujin SELECT * FROM Pictures WHERE mark='DOUJIN';
CREATE TABLE PicturesPhoto SELECT * FROM Pictures WHERE mark='PHOTO';
CREATE TABLE PicturesTime SELECT * FROM Pictures ORDER BY `date`;
-- id を INT 型にする必要がある。Insert Select を使った方がよい。
CREATE TABLE Creators SELECT null as id, creator, '' as marks, '' as info, sum(fav) as fav, sum(count) as refcount, count(creator) as titlecount FROM Pictures GROUP BY creator ORDER BY creator;
