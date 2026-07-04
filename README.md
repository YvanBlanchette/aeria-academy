This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Private Certificate Signature

To avoid exposing a signature file through a public URL, configure a server-only path:

1. Store the signature image outside `public/` (for example: `private-assets/certificates/signature-yvan-blanchette.png`).
2. Add `CERTIFICATE_SIGNATURE_PATH` in `.env` with either:
   - an absolute path, or
   - a path relative to the project root.

Example:

```bash
CERTIFICATE_SIGNATURE_PATH=private-assets/certificates/signature-yvan-blanchette.png
```

If this variable is not set or the file is missing, certificate generation falls back to the text signature.

You can configure the certificate seal the same way:

```bash
CERTIFICATE_SEAL_PATH=private-assets/certificates/ava-seal-FR.png
```

If this variable is not set, the app will try these defaults in order:

1. `private-assets/certificates/ava-seal-FR.png`
2. `public/images/ava-seal-FR.png`
