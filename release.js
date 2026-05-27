const fs = require('fs');
const token = fs.readFileSync('.github_token', 'utf8').trim();
const repo = 'faytodaysh/obsidian-2way-gdrive-sync';
const tag = '1.0.2';

async function run() {
  // 1. Get existing Release
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  const data = await res.json();
  if (!res.ok) { console.error('Failed to get release:', data); return; }
  
  const uploadUrlBase = data.upload_url.split('{')[0];
  
  // 2. Upload Remaining Assets
  const files = ['manifest.json', 'styles.css'];
  for (const file of files) {
    const fileData = fs.readFileSync(file);
    let contentType = 'application/json';
    if (file.endsWith('.js')) contentType = 'text/javascript';
    if (file.endsWith('.css')) contentType = 'text/css';
    
    // Check if asset already exists
    const existingAsset = data.assets.find(a => a.name === file);
    if (existingAsset) {
       console.log(`${file} already exists, skipping.`);
       continue;
    }
    
    try {
      const uploadRes = await fetch(`${uploadUrlBase}?name=${file}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': contentType,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: fileData
      });
      if (!uploadRes.ok) {
        console.error(`Failed to upload ${file}:`, await uploadRes.text());
      } else {
        console.log(`Uploaded ${file} successfully.`);
      }
    } catch (e) {
      console.error(`Network error on ${file}:`, e.message);
    }
  }
}
run();
