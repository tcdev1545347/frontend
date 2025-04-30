# SafeDrop - File Sharing and Messaging Made Securely!

## Description

This cloud computing project is a web application built with React, TypeScript, and Vite. It offers a secure and responsive user experience for group creation, file sharing, and messaging. The application uses Amazon Web Services (AWS) for its robust backend capabilities.

Tech Stack:
* React
* TypeScript
* Vite

Additional Technologies For This Project:
* AWS Gateway, Lambda, S3, KMS, DynamoDB, Cloudwatch, IAM Policies
* HTML
* CSS (Tailwind CSS)
* Python
* JavaScript 

## Members and Their Respective Roles

1. Tien Cao - Back-End Developer & Cloud Computing Developer
2. Caitlin Chau - Front-End Developer
3. Justin Ramirez - Front-End Developer
4. Windly Nguyen - Project Manager & Front-End Developer

## Installation Instructions

1. Clone the repository or download all files:
```bash
  git clone <https://github.com/tcdev1545347/frontend>
```

2. With the Node.js terminal, install the dependencies:
```bash
  npm install
```

3. Run the server or project:
```bash
  npm run dev
```

4. Open the application in your preferred browser using the link given in the terminal.

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

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
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

