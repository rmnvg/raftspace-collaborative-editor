# services

Server-side data access and business logic (Supabase queries, document CRUD,
sharing rules, authorization checks). Route handlers and server actions call
into this layer instead of touching Supabase directly, keeping the client
free of any privileged credentials.

Not yet implemented — see NOTES.md.
