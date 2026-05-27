const fs = require('fs');
const token = fs.readFileSync('.github_token', 'utf8').trim();
const repo = 'faytodaysh/obsidian-2way-gdrive-sync';

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const tag = manifest.version;

async function run() {
  // 1. Create Release
  const res = await fetch(`https://api.github.com/repos/${repo}/releases`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({ tag_name: tag, name: `Release ${tag}`, body: 'Added Advanced Conflict Resolution Strategies: Auto-Merge and Visual Diff Modal.' })
  });
  const data = await res.json();
  if (!res.ok) { console.error('Failed to create release:', data); return; }
  
  const uploadUrlBase = data.upload_url.split('{')[0];
  
  // 2. Upload Assets
  const files = ['main.js', 'manifest.json', 'styles.css'];
  for (const file of files) {
    const fileData = fs.readFileSync(file);
    let contentType = 'application/json';
    if (file.endsWith('.js')) contentType = 'text/javascript';
    if (file.endsWith('.css')) contentType = 'text/css';
    
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
  }
}
run();
