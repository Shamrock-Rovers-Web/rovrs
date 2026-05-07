import { renderOffsitePreview } from '../packages/redirect-worker/src/offsite-preview';

describe('renderOffsitePreview', () => {
  const testOptions = {
    slug: 'tickets',
    destination: 'https://tickets.shamrockrovers.ie/booking',
    domain: 'tickets.shamrockrovers.ie'
  };

  test('renders preview page for external domain', () => {
    const html = renderOffsitePreview(testOptions);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('External Link Preview');
    expect(html).toContain('You\'re about to leave rov.rs and visit an external website');
    expect(html).toContain('rov.rs/tickets');
  });

  test('includes mobile-optimized viewport meta tag', () => {
    const html = renderOffsitePreview(testOptions);

    expect(html).toContain('name="viewport"');
    expect(html).toContain('width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  });

  test('uses Shamrock Rovers brand colors and styling', () => {
    const html = renderOffsitePreview(testOptions);

    expect(html).toContain('#006A3E'); // Shamrock green
    expect(html).toContain('background: #006A3E');
    expect(html).toContain('color: #006A3E');
    expect(html).toContain('SR'); // Shamrock Rovers initials in logo
  });

  test('generates unique page with specific slug and domain', () => {
    const html = renderOffsitePreview(testOptions);

    expect(html).toContain('rov.rs/tickets');
    expect(html).toContain('https://tickets.shamrockrovers.ie/booking');
    expect(html).toContain('tickets.shamrockrovers.ie');

    // Ensure slug appears multiple times
    expect((html.match(/rov.rs\/tickets/g) || []).length).toBeGreaterThan(1);
  });

  test('contains continue button with hover effects', () => {
    const html = renderOffsitePreview(testOptions);

    expect(html).toContain('Continue →');
    expect(html).toContain('.continue-btn:hover');
    expect(html).toContain('transform: translateY(-2px)');
    expect(html).toContain('box-shadow: 0 6px 20px rgba(0, 106, 62, 0.3)');
  });

  test('includes analytics tracking script', () => {
    const html = renderOffsitePreview(testOptions);

    expect(html).toContain('navigator.sendBeacon');
    expect(html).toContain('trackPreviewView');
    expect(html).toContain('trackPreviewClick');
    expect(html).toContain('/api/analytics/preview');
  });

  test('escapes HTML in destination URL', () => {
    const maliciousOptions = {
      slug: 'test',
      destination: 'https://example.com/xss"><script>alert("xss")</script>',
      domain: 'example.com'
    };

    const html = renderOffsitePreview(maliciousOptions);

    // Should be escaped in the URL
    expect(html).toContain('https://example.com/xss%22%3E%3Cscript%3Ealert(%22xss%22)%3C/script%3E');
    // Should not contain the actual script tag
    expect(html).not.toContain('<script>alert("xss")</script>');
  });

  test('handles complex URLs with special characters', () => {
    const complexOptions = {
      slug: 'match-day',
      destination: 'https://tickets.shamrockrovers.ie/event/2024/shamrock-rovers-vs-bohemians/stand-112/row-5/seat-23?utm_source=social&utm_medium=twitter&utm_campaign=season-ticket',
      domain: 'tickets.shamrockrovers.ie'
    };

    const html = renderOffsitePreview(complexOptions);

    expect(html).toContain('match-day');
    expect(html).toContain('rov.rs/match-day');
  });

  test('includes security warning for external links', () => {
    const html = renderOffsitePreview(testOptions);

    expect(html).toContain('⚠️ This link directs to tickets.shamrockrovers.ie, which is not part of rov.rs');
    expect(html).toContain('.security-note');
    expect(html).toContain('background: #fff3cd');
  });

  test('creates accessible semantic HTML structure', () => {
    const html = renderOffsitePreview(testOptions);

    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>Preview - tickets | rov.rs</title>');
    expect(html).toContain('<meta charset="UTF-8">');
    expect(html).toContain('alt="Shamrock Rovers"'); // Should add alt text for logo
  });

  test('generates QR code link placeholder', () => {
    const html = renderOffsitePreview({
      slug: 'shop',
      destination: 'https://shop.shamrockrovers.ie/jersey',
      domain: 'shop.shamrockrovers.ie'
    });

    expect(html).toContain('rov.rs/shop');
    expect(html).toContain('https://shop.shamrockrovers.ie/jersey');
  });

  test('respects mobile viewport constraints', () => {
    const html = renderOffsitePreview(testOptions);

    expect(html).toContain('maximum-scale=1.0');
    expect(html).toContain('user-scalable=no');

    // Check mobile-specific media queries
    expect(html).toContain('@media (max-width: 480px)');
    expect(html).toContain('font-size: 24px');
  });
});