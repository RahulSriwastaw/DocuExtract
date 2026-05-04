const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'components');

const replaceInFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Backups
  // fs.writeFileSync(filePath + '.bak', content);

  // Backgrounds
  content = content.replace(/bg-white/g, 'bg-bg-card');
  content = content.replace(/bg-slate-50/g, 'bg-[#111111]');
  content = content.replace(/bg-slate-100/g, 'bg-[#141414]');
  
  // Borders
  content = content.replace(/border-slate-100/g, 'border-border');
  content = content.replace(/border-slate-200/g, 'border-border');
  content = content.replace(/border-slate-300/g, 'border-border');
  
  // Text colors
  content = content.replace(/text-slate-900/g, 'text-text-heading');
  content = content.replace(/text-slate-800/g, 'text-text-heading');
  content = content.replace(/text-slate-700/g, 'text-text-heading');
  content = content.replace(/text-slate-600/g, 'text-text-body');
  content = content.replace(/text-slate-500/g, 'text-text-muted');
  content = content.replace(/text-slate-400/g, 'text-[#555555]');
  
  // Primary Buttons (usually have bg-blue-600 or bg-indigo-600)
  content = content.replace(/bg-blue-600/g, 'bg-primary');
  content = content.replace(/hover:bg-blue-700/g, 'hover:bg-primary-hover');
  content = content.replace(/text-blue-600/g, 'text-primary');
  
  content = content.replace(/bg-indigo-600/g, 'bg-primary');
  content = content.replace(/hover:bg-indigo-700/g, 'hover:bg-primary-hover');
  content = content.replace(/text-indigo-600/g, 'text-primary');

  content = content.replace(/bg-purple-600/g, 'bg-primary');
  content = content.replace(/hover:bg-purple-700/g, 'hover:bg-primary-hover');

  // Shadows
  content = content.replace(/shadow-sm/g, '');
  content = content.replace(/shadow-md/g, 'card-hover');
  content = content.replace(/shadow-lg/g, 'card-hover');
  content = content.replace(/shadow-xl/g, 'card-hover');
  content = content.replace(/shadow-2xl/g, 'card-hover');
  
  // Padding & Sizing reductions
  content = content.replace(/p-4/g, 'p-3');
  content = content.replace(/px-6/g, 'px-4');
  content = content.replace(/py-4/g, 'py-3');
  content = content.replace(/p-6/g, 'p-4');
  content = content.replace(/px-8/g, 'px-5');
  content = content.replace(/py-8/g, 'py-5');
  
  // Rounded adjustments (prompt wants 8px cards, 6px buttons)
  content = content.replace(/rounded-xl/g, 'rounded-lg');
  content = content.replace(/rounded-2xl/g, 'rounded-lg');
  content = content.replace(/rounded-3xl/g, 'rounded-lg');
  
  // Font sizes defaults
  content = content.replace(/text-sm/g, 'text-[13px]');
  content = content.replace(/text-lg/g, 'text-[15px]');

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

// Also do App.tsx
replaceInFile(path.join(__dirname, 'src', 'App.tsx'));

console.log('Restyling replacements complete!');
