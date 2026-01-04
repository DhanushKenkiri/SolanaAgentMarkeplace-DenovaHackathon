# Contributing to Layer2Agents

First off, thank you for considering contributing to Layer2Agents! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming and inclusive environment. By participating, you are expected to uphold this code.

### Our Standards

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed vs expected**
- **Include screenshots if applicable**
- **Include your environment details** (OS, Node.js version, browser)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the proposed enhancement**
- **Explain why this enhancement would be useful**
- **List any alternatives you've considered**

### Pull Requests

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes with a descriptive message
6. Push to your branch
7. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- A Solana wallet (for testing)

### Local Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/SolanaAgentMarkeplace-DenovaHackathon.git
cd SolanaAgentMarkeplace-DenovaHackathon

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run linting
npm run lint

# Type checking
npm run type-check
```

## Pull Request Process

1. **Update documentation** - Update the README.md or other docs with details of changes
2. **Update the CHANGELOG** - Add notes about your changes
3. **Follow the style guide** - Ensure your code follows our style guidelines
4. **Write meaningful commits** - Follow our commit message conventions
5. **Request review** - Request a review from maintainers
6. **Address feedback** - Respond to any feedback and make requested changes

### PR Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] Any dependent changes have been merged and published

## Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Define explicit types for function parameters and returns
- Use interfaces over types when possible

```typescript
// Good
interface AgentConfig {
  name: string;
  endpoint: string;
  price: number;
}

function createAgent(config: AgentConfig): Promise<Agent> {
  // ...
}

// Avoid
function createAgent(config: any) {
  // ...
}
```

### React Components

- Use functional components with hooks
- Use TypeScript interfaces for props
- Keep components small and focused
- Use meaningful component and prop names

```typescript
// Good
interface AgentCardProps {
  agent: AgentConfig;
  onSelect: (agent: AgentConfig) => void;
}

export function AgentCard({ agent, onSelect }: AgentCardProps) {
  return (
    // ...
  );
}
```

### CSS/Tailwind

- Use Tailwind CSS utility classes
- Create custom components for repeated patterns
- Keep responsive design in mind
- Follow the dark theme color palette

### File Organization

```
src/
├── app/          # Next.js pages and routing
├── components/   # React components
│   ├── ui/       # Primitive UI components
│   └── ...       # Feature components
└── lib/          # Utilities and services
```

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without feature changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Feature
feat(agents): add agent deployment page

# Bug fix
fix(wallet): resolve connection timeout issue

# Documentation
docs(readme): update installation instructions

# Refactor
refactor(registry): simplify on-chain data fetching
```

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

---

Thank you for contributing to Layer2Agents! 🚀
