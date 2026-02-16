import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 60_000,
  },
  resolve: {
    conditions: ['node'],
    extensions: ['.ts', '.js'],
    alias: [
      {
        find: /^(.+)\.js$/,
        replacement: '$1.ts',
      },
    ],
  },
});
