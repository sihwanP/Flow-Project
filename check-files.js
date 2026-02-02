import ftp from 'basic-ftp';

async function listServerFiles() {
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

    console.log('Listing root directory files:');
    const list = await client.list();
    list.forEach(f => {
        console.log(`${f.name} \t ${f.size} \t ${f.rawModifiedAt}`);
    });

  } catch (err) {
    console.error('Error:', err);
  }
  client.close();
}

listServerFiles();
