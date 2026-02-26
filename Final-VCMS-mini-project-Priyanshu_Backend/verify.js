#!/usr/bin/env node

/**
 * MediConnect System Verification Script
 * Checks if all components are properly configured and running
 * 
 * Usage: node verify.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('\n🏥 MediConnect - System Verification\n');
console.log('=' .repeat(50));

const checks = [
  {
    name: 'Backend Server (Port 5000)',
    fn: async () => {
      return new Promise((resolve) => {
        const req = http.get('http://localhost:5000/api', { timeout: 3000 }, (res) => {
          clearTimeout(timeoutId);
          resolve({
            success: true,
            message: `Server responding (Status: ${res.statusCode})`
          });
        });
        
        const timeoutId = setTimeout(() => {
          req.abort();
          resolve({
            success: false,
            message: 'Timeout - Backend not responding'
          });
        }, 3000);
        
        req.on('error', () => {
          resolve({
            success: false,
            message: 'Connection refused - Backend not running'
          });
        });
      });
    }
  },
  {
    name: 'Frontend Dev Server (Port 8081)',
    fn: async () => {
      return new Promise((resolve) => {
        const req = http.get('http://localhost:8081', { timeout: 3000 }, (res) => {
          clearTimeout(timeoutId);
          resolve({
            success: true,
            message: `Dev server responding (Status: ${res.statusCode})`
          });
        });
        
        const timeoutId = setTimeout(() => {
          req.abort();
          resolve({
            success: false,
            message: 'Timeout - Frontend not responding'
          });
        }, 3000);
        
        req.on('error', () => {
          resolve({
            success: false,
            message: 'Connection refused - Frontend not running'
          });
        });
      });
    }
  },
  {
    name: 'Frontend Files',
    fn: async () => {
      const files = [
        'src/App.tsx',
        'src/main.tsx',
        'src/contexts/AuthContext.tsx',
        'src/components/Layout.tsx',
        'src/services/api.ts',
        'index.html',
        'package.json',
        'vite.config.ts'
      ];
      
      const missing = files.filter(f => !fs.existsSync(path.join(__dirname, f)));
      
      if (missing.length === 0) {
        return { success: true, message: 'All frontend files present' };
      } else {
        return { success: false, message: `Missing files: ${missing.join(', ')}` };
      }
    }
  },
  {
    name: 'Backend Files',
    fn: async () => {
      const files = [
        'server/server.js',
        'server/package.json',
        'server/config/db.js',
        'server/config/environment.js',
        'server/.env'
      ];
      
      const missing = files.filter(f => !fs.existsSync(path.join(__dirname, f)));
      
      if (missing.length === 0) {
        return { success: true, message: 'All backend files present' };
      } else {
        return { success: false, message: `Missing files: ${missing.join(', ')}` };
      }
    }
  },
  {
    name: 'Code Fixes Applied',
    fn: async () => {
      // Check AuthContext fix
      const authFile = fs.readFileSync(path.join(__dirname, 'src/contexts/AuthContext.tsx'), 'utf8');
      const authFixed = authFile.includes("localStorage.getItem('authToken')") && 
                        !authFile.includes("localStorage.setItem('token',");
      
      // Check App.tsx fix
      const appFile = fs.readFileSync(path.join(__dirname, 'src/App.tsx'), 'utf8');
      const appFixed = appFile.includes('ErrorBoundary') && appFile.includes('class ErrorBoundary');
      
      // Check Layout.tsx fix
      const layoutFile = fs.readFileSync(path.join(__dirname, 'src/components/Layout.tsx'), 'utf8');
      const layoutFixed = layoutFile.includes('isLoading') && layoutFile.includes('Loading MediConnect');
      
      // Check api.ts fix
      const apiFile = fs.readFileSync(path.join(__dirname, 'src/services/api.ts'), 'utf8');
      const apiFixed = apiFile.includes('5000') && apiFile.includes('setTimeout');
      
      const allFixed = authFixed && appFixed && layoutFixed && apiFixed;
      
      if (allFixed) {
        return { success: true, message: 'All critical fixes applied ✅' };
      } else {
        const fixes = [];
        if (!authFixed) fixes.push('AuthContext token fix');
        if (!appFixed) fixes.push('App.tsx ErrorBoundary');
        if (!layoutFixed) fixes.push('Layout.tsx loading state');
        if (!apiFixed) fixes.push('api.ts CSRF fetch');
        return { success: false, message: `Missing fixes: ${fixes.join(', ')}` };
      }
    }
  }
];

async function runChecks() {
  let passed = 0;
  let failed = 0;
  
  for (const check of checks) {
    process.stdout.write(`\n✓ Checking: ${check.name.padEnd(40)}`);
    try {
      const result = await check.fn();
      if (result.success) {
        console.log(`[✅]`);
        console.log(`  └─ ${result.message}`);
        passed++;
      } else {
        console.log(`[❌]`);
        console.log(`  └─ ${result.message}`);
        failed++;
      }
    } catch (error) {
      console.log(`[⚠️]`);
      console.log(`  └─ Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed === 0) {
    console.log('✨ All checks passed! Your system is ready to go! ✨\n');
    console.log('📝 Quick Start:');
    console.log('   Terminal 1: cd server && node server.js');
    console.log('   Terminal 2: npm run dev');
    console.log('   Browser: http://localhost:8081\n');
  } else {
    console.log('⚠️  Some checks failed. Please:\n');
    console.log('1. Ensure Backend is running: cd server && node server.js');
    console.log('2. Ensure Frontend is running: npm run dev');
    console.log('3. Or check the file existence errors above\n');
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

console.log('\nRunning verification checks...\n');
runChecks().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});
