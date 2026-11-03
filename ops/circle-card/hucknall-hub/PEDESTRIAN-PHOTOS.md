# Pedestrianised Hucknall photo update

Trev supplied two replacement photographs on 3 November 2026. Use the market scene in the hero and the quieter pedestrianised High Street in the lower town gallery. Keep the church profile photograph and park photograph. These are the original supplied JPEGs, with no generated additions or edits.

The image descriptions match the new scenes. The credits identify the two supplied images separately from the dated Wikimedia church and park photographs. Photographer names, dates and a Creative Commons licence are not invented for the supplied photographs. The two remaining Wikimedia photographs retain their authors, dates, source links and CC BY-SA 2.0 attribution.

The pinned native installer copies the two JPEGs from the repository archive, validates each against its manifest SHA-256, then builds in an isolated release. It adds two exact image locations beside the existing verified town-photo routes. These aliases follow the new release and avoid the app's fallback redirect. The existing four routes and other hosts are retained. Nginx test, graceful switch and rollback remain part of the installer. The normal card identity and connection controls are retained. The local-business count also correctly uses the singular when one business is listed.

Status: prepared and locally checked; requires the pinned installer to run in the existing server SSH session. Direct SSH from this workspace is blocked. The previously deployed four-photo repair has already passed live browser acceptance, including the real ScaleSmiths image and reciprocal hub link.
