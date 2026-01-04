/**
 * Update Program ID After Playground Deployment
 * 
 * Run: node update-program-id.js <NEW_PROGRAM_ID>
 * Example: node update-program-id.js 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin
 */

const fs = require('fs');
const path = require('path');

const newProgramId = process.argv[2];

if (!newProgramId) {
  console.error('❌ Usage: node update-program-id.js <PROGRAM_ID>');
  console.error('Example: node update-program-id.js 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin');
  process.exit(1);
}

// Validate program ID format (base58, ~44 chars)
if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(newProgramId)) {
  console.error('❌ Invalid program ID format. Should be a base58 string.');
  process.exit(1);
}

console.log(`\n🔄 Updating Program ID to: ${newProgramId}\n`);

const filesToUpdate = [
  {
    path: path.join(__dirname, 'Anchor.toml'),
    pattern: /agent_registry = "[1-9A-HJ-NP-Za-km-z]{32,44}"/g,
    replacement: `agent_registry = "${newProgramId}"`,
  },
  {
    path: path.join(__dirname, 'programs', 'agent-registry', 'src', 'lib.rs'),
    pattern: /declare_id!\("[1-9A-HJ-NP-Za-km-z]{32,44}"\)/,
    replacement: `declare_id!("${newProgramId}")`,
  },
  {
    path: path.join(__dirname, 'sdk', 'src', 'index.ts'),
    pattern: /AGENT_REGISTRY_PROGRAM_ID = new PublicKey\(\s*"[1-9A-HJ-NP-Za-km-z]{32,44}"\s*\)/,
    replacement: `AGENT_REGISTRY_PROGRAM_ID = new PublicKey(\n  "${newProgramId}"\n)`,
  },
  {
    path: path.join(__dirname, '..', 'layer2agents', 'src', 'lib', 'onchain-registry.ts'),
    pattern: /AGENT_REGISTRY_PROGRAM_ID = new PublicKey\(\s*"[1-9A-HJ-NP-Za-km-z]{32,44}"\s*\)/,
    replacement: `AGENT_REGISTRY_PROGRAM_ID = new PublicKey(\n  "${newProgramId}"\n)`,
  },
];

let updatedCount = 0;

for (const file of filesToUpdate) {
  try {
    if (!fs.existsSync(file.path)) {
      console.log(`⚠️  Skipped (not found): ${file.path}`);
      continue;
    }

    let content = fs.readFileSync(file.path, 'utf-8');
    const newContent = content.replace(file.pattern, file.replacement);

    if (content !== newContent) {
      fs.writeFileSync(file.path, newContent);
      console.log(`✅ Updated: ${path.relative(__dirname, file.path)}`);
      updatedCount++;
    } else {
      console.log(`⏭️  No change needed: ${path.relative(__dirname, file.path)}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${file.path}: ${error.message}`);
  }
}

console.log(`\n✅ Updated ${updatedCount} files with Program ID: ${newProgramId}`);
console.log('\n📋 Next Steps:');
console.log('1. Update hybrid-registry.ts to use "onchain" mode');
console.log('2. Run the SDK deploy script to register agents');
console.log('3. Test the frontend with on-chain data');
