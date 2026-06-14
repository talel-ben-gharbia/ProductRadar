const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, 'frontend');
const ADMIN_SERVICES_DIR = path.join(FRONTEND_DIR, 'services', 'admin');
const SERVICES_DIR = path.join(FRONTEND_DIR, 'services');

// 1. Move all files
const files = fs.readdirSync(ADMIN_SERVICES_DIR);
for (const file of files) {
  const oldPath = path.join(ADMIN_SERVICES_DIR, file);
  const newPath = path.join(SERVICES_DIR, file);
  if (fs.statSync(oldPath).isFile()) {
    fs.renameSync(oldPath, newPath);
    console.log(`Moved ${file}`);
  }
}

// 2. Find and Replace imports in the entire frontend directory
function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory && f !== 'node_modules' && f !== '.next') {
      walkDir(dirPath, callback);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')) {
      callback(path.join(dir, f));
    }
  });
}

let modifiedFiles = 0;
walkDir(FRONTEND_DIR, function(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Match any import or export containing @/services/admin/
  // and replace with @/services/
  if (content.includes('@/services/admin/')) {
    const newContent = content.replace(/@\/services\/admin\//g, '@/services/');
    fs.writeFileSync(filePath, newContent, 'utf8');
    modifiedFiles++;
  }
});

console.log(`Updated imports in ${modifiedFiles} files.`);

// 3. Remove the admin directory
fs.rmdirSync(ADMIN_SERVICES_DIR);
console.log('Removed services/admin directory.');
