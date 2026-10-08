const fs = require('node:fs');
const path = require('node:path');
require('../src/config.js');
require('../src/engine.js');
const {run} = require('../src/qa.js');
const started=Date.now();
try {
  const result={...run(),node:process.version,elapsedMs:Date.now()-started};
  console.log(JSON.stringify(result,null,2));
  fs.writeFileSync(path.join(__dirname,'engine-results.json'),JSON.stringify(result,null,2)+'\n');
} catch(error) { console.error(error.stack);process.exitCode=1; }
