# Solana Agent Registry - Build & Deploy Guide

## Option 1: Build with Docker (Recommended)

If you have Docker Desktop installed:

```powershell
# Start Docker Desktop first, then:
cd onchain-registry
.\build.ps1

# To build and deploy:
.\build.ps1 -Deploy -Cluster devnet
```

## Option 2: Build with Solana Playground (Web-based)

1. Go to [Solana Playground](https://beta.solpg.io/)
2. Create a new Anchor project
3. Copy the contents of `programs/agent-registry/src/lib.rs` into the editor
4. Update `Cargo.toml` with the dependencies
5. Click "Build" 
6. Download the `.so` file
7. Deploy locally:
   ```powershell
   solana program deploy agent_registry.so --program-id target/deploy/agent_registry-keypair.json
   ```

## Option 3: Build with WSL (Windows Subsystem for Linux)

```bash
# In WSL terminal:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Solana
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1

# Build
cd /mnt/g/Project-Layer2Agents/onchain-registry
anchor build
```

## Option 4: GitHub Actions (CI/CD)

Push to GitHub and the workflow at `.github/workflows/build-solana.yml` will:
1. Build the program automatically
2. Upload the compiled `.so` file as an artifact
3. Download from the Actions tab

## Deploy After Building

Once you have the `agent_registry.so` file:

```powershell
# Make sure you're on devnet
solana config set --url devnet

# Check balance
solana balance

# Deploy the program
solana program deploy target/deploy/agent_registry.so

# Note the Program ID that's output - update it in:
# - onchain-registry/Anchor.toml
# - onchain-registry/programs/agent-registry/src/lib.rs
# - onchain-registry/sdk/src/index.ts  
# - layer2agents/src/lib/onchain-registry.ts
```

## Alternative: Skip On-Chain for Now

If building is too complex, the frontend already works with the static registry.
The on-chain integration is ready - just needs the deployed program ID.

You can also use a **simpler off-chain registry** similar to Swarms.ai:
- Use Supabase or any database
- Store agent metadata off-chain
- Only use Solana for payments

The frontend hooks in `use-agents.ts` will automatically fall back to the static registry if the on-chain fetch fails.
