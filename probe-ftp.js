import ftp from 'basic-ftp';

async function probeFTP() {
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

    // 1. List Root
    console.log('--- ROOT (/) ---');
    const rootList = await client.list();
    rootList.forEach(f => console.log(`[${f.type === 2 ? 'DIR' : 'FILE'}] ${f.name} (${f.size}b)`));

    // 2. List /folw (Typo dir)
    console.log('\n--- /folw ---');
    try {
        const folwList = await client.list('/folw');
        folwList.forEach(f => console.log(`[${f.type === 2 ? 'DIR' : 'FILE'}] ${f.name} (${f.size}b)`));
    } catch (e) { console.log('/folw does not exist (Good)'); }

    // 3. List /flow
    console.log('\n--- /flow ---');
    try {
        const flowList = await client.list('/flow');
        flowList.forEach(f => console.log(`[${f.type === 2 ? 'DIR' : 'FILE'}] ${f.name} (${f.size}b)`));
    } catch (e) { console.log('/flow does not exist (BAD)'); }

    // 4. List /flow/assets
    console.log('\n--- /flow/assets ---');
    try {
        const flowAssetsList = await client.list('/flow/assets');
        flowAssetsList.forEach(f => console.log(`[${f.type === 2 ? 'DIR' : 'FILE'}] ${f.name} (${f.size}b)`));
    } catch (e) { console.log('/flow/assets does not exist (BAD)'); }

  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
  client.close();
}

probeFTP();
