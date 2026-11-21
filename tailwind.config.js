/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      borderRadius: {
        none: '0px',
        sm: '1px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        full: '9999px',
      },
      boxShadow: {
        none: 'none',
        flat: 'none',
        crisp: '0 0 0 1px rgba(0, 0, 0, 0.1)',
      },
      colors: {
        pastel: {
          green: '#dcfce7',
          greenText: '#166534',
          greenBorder: '#bbf7d0',
          red: '#fee2e2',
          redText: '#991b1b',
          redBorder: '#fecaca',
          amber: '#fef3c7',
          amberText: '#92400e',
          amberBorder: '#fde68a',
          blue: '#e0f2fe',
          blueText: '#0369a1',
          blueBorder: '#bae6fd',
          slate: '#f1f5f9',
          slateText: '#334155',
          slateBorder: '#e2e8f0',
        },
      },
    },
  },
  plugins: [],
};
