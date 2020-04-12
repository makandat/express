create table MANGA_CREATORS
 (
   ID int primary key, 
   CREATOR varchar(50) not null, 
   CT int not null, 
   TAG char(1), 
   STAR tinyint default 0
 )
 default character set utf8;
