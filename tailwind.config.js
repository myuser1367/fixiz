/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        vazir: ['Vazirmatn', 'Tahoma', 'Arial', 'sans-serif'],
        sans: ['Vazirmatn', 'sans-serif'], // جایگزین فونت پیش‌فرض
      },
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // فیروزه‌ای روشن
          600: '#0d9488', // فیروزه‌ای اصلی (Primary)
          700: '#0f766e', // فیروزه‌ای تیره
          800: '#115e59',
          900: '#134e4a',
          light: '#2dd4bf', // برای سازگاری با کدهای صفحه اصلی
          primary: '#0d9488', 
          dark: '#0f172a', // سرمه‌ای بسیار تیره برای هدر
          navy: '#1e293b',
        }
      },
      boxShadow: {
        'glow': '0 0 20px rgba(13, 148, 136, 0.4)', // هاله نور فیروزه‌ای برای دکمه‌های مهم
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}