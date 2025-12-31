# Cloudflare Cache Purge

This repository includes a helper script to purge the Cloudflare cache after deployments to GitHub Pages.

## Prerequisites
- Cloudflare API token with `Zone.Cache Purge` permission.
- Your Cloudflare zone ID for `pvabazaar.org`.

## Usage
Export the required environment variables, then run the script:

```
export CF_ZONE_ID="<your-zone-id>"
export CF_API_TOKEN="<your-api-token>"
./scripts/purge-cloudflare-cache.sh
```

The script prints the API response and writes it to `/tmp/cloudflare_purge.json`. It exits non-zero if the purge fails.

## Notes
- Purging everything is instant but propagation across edges may take ~30–60 seconds.
- If you prefer manual purge: Cloudflare Dashboard → Caching → Configuration → "Purge Everything".
- For targeted purges (e.g., specific URLs), extend the script payload accordingly.
