# Xiaohongshu API Dashboard

This project is a control panel for calling the Xiaohongshu API, built with React, TypeScript, and Vite. It includes features such as language context with local storage persistence and various scripts for development and production.

## Getting Started

### Development

To start the development server, run:

```bash
npm run dev
```

### Build

To build the project for production, run:

```bash
npm run build
```

### Start

To start the production server, run:

```bash
npm run start
```

### Server

To start the server for handling API requests, run:

```bash
npm run server
```

## Logging Successful Comments

To log a successful comment, you can use the following code snippet:

```js
// Log the successful comment
await addCommentLog(
  task.id,
  note.id,
  note.note_card?.display_title || "Unknown Title",
  comment,
  true
);
```

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    "react-x": reactX,
    "react-dom": reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs["recommended-typescript"].rules,
    ...reactDom.configs.recommended.rules,
  },
});
```
