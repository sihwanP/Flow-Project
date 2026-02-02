import ftp from 'basic-ftp';

async function checkBackup() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log('Connecting to Cafe24 FTP...');
    await client.access({
      host: 'tlghks132.mycafe24.com',
      user: 'tlghks132',
      password: 'Ghks3928**',
      secure: false
    });

    const backupDir = '_backup_2026-02-01T04-05-49-871Z';
    console.log(`Listing ${backupDir}...`);
    const list = await client.list(backupDir);
    list.forEach(f => console.log(`[${f.type === 2 ? 'DIR' : 'FILE'}] ${f.name} (${f.size}b)`));

  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
  client.close();
}

checkBackup();
