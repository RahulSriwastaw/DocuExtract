const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'components');

const replaceInFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  content = content.replace(/hover:bg-\[\#111111\]/g, 'hover:bg-[#1a1a1a]');
  
  fs.writeFileSync(filePath, content);
};

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const files = walkSync(srcDir);
files.forEach(replaceInFile);
replaceInFile(path.join(__dirname, 'src', 'App.tsx'));
