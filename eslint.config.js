import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import svelte from 'eslint-plugin-svelte'
import tseslint from 'typescript-eslint'

export default defineConfig(
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      eqeqeq: 'error',
      'no-duplicate-imports': 'error',
      '@typescript-eslint/consistent-type-imports': 'error'
    }
  },
  svelte.configs.recommended,
  {
    files: ['**/*.svelte'],
    languageOptions: { parserOptions: { parser: tseslint.parser } }
  },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } }
)
