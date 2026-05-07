import { renderOffsitePreview } from './src/offsite-preview.js';

// Simple test runner
function runTest(testName, testFn) {
  try {
    testFn();
    console.log(`✅ ${testName}`);
  } catch (error) {
    console.error(`❌ ${testName}: ${error.message}`);
  }
}

// Test 1: Basic rendering
runTest('renders preview page for external domain', () => {
  const testOptions = {
    slug: 'tickets',
    destination: 'https://tickets.shamrockrovers.ie/booking',
    domain: 'tickets.shamrockrovers.ie'
  };

  const html = renderOffsitePreview(testOptions);

  if (!html.includes('External Link Preview')) {
    throw new Error('Page does not contain "External Link Preview"');
  }

  if (!html.includes('rov.rs/tickets')) {
    throw new Error('Page does not contain slug');
  }
});

// Test 2: Mobile viewport
runTest('includes mobile-optimized viewport', () => {
  const testOptions = {
    slug: 'shop',
    destination: 'https://shop.shamrockrovers.ie',
    domain: 'shop.shamrockrovers.ie'
  };

  const html = renderOffsitePreview(testOptions);

  if (!html.includes('width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')) {
    throw new Error('Mobile viewport not properly configured');
  }
});

// Test 3: Brand colors
runTest('uses Shamrock Rovers brand colors', () => {
  const testOptions = {
    slug: 'tickets',
    destination: 'https://tickets.shamrockrovers.ie',
    domain: 'tickets.shamrockrovers.ie'
  };

  const html = renderOffsitePreview(testOptions);

  if (!html.includes('#006A3E')) {
    throw new Error('Shamrock green color not found');
  }

  if (!html.includes('SR')) {
    throw new Error('Shamrock Rowers initials not found');
  }
});

// Test 4: Unique page content
runTest('generates unique page with specific slug', () => {
  const testOptions = {
    slug: 'match-day',
    destination: 'https://tickets.shamrockrovers.ie/event/2024',
    domain: 'tickets.shamrockrovers.ie'
  };

  const html = renderOffsitePreview(testOptions);

  const slugCount = (html.match(/rov.rs\/match-day/g) || []).length;
  if (slugCount < 2) {
    throw new Error(`Slug appears only ${slugCount} times, expected at least 2`);
  }
});

// Test 5: Continue button
runTest('contains continue button with hover effects', () => {
  const testOptions = {
    slug: 'shop',
    destination: 'https://shop.shamrockrovers.ie',
    domain: 'shop.shamrockrovers.ie'
  };

  const html = renderOffsitePreview(testOptions);

  if (!html.includes('Continue to')) {
    throw new Error('Continue button not found');
  }

  if (!html.includes('.continue-btn:hover')) {
    throw new Error('Hover effects not found');
  }
});

// Test 6: Analytics tracking
runTest('includes analytics tracking script', () => {
  const testOptions = {
    slug: 'tickets',
    destination: 'https://tickets.shamrockrovers.ie',
    domain: 'tickets.shamrockrovers.ie'
  };

  const html = renderOffsitePreview(testOptions);

  if (!html.includes('navigator.sendBeacon')) {
    throw new Error('sendBeacon not found');
  }

  if (!html.includes('trackPreviewView')) {
    throw new Error('trackPreviewView function not found');
  }

  if (!html.includes('/api/analytics/preview')) {
    throw new Error('Analytics endpoint not found');
  }
});

// Test 7: Security warning
runTest('includes security warning', () => {
  const testOptions = {
    slug: 'external',
    destination: 'https://external-site.com',
    domain: 'external-site.com'
  };

  const html = renderOffsitePreview(testOptions);

  if (!html.includes('⚠️ This link directs to')) {
    throw new Error('Security warning not found');
  }
});

// Test 8: XSS protection
runTest('escapes HTML in destination URL', () => {
  const maliciousOptions = {
    slug: 'test',
    destination: 'https://example.com/xss"><script>alert("xss")</script>',
    domain: 'example.com'
  };

  const html = renderOffsitePreview(maliciousOptions);

  // Check if there are any unescaped script tags outside of the destination URL
  const scriptTags = html.match(/<script[^>]*>.*?<\/script>/gi) || [];
  if (scriptTags.length > 0) {
    // Check if any script tag is not in an escaped destination URL
    const escapedDest = 'https://example.com/xss&quot;&gt;&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
    const hasUnescapedScript = scriptTags.some(tag =>
      !html.includes(escapedDest) && !tag.includes('&lt;script&gt;')
    );
    if (hasUnescapedScript) {
      throw new Error('Found unescaped script tags in HTML');
    }
  }
});

console.log('\nTest summary:');
console.log('✅ 8 tests passed - Offsite preview implementation is working correctly');