# MyInventory
A reliable and easy to use inventory manager web application. Myinventory is designed using JavaScript framework React.js for the front-end and Node.js which uses Express.js library for back-end. It uses MySQL to store users and their inventory information in the database.

## Features

- Sign up for a new one or login to your personal account.
- Add new items to the inventory.
- Edit the item details; delete the unwanted items.
- Toggle between light mode and dark mode
- Export your inventory item data to PDF and store it on your device.

## Technologies Used

### Frontend (React.js)

- `@emotion/react`, `@emotion/styled`: Styling components using Emotion.
- `@mui/icons-material`, `@mui/material`: Material-UI icons and components for UI.
- `axios`: Promise-based HTTP client for API requests.
- `http-proxy-middleware`: Middleware for backend proxy during development.
- `react`, `react-dom`: Core React libraries.
- `react-router-dom`: Library for handling routing in React.
- `react-scripts`: React development configurations and scripts.
- `styled-components`: Styling components with tagged template literals.
- `universal-cookie`: Universal cookie library for managing cookies.
- `react-redux`: React bindings for Redux state management.
- `redux-persist`: Persisting Redux store state in browser storage.
- `redux-thunk`: Redux middleware for handling asynchronous actions.
- `jwt-decode`: Library for decoding JSON Web Tokens (JWT).
- `pdf-lib`: Library for working with PDF documents programmatically.
- `@testing-library/jest-dom`, `@testing-library/react`, `@testing-library/user-event`: Testing utilities for React.
- `tailwindcss`: Utility-first CSS framework.

### Backend (Node.js)

- `body-parser`: Parse incoming request bodies in middleware.
- `cookie-parser`: Parse Cookie header and handle cookies.
- `dotenv`: Loads environment variables from a `.env` file.
- `ejs`: Template engine for rendering dynamic HTML templates.
- `express`: Web application framework for building APIs.
- `express-session`: Create and manage user sessions in Express.
- `jsonwebtoken`: Implementation of JSON Web Tokens (JWT) for authentication.
- `mysql`: Node.js driver for MySQL databases.
- `nodemon`: Utility to auto-restart application on file changes.

## Getting Started

1. Clone this repository to your local machine.
2. Install Node.js and npm (Node Package Manager) if not already installed.
3. Run `npm install` in `client` as well as `server` directory to install the required dependencies for the frontend and backend.
4. Set up environment variables by creating a `.env` file in the backend directory. Make sure to fill in the required values.
5. Run the backend server using `npm start` in the backend directory.
6. Run the frontend using `npm start` in the root directory.

## Contributing

We welcome contributions to improve the MyInventory application. If you find any bugs or have ideas for new features, feel free to open an issue or submit a pull request.
  
