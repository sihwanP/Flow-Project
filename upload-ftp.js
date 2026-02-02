/* global console */
import ftp from 'basic-ftp';
import path from 'path';

async function uploadToFTP() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log('Connecting to Cafe24 FTP (tlghks132.mycafe24.com)...');
    await client.access({
      host: 'tlghks132.mycafe24.com',
      user: 'tlghks132',
      password: 'Ghks3928**',
      secure: false
    });

    console.log('✅ Connected!');

    // 1. Create a timestamped backup directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `_backup_${timestamp}`;
    console.log(`Creating backup directory: ${backupDir}`);
    await client.ensureDir(backupDir);
    await client.cd('/'); // Go back to root

    // 2. Move existing files to backup
    console.log('Moving existing files to backup...');
    const files = await client.list();
    
    for (const file of files) {
      if (file.name === backupDir || file.name === '.' || file.name === '..') continue;
      
      try {
        console.log(`Moving ${file.name} to ${backupDir}/${file.name}...`);
        await client.rename(file.name, `${backupDir}/${file.name}`);
      } catch (e) {
        console.log(`⚠️ Failed to move ${file.name}:`, e.message);
      }
    }

    // 3. Upload new files from 'dist'
    console.log('Uploading new files from dist...');
    await client.uploadFromDir('dist');

    console.log('✅ Deployment successful!');
    console.log('Backup location:', `/${backupDir}`);
    console.log('URL:', 'http://tlghks132.mycafe24.com');

  } catch (err) {
    console.error('❌ Deployment failed:', err);
  }

  client.close();
}

uploadToFTP();
