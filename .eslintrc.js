module.exports = {
  extends: [
    "react-app", // Default CRA ESLint config
    "prettier", // Disables ESLint rules that conflict with Prettier
  ],
  plugins: ["prettier"], // Adds Prettier as an ESLint plugin
  rules: {
    "prettier/prettier": "warn",
  },
}