module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.spec.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', '@angular-eslint'],
  extends: ['plugin:@angular-eslint/recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['projects/**/*', 'www/**/*', 'dist/**/*'],
  rules: {},
};
