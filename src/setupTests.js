// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
// import '@testing-library/jest-dom';
// src/setupTests.js
import '@testing-library/jest-dom';
import fetchMock from 'jest-fetch-mock';

// 🧩 Polyfill for jsPDF / XLSX
import { TextEncoder, TextDecoder } from 'util';
fetchMock.enableMocks();
if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder;
}
if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder;
}

// 🧩 Optional: mock jsPDF if needed to avoid real PDF creation
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    text: jest.fn(),
    save: jest.fn(),
  }));
});

jest.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }) => <div>{children}</div>,
  SignedIn: ({ children }) => <div>{children}</div>,
  SignedOut: ({ children }) => <div>{children}</div>,
  SignInButton: () => <button>Sign In</button>,
  useUser: () => ({ isSignedIn: true, user: { firstName: 'Test' } }),
}));






