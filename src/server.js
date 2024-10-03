import * as webLib from './web-lib.js';
import * as path from "path";
import * as fs from "fs";

import { fileURLToPath } from 'url';

// TODO: configure and start server

//Get absolute path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, 'config.json');

//Read config.json using fs.readFile
fs.readFile(configPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading config file:', err);
    return;
  }
  
  //Parse config
  const config = JSON.parse(data);
  
  //Get root directory
  let root = config['root_directory'];
  let rootDirFull = path.join(__dirname, '..', root);

  //Get redirect mapping
  let redirectMap = config['redirect_map']
  
  startServer(rootDirFull, redirectMap)
  

});

function startServer(rootDirFull, redirectMap){
   const server = new webLib.HTTPServer(rootDirFull, redirectMap);
   const port = 3000;

   server.server.listen(port, () => {
    console.log('listening')
   })
}