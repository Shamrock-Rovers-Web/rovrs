import { renderOffsitePreview } from './src/offsite-preview.js';

const maliciousOptions = {
  slug: 'test',
  destination: 'https://example.com/xss"><script>alert("xss")</script>',
  domain: 'example.com'
};

const html = renderOffsitePreview(maliciousOptions);

console.log('HTML contains script tag:', html.includes('<script>'));
console.log('HTML contains script close:', html.includes('</script>'));
console.log('HTML contains escaped script:', html.includes('&lt;script&gt;'));
console.log('HTML contains escaped alert:', html.includes('&lt;alert(&quot;xss&quot;)&gt;'));
console.log('Destination in HTML:', html.includes('https://example.com/xss&quot;&gt;&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'));