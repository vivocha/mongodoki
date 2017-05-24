const fs = require('fs');
const path = require('path');


function createDirSync(dirPath) {
  const dir = path.normalize(dirPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

function rmdir(dirPath) {
  const dir = path.normalize(dirPath);  
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (e) { return; }
  if (files.length > 0) {
    for (let i = 0; i < files.length; i += 1) {
      const filePath = `${dir}/${files[i]}`;
      if (fs.statSync(filePath).isFile()) fs.unlinkSync(filePath);
      else rmdir(filePath);
    }
  }
  return fs.rmdirSync(dir);
};

module.exports = {
  createDirSync,
  rmdir,
}