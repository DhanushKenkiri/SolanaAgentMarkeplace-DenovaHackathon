/**
 * Solana Playground Export Script
 * 
 * This script prepares your Anchor program for building on Solana Playground (beta.solpg.io)
 * Run: node export-for-playground.js
 */

const fs = require('fs');
const path = require('path');

const PROGRAM_DIR = path.join(__dirname, 'programs', 'agent-registry', 'src');
const OUTPUT_FILE = path.join(__dirname, 'playground-export.json');

// Read the program source
const libRs = fs.readFileSync(path.join(PROGRAM_DIR, 'lib.rs'), 'utf-8');

// Read Cargo.toml
const cargoToml = fs.readFileSync(
  path.join(__dirname, 'programs', 'agent-registry', 'Cargo.toml'),
  'utf-8'
);

// Create Solana Playground compatible export
const playgroundExport = {
  name: "agent_registry",
  description: "Layer2Agents On-Chain Agent Registry",
  framework: "anchor",
  files: {
    "src/lib.rs": libRs,
    "Cargo.toml": cargoToml,
  },
  instructions: `
## How to Build on Solana Playground

1. Go to https://beta.solpg.io/
2. Click "Import" or create a new Anchor project
3. Replace the contents of src/lib.rs with the code below
4. Update Cargo.toml with the dependencies
5. Click "Build"
6. Once built, click "Deploy" to deploy to devnet
7. Copy the Program ID and update your config files

## After Deployment

Update these files with your new Program ID:
- onchain-registry/Anchor.toml
- onchain-registry/programs/agent-registry/src/lib.rs (declare_id!)
- onchain-registry/sdk/src/index.ts
- layer2agents/src/lib/onchain-registry.ts
`
};

// Write export file
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(playgroundExport, null, 2));

console.log('✅ Export created: playground-export.json');
console.log('');
console.log('📋 Quick Copy - lib.rs content:');
console.log('================================');
console.log('');

// Also create a simple text file with just the lib.rs for easy copy
fs.writeFileSync(
  path.join(__dirname, 'lib-rs-for-playground.txt'),
  libRs
);

console.log('✅ Created: lib-rs-for-playground.txt');
console.log('');
console.log('🚀 Next Steps:');
console.log('1. Open https://beta.solpg.io/');
console.log('2. Create new Anchor project');
console.log('3. Copy contents from lib-rs-for-playground.txt to src/lib.rs');
console.log('4. Build & Deploy on Playground');
console.log('5. Run: node deploy-from-playground.js <PROGRAM_ID>');
