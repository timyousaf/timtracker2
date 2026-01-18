const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Resolve packages from the monorepo
config.resolver.disableHierarchicalLookup = true;

// Handle Node.js polyfills for web builds
// The 'buffer/' import (with trailing slash) is used by whatwg-url-without-unicode
// and needs to be resolved to the buffer package
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'buffer/': require.resolve('buffer/'),
  'buffer': require.resolve('buffer/'),
  // Explicitly resolve react-native-svg from monorepo root for lucide-react-native
  'react-native-svg': path.resolve(monorepoRoot, 'node_modules/react-native-svg'),
};

module.exports = config;
