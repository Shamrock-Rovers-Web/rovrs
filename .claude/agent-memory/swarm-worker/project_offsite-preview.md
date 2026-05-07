---
name: Offsite Preview Implementation
description: Learnings from implementing the external domain preview page
type: project
---

Successfully implemented the offsite preview page with the following key learnings:

1. **HTML Security**: Must escape all user-provided data, especially URLs that could contain XSS attacks. The escapeHtml() function is essential for sanitizing input.

2. **Mobile Optimization**: The viewport meta tag with `maximum-scale=1.0, user-scalable=no` ensures consistent mobile experience but may impact accessibility for some users.

3. **Brand Integration**: Using Shamrock Rovers brand colors (#006A3E) and initials (SR) in the logo creates immediate brand recognition.

4. **Analytics Implementation**: navigator.sendBeacon() is reliable for analytics tracking as it works even when the page is unloading.

5. **Responsive Design**: Media queries for max-width: 480px ensure the preview works well on mobile devices.

6. **Testing Strategy**: Created comprehensive tests covering:
   - Basic rendering functionality
   - Mobile viewport configuration
   - Brand color usage
   - Unique content generation
   - Button interactions
   - Analytics tracking
   - Security warnings
   - XSS protection

The implementation follows the specification requirements exactly and provides a secure, user-friendly preview experience for external links.