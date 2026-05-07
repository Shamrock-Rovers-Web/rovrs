/**
 * Renders an HTML interstitial preview page for external domains
 * with Shamrock Rovers branding and mobile optimization
 */
/**
 * Simple HTML escaping utility
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderOffsitePreview(options) {
  const { slug, destination, domain } = options;

  // Escape URL for safety
  const escapedDestination = escapeHtml(destination);

  // Extract domain from destination URL
  const destDomain = new URL(destination).hostname;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Preview - ${slug} (rov.rs/${slug}) | rov.rs</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: #f0f0f0;
      color: #333;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      line-height: 1.6;
    }

    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      padding: 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 8px;
      background: #006A3E;
    }

    .logo {
      width: 120px;
      height: 120px;
      background: #006A3E;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 30px;
      font-size: 60px;
      color: white;
      font-weight: bold;
      font-family: 'Georgia', serif;
      position: relative;
    }

    .logo::after {
      content: 'SR';
      font-size: 48px;
    }

    h1 {
      color: #006A3E;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .subtitle {
      color: #666;
      font-size: 16px;
      margin-bottom: 30px;
    }

    .preview-info {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
      border-left: 4px solid #006A3E;
    }

    .preview-domain {
      font-size: 18px;
      font-weight: 600;
      color: #006A3E;
      margin-bottom: 8px;
    }

    .preview-url {
      font-size: 14px;
      color: #666;
      word-break: break-all;
      margin-bottom: 4px;
    }

    .slug {
      color: #006A3E;
      font-weight: 700;
      font-size: 20px;
    }

    .continue-btn {
      background: #006A3E;
      color: white;
      border: none;
      padding: 16px 40px;
      font-size: 18px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-block;
      text-decoration: none;
      margin-top: 20px;
      position: relative;
      overflow: hidden;
    }

    .continue-btn:hover {
      background: #005a32;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 106, 62, 0.3);
    }

    .continue-btn:active {
      transform: translateY(0);
      box-shadow: 0 2px 10px rgba(0, 106, 62, 0.3);
    }

    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
    }

    .security-note {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 20px;
      font-size: 14px;
      color: #856404;
    }

    /* Mobile optimizations */
    @media (max-width: 480px) {
      body {
        padding: 15px;
      }

      .container {
        padding: 30px 20px;
      }

      h1 {
        font-size: 24px;
      }

      .logo {
        width: 100px;
        height: 100px;
        font-size: 50px;
      }

      .logo::after {
        font-size: 40px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"></div>

    <h1>External Link Preview</h1>
    <p class="subtitle">You're about to leave rov.rs and visit an external website</p>

    <div class="security-note">
      ⚠️ This link directs to ${escapeHtml(domain)}, which is not part of rov.rs
    </div>

    <div class="preview-info">
      <div class="preview-domain">${destDomain}</div>
      <div class="preview-url">${escapedDestination}</div>
      <div style="margin-top: 8px; font-size: 14px; color: #888;">
        Short link: <span class="slug">rov.rs/${slug}</span> | ${slug} tickets
      </div>
    </div>

    <button class="continue-btn" onclick="continueToDestination()">
      Continue to ${escapeHtml(destDomain)} →
    </button>

    <div class="footer">
      <p>This preview page helps you verify where you're going before leaving rov.rs</p>
      <p style="margin-top: 8px;">Shamrock Rovers FC | Link Shortener</p>
    </div>
  </div>

  <script>
    // Track preview view analytics
    trackPreviewView();

    function continueToDestination() {
      // Track click before redirecting
      trackPreviewClick();

      // Redirect to destination
      window.location.href = '${destination}';
    }

    function trackPreviewView() {
      const analyticsData = {
        event: 'preview_view',
        slug: '${slug}',
        destination: '${destination}',
        domain: '${domain}',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer
      };

      // Use sendBeacon for reliable analytics
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(analyticsData)], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/preview', blob);
      }
    }

    function trackPreviewClick() {
      const analyticsData = {
        event: 'preview_click',
        slug: '${slug}',
        destination: '${destination}',
        domain: '${domain}',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer
      };

      // Use sendBeacon for reliable analytics
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(analyticsData)], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/preview', blob);
      }
    }

    // Track page visibility change for analytics
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        // Page hidden - could track session duration
      } else {
        // Page visible again
        trackPreviewView();
      }
    });
  </script>
</body>
</html>`;
}