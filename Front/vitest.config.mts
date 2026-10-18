import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Unit/smoke тесты data-layer (src/api, lib/cart, lib/checkout). Запуск: npx vitest run
// (vitest лежит в корневом node_modules монорепы). Live-тесты: NEST_LIVE=1.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
