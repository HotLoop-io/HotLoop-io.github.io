// Pages that answer 200 but do not belong in the sitemap: the 404 page and the legal
// boilerplate. The sitemap lists only the pages we want found. Shared by the build and
// by seo-audit, so the audit and the sitemap can never disagree.
export const NOT_IN_SITEMAP = /\/(404|privacy|terms|license)\/?$/;
