/* global console */
import ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';

async function fixUploadAssets() {
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

    // 1. Ensure /flow directory exists and enter it
    console.log('Navigating to /flow...');
    await client.ensureDir('/flow');
    console.log('Current remote dir:', await client.pwd());

    // 2. Upload index.html
    if (fs.existsSync('dist/index.html')) {
        console.log('Uploading index.html...');
        await client.uploadFrom('dist/index.html', 'index.html');
    } else {
        console.warn('⚠️ dist/index.html not found! Run build first.');
    }

    // 3. Ensure assets directory exists inside /flow
    await client.ensureDir('assets');
    console.log('Navigating to /flow/assets...');
    
    // 4. Upload assets
    if (fs.existsSync('dist/assets')) {
        const assetFiles = fs.readdirSync('dist/assets');
        for (const file of assetFiles) {
            const localPath = path.join('dist/assets', file);
            if (fs.statSync(localPath).isFile()) {
                console.log(`Uploading assets/${file}...`);
                await client.uploadFrom(localPath, file);
            }
        }
    } else {
        console.warn('⚠️ dist/assets directory not found!');
    }
    
    console.log('✅ /flow deployment complete!');

  } catch (err) {
    console.error('❌ Upload failed:', err);
  }
  client.close();
}

fixUploadAssets();
