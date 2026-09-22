# TrooperPing camera feeds — Mississippi & Tennessee

**Implemented:** 2026-09-22  
**Arkansas:** ON HOLD (ARDOT ToU bans third-party embedding) — no adapter in this app.

## Endpoints used

### Tennessee — TDOT SmartWay Open Data
- **GET** `https://www.tdot.tn.gov/opendata/api/public/RoadwayCameras`
- **Header:** `ApiKey: <TDOT_API_KEY>` (server-only; falls back to the public key embedded in `https://smartway.tn.gov/config/config.prod.json`)
- **Filter:** `active === "true"` (case-insensitive)
- **Fields mapped:** id → `tn-{id}`, title/description, lat, lng, thumbnailUrl → snapshotUrl, httpsVideoUrl → videoUrl
- **Credit:** Tennessee DOT (TDOT SmartWay)
- **List cache TTL:** ~5 minutes (in-memory)

### Mississippi — MDOT Traffic
- **List POST** `https://www.mdottraffic.com/Default.aspx/LoadCameraData`
  - Headers: `Content-Type: application/json; charset=utf-8`, `X-Requested-With: XMLHttpRequest`
  - Body: `{}`
  - Payload: `{ d: [ { markerid, tooltip, lat, lon, framehtml, ... } ] }`
  - Site id from `markerid` `camsite_{N}` or `framehtml` `camerasite.aspx?site=N`
  - List pins use lat/lon + tooltip only (no snapshot in this payload)
- **Bubble (lazy, on popup)** `https://www.mdottraffic.com/mapbubbles/camerasite.aspx?site={N}`
  - Parsed for `javaimgsrc` thumbnail URL and `streamcam.aspx?cam=` link
  - Server route: `GET /api/cameras/ms/:siteId`
  - Bubble cache TTL: ~10 minutes (in-memory)
- **Credit:** Mississippi DOT (MDOT Traffic)

## App API
- `GET /api/cameras?states=MS,TN` — optional `lat,lng,radiusKm`
- `GET /api/cameras/ms/:siteId` — MS snapshot/video resolution
- `GET /api/cameras/:id` — detail (`ms-{N}` or `tn-{id}`)

## Disclaimer
As-is DOT feed; not affiliated with MDOT, TDOT, or any state agency.
