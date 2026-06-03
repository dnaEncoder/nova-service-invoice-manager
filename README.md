# Nova Service Invoice Manager

A local-first React/Vite invoice manager for a service provider company.

## Features

- Client management
- Projects under each client
- Service invoice creator without quantity/rate fields
- Advance, milestone, monthly retainer, final payment, and one-time service invoice types
- Sent date, paid date, paid amount, pending amount tracking
- Project-wise payment summary
- Printable invoice preview / save as PDF through browser print
- Local browser persistence using localStorage

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown in your terminal.

## Dependency note

This project pins `@vitejs/plugin-react` to `^4.3.4`, which is compatible with Vite 5. Do not change it to `latest`, because newer plugin versions may require newer Vite versions and can cause an ERESOLVE dependency error.

## Reset local data

Because this app uses localStorage, clear the browser site data if you want to reset sample/client/invoice data.
