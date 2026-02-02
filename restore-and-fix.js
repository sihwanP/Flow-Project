import ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';

async function restoreAndFix() {
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

    // 1. Delete /folw (Typo)
    console.log('--- Cleaning /folw ---');
    try {
        await client.removeDir('/folw');
        console.log('Deleted /folw');
    } catch (e) { console.log('/folw not found or error:', e.message); }

    // 2. Restore Root (Remove index.html and specific assets)
    console.log('\n--- Restoring Root ---');
    try {
        // Remove index.html if it's mine (check size roughly or just delete if user wants restore)
        const list = await client.list('/');
        const index = list.find(f => f.name === 'index.html');
        if (index) {
            console.log(`Deleting root/index.html (${index.size}b)...`);
            await client.remove('index.html');
        }
        
        // Remove assets from root that match local dist/assets
        if (fs.existsSync('dist/assets')) {
            const localAssets = fs.readdirSync('dist/assets');
            for (const file of localAssets) {
                 try {
                     await client.remove(`assets/${file}`);
                     console.log(`Deleted root/assets/${file}`);
                 } catch (e) {
                     // Ignore lookup errors
                 }
            }
        }
    } catch (e) { console.error('Error restoring root:', e); }

    // 3. Clean and Re-Upload /flow
    console.log('\n--- Re-deploying /flow ---');
    try {
        await client.removeDir('/flow');
        console.log('Deleted old /flow');
    } catch (e) { console.log('Old /flow not found or error (continuing):', e.message); }

    await client.ensureDir('/flow');
    await client.uploadFrom('dist/index.html', '/flow/index.html');
    
    await client.ensureDir('/flow/assets');
    const assetFiles = fs.readdirSync('dist/assets');
    for (const file of assetFiles) {
        const localPath = path.join('dist/assets', file);
        if (fs.statSync(localPath).isFile()) {
            console.log(`Uploading assets/${file}...`);
            await client.uploadFrom(localPath, `/flow/assets/${file}`);
        }
    }

    console.log('✅ Restoration and Fix Complete!');

  } catch (err) {
    console.error('❌ Operation failed:', err);
  }
  client.close();
}

restoreAndFix();
