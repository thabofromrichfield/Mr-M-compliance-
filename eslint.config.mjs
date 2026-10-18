import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
export default defineConfig([...tseslint.configs.recommended, globalIgnores(['.next/**', 'node_modules/**', 'next-env.d.ts'])]);
