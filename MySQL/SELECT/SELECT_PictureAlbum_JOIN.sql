-- PictureAlbums �e�[�u���œ����^�C�g���ňقȂ�p�X�̃f�[�^�𒊏o����B
SELECT a.id as id_a, b.id as id_b, a.title as title, a.path as a_path, b.path as b_path 
FROM picturealbum a 
INNER JOIN picturealbum b 
ON a .title = b.title AND a.path > b.path;
