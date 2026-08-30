// The public chrome and home page share the catalogue-only CMS preview hook.
// Keeping this small facade lets every caller remain draft-aware without
// importing the compatibility content aggregator (and therefore docs bodies).
export { useAbout } from "./cmsPreview";
