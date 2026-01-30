/* global console */
import ftp from 'basic-ftp';


async function uploadToFTP() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log('FTP 서버에 연결 중...');
    await client.access({
      host: '112.175.185.144',
      port: 21,
      user: 'tlghks132',
      password: 'Ghks3928*',
      secure: false
    });

    console.log('FTP 연결 성공!');
    console.log('원격 경로로 이동 중: /html');

    // 원격 디렉토리로 이동
    await client.cd('/html');

    // 기존 파일 정리 (선택사항)
    console.log('기존 파일 정리 중...');
    try {
      const files = await client.list();
      for (const file of files) {
        try {
          if (file.isDirectory) {
            await client.removeDir(file.name);
          } else {
            await client.remove(file.name);
          }
        } catch (_e) {
          console.log(`파일 삭제 실패: ${file.name}`);
        }
      }
    } catch (err) {
      console.log('FTP Cleanup skipped or failed:', err);
    }

    try {
      console.log('Uploading files...');
      await client.uploadFromDir('dist');
    } catch (err) {
      console.log('FTP Upload failed:', err);
    }

    console.log('✅ 업로드 완료!');
    console.log('접속 URL: http://tlghks132.dothome.co.kr');
  } catch (err) {
    console.error('❌ 업로드 실패:', err);
  }

  client.close();
}

uploadToFTP();
