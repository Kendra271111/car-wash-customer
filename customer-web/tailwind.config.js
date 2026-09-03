module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'], // optional
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark'],
  },
}