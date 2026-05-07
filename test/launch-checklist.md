# Launch Verification Checklist

Based on specification section 18 acceptance criteria.

## 18.1 Redirects

- [ ] Active links redirect correctly
- [ ] Unknown links redirect to `rov.rs/tickets`
- [ ] Expired links redirect to `rov.rs/tickets`
- [ ] Paused links redirect to `rov.rs/tickets`
- [ ] Offsite ticket links show a preview page before redirect
- [ ] Redirects work from `https://rov.rs/{slug}`

## 18.2 Admin

- [ ] Admin dashboard is available at separate hostname
- [ ] Cloudflare Access protects admin routes
- [ ] Authenticated users can create links
- [ ] Authenticated users can edit destinations
- [ ] Authenticated users can delete links
- [ ] Deleted slugs can be reused
- [ ] Users can search and filter links
- [ ] Users can copy a short link after creation

## 18.3 Social Variants

- [ ] User can generate social variants from a base link
- [ ] Variants use platform-specific UTM tags
- [ ] Variants can be copied individually

## 18.4 QR

- [ ] User can generate PNG QR codes
- [ ] User can generate PDF QR codes
- [ ] QR links can have expiry dates
- [ ] The UI warns when a QR link has an expiry date

## 18.5 Analytics

- [ ] Clicks are tracked per link
- [ ] Dashboard shows total clicks
- [ ] Dashboard shows clicks by day
- [ ] Dashboard shows clicks by channel
- [ ] Sponsor reports can be exported
- [ ] CSV export works
- [ ] UTM tags reach GA4 on destination pages

## 18.6 Operations

- [ ] Code lives in GitHub
- [ ] Push to main deploys to Cloudflare
- [ ] Health check route works
- [ ] Database export/backup is available

## Additional Launch Criteria

### Quick Create

- [ ] Auto-generated slugs work
- [ ] Matchday mode pre-fills correct fields
- [ ] Social variants with UTM tags generate correctly

### Batch Operations

- [ ] CSV import works
- [ ] CSV export works
- [ ] Bulk actions (delete, edit) work

### QR Code Features

- [ ] PNG QR generation (3 sizes)
- [ ] PDF QR generation with title
- [ ] Expiry warning for QR links

### Performance

- [ ] Page load times < 2s
- [ ] QR generation < 1s
- [ ] Search/filter responsive

### Security

- [ ] XSS protection on all inputs
- [ ] URL validation blocks malicious protocols
- [ ] Admin authentication secure
- [ ] Rate limiting on creation endpoints