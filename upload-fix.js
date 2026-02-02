/* global console */
import ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';

async function fixUpload() {
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

    console.log('✅ Connected!');

    // 1. Force Upload index.html
    console.log('Uploading index.html...');
    await client.uploadFrom('dist/index.html', 'index.html');
    
    // Verify index.html size
    const list = await client.list();
    const indexFile = list.find(f => f.name === 'index.html');
    console.log('Server index.html size:', indexFile ? indexFile.size : 'Not found');
    console.log('Local index.html size:', fs.statSync('dist/index.html').size);

    // 2. Upload assets folder
    console.log('Creating and uploading assets...');
    await client.ensureDir('assets');
    await client.cd('assets');
    // iterate local dist/assets and upload one by one to ensure
    const assetFiles = fs.readdirSync('dist/assets');
    for (const file of assetFiles) {
        console.log(`Uploading assets/${file}...`);
        await client.uploadFrom(`dist/assets/${file}`, file);
    }
    
    // 3. Upload other root files (vite.svg etc) if any
    await client.cd('/');
    if (fs.existsSync('dist/vite.svg')) {
         await client.uploadFrom('dist/vite.svg', 'vite.svg');
    }

    console.log('✅ Fix upload complete!');

  } catch (err) {
    console.error('❌ Upload failed:', err);
  }

  client.close();
}

fixUpload();
