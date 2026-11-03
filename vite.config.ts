import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages はリポジトリ名のサブパスで公開されるため base を合わせる
export default defineConfig({
  plugins: [react()],
  base: '/pc-lending-system-ts/',
});
