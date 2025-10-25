import { render, screen } from '@testing-library/react';
import App from './App';
import { ClerkProvider } from '@clerk/clerk-react';

test('renders learn react link', () => {
  render( 
  <ClerkProvider>
      <App />
    </ClerkProvider>
    );
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
