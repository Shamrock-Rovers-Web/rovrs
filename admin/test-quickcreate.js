// Simple test to verify QuickCreate component can be imported
try {
  // Mock React and ReactDOM
  global.React = {
    useState: jest.fn(() => [jest.fn(), jest.fn()]),
    useEffect: jest.fn(),
  };

  global.ReactDOM = {
    render: jest.fn(),
  };

  global.ReactRouterDOM = {
    BrowserRouter: ({ children }) => children,
    useNavigate: () => jest.fn(),
    useLocation: () => ({ search: '' }),
  };

  // Mock @rovrs/shared
  jest.mock('@rovrs/shared', () => ({
    validateDestinationURL: jest.fn(),
    generateSlug: () => 'abc123',
  }));

  // Try to import the component
  const QuickCreate = await import('./src/pages/QuickCreate.tsx');
  console.log('✓ QuickCreate component imported successfully');

  // Clean up
  if (require.cache[require.resolve('./test-quickcreate.js')]) {
    delete require.cache[require.resolve('./test-quickcreate.js')];
  }

} catch (error) {
  console.error('✗ Error importing QuickCreate:', error.message);
}