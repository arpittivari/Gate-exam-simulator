import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  //vn This MUST match your repository name exactly, with slashes
  base: '/Gate-exam-simulator/', 
})