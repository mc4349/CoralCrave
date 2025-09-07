# CoralCrave Development Workflow Setup Guide

## Overview
This guide establishes a comprehensive development workflow for the CoralCrave project, focusing on safe branch-based development, automated testing, code quality standards, and streamlined deployment processes.

## Table of Contents
1. [Branch Strategy & Git Workflow](#branch-strategy--git-workflow)
2. [GitHub Actions CI/CD Pipeline](#github-actions-cicd-pipeline)
3. [Code Quality Standards](#code-quality-standards)
4. [Testing Framework](#testing-framework)
5. [Development Environment](#development-environment)
6. [Deployment & Preview System](#deployment--preview-system)
7. [Implementation Steps](#implementation-steps)

---

## Branch Strategy & Git Workflow

### Branch Structure
```
main (protected)          # Production-ready code
├── develop              # Integration branch
│   ├── feature/*        # Feature development
│   ├── hotfix/*         # Critical production fixes
│   └── release/*        # Release preparation
```

### Branch Naming Conventions
- `feature/description-of-feature` - New features
- `hotfix/critical-fix-name` - Critical production fixes
- `release/v1.2.3` - Release preparation
- `chore/setup-workflow` - Maintenance tasks

### Workflow Process
1. **Create Feature Branch**: `git checkout -b feature/your-feature-name`
2. **Develop & Test**: Make changes with proper testing
3. **Create Pull Request**: Push branch and create PR
4. **Code Review**: Get approval from team members
5. **Merge**: Squash merge to main after CI passes
6. **Deploy**: Automatic deployment to production

### Branch Protection Rules
- **Main Branch Protection**:
  - Require pull request reviews (minimum 1)
  - Require status checks to pass
  - Require branches to be up to date
  - Include administrators in restrictions

---

## GitHub Actions CI/CD Pipeline

### CI Pipeline Features
- **Automated Testing**: Run tests on every push and PR
- **Build Verification**: Ensure both frontend and backend build successfully
- **Security Scanning**: Check for vulnerable dependencies
- **Code Quality**: Run linting and formatting checks
- **Preview Deployments**: Deploy PRs to staging environment

### Pipeline Stages
1. **Setup & Dependencies**
2. **Linting & Code Quality**
3. **Testing (Unit & Integration)**
4. **Build & Bundle**
5. **Security Scanning**
6. **Preview Deployment**

### Configuration Files
- `.github/workflows/ci.yml` - Main CI pipeline
- `.github/workflows/deploy.yml` - Deployment pipeline
- `.github/workflows/security.yml` - Security scanning

---

## Code Quality Standards

### ESLint Configuration
- TypeScript-specific rules
- React best practices
- Import/export organization
- Accessibility guidelines

### Prettier Configuration
- Consistent code formatting
- Automatic import sorting
- Line length limits
- Bracket and quote styles

### Pre-commit Hooks
- Run linting before commits
- Format code automatically
- Prevent commits with failing tests
- Check for sensitive data leaks

### Configuration Files
- `eslint.config.js` - ESLint rules
- `.prettierrc` - Prettier formatting
- `.husky/pre-commit` - Pre-commit hooks
- `.vscode/settings.json` - Editor configuration

---

## Testing Framework

### Vitest Setup
- Fast unit testing with native ESM support
- React Testing Library for component tests
- Backend API testing with supertest
- Coverage reporting and thresholds

### Test Structure
```
src/
├── components/
│   ├── Component.test.tsx
│   └── __tests__/
├── services/
│   └── __tests__/
└── utils/
    └── __tests__/
```

### Test Categories
- **Unit Tests**: Individual functions and components
- **Integration Tests**: API endpoints and service interactions
- **End-to-End Tests**: Complete user workflows
- **Visual Regression Tests**: UI consistency

### Coverage Requirements
- Minimum 80% code coverage
- Branch coverage for critical paths
- Function coverage for utilities
- Statement coverage for business logic

---

## Development Environment

### Local Setup
1. **Clone Repository**: `git clone <repository-url>`
2. **Install Dependencies**: `npm install` (root and server/)
3. **Environment Setup**: Copy `.env.example` files
4. **Start Development**: `npm run dev` (frontend) + `npm run dev` (server)

### Environment Management
- `.env.local` - Frontend environment variables
- `server/.env` - Backend environment variables
- `.env.example` - Template files for new developers

### Development Scripts
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run test` - Run test suite
- `npm run lint` - Code linting
- `npm run format` - Code formatting

### Docker Support
- `Dockerfile` - Production container
- `docker-compose.yml` - Development environment
- Multi-stage builds for optimization

---

## Deployment & Preview System

### Preview Deployments
- **Automatic PR Previews**: Deploy every PR to staging
- **Firebase Hosting**: Fast, reliable hosting
- **Unique URLs**: `pr-123--coralcrave.web.app`
- **Cleanup**: Automatic removal after PR merge/close

### Production Deployment
- **Automated Releases**: Deploy on main branch merge
- **Rollback Support**: Quick revert to previous version
- **Monitoring**: Performance and error tracking
- **CDN Integration**: Global content delivery

### Deployment Configuration
- `firebase.json` - Firebase hosting configuration
- `.github/workflows/deploy.yml` - Deployment pipeline
- `Dockerfile` - Container configuration
- `nginx.conf` - Production web server

---

## Implementation Steps

### Phase 1: Branch Setup & Foundation
1. Create `feature/dev-workflow-setup` branch
2. Set up basic GitHub Actions workflow
3. Configure branch protection rules
4. Implement automated testing pipeline

### Phase 2: Code Quality & Standards
1. Add ESLint configuration
2. Set up Prettier formatting
3. Configure Husky pre-commit hooks
4. Add VS Code workspace settings

### Phase 3: Testing Framework
1. Install and configure Vitest
2. Set up React Testing Library
3. Add test utilities and helpers
4. Configure coverage reporting

### Phase 4: Deployment & Preview System
1. Configure Firebase preview deployments
2. Set up production deployment pipeline
3. Add monitoring and logging
4. Implement rollback procedures

### Phase 5: Documentation & Training
1. Update README with new workflow
2. Create contributor guidelines
3. Document deployment procedures
4. Train team on new processes

---

## Safety Measures

### Risk Mitigation
- **Branch Protection**: Prevents direct pushes to main
- **Automated Testing**: Catches issues before merge
- **Code Reviews**: Peer validation of changes
- **Preview Deployments**: Test in staging before production

### Rollback Procedures
1. **Immediate Rollback**: Use Firebase hosting rollback
2. **Git Revert**: Create revert commit for complex issues
3. **Hotfix Branch**: Quick fixes for critical production issues
4. **Version Pinning**: Lock dependency versions for stability

### Monitoring & Alerting
- **Build Status**: Monitor CI/CD pipeline health
- **Test Results**: Track test suite performance
- **Deployment Status**: Real-time deployment monitoring
- **Error Tracking**: Application performance monitoring

---

## Benefits

### Development Efficiency
- **Faster Feedback**: Automated testing and linting
- **Consistent Code**: Standardized formatting and style
- **Reduced Errors**: Pre-commit checks prevent issues
- **Parallel Development**: Feature branches enable concurrent work

### Quality Assurance
- **Automated Testing**: Comprehensive test coverage
- **Code Reviews**: Peer validation of changes
- **Security Scanning**: Regular vulnerability checks
- **Performance Monitoring**: Track application health

### Deployment Safety
- **Preview Environments**: Test changes before production
- **Automated Deployments**: Consistent release process
- **Rollback Support**: Quick recovery from issues
- **Monitoring**: Real-time health tracking

---

## Getting Started

1. **Read This Guide**: Understand the workflow completely
2. **Set Up Local Environment**: Follow development environment setup
3. **Create Feature Branch**: `git checkout -b feature/your-feature`
4. **Make Changes**: Develop with testing and quality checks
5. **Create Pull Request**: Get feedback and approval
6. **Merge & Deploy**: Automatic deployment to production

This workflow ensures safe, efficient, and high-quality development for the CoralCrave livestreaming platform.
