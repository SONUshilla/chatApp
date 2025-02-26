module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Ensure Tailwind scans all React files
  ],
 theme: {
    extend: {
      colors: {
        'background-color':"#ffffff",
        'submit-active-nav': '#2563eb', /* Submit button / Active nav */
        'input-text': '#A1824A',        /* Input box text */
        'toggle-bg': '#F5F0E5',         /* Toggle button background */
        'toggle-active-text': '#1C170D' /* Active button text */
      },
      boxShadow: {
        'custom': '0px 0px 4px rgba(0, 0, 0, 0.1)', // Customize your shadow
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'], // Set your desired font
      },
      
    },
  },
  plugins: [],
  
};
