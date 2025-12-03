import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  //vn This must match your repository name exactly, with slashes
  base: '/Gate-exam-simulator/', 
})