// URLs that point at this project rather than at opencode itself.
//
// This is the only place the rebrand has to touch for links: the repository is
// still named opencode-mobile and becomes LucaBiada/devmote with the rename.
// GitHub redirects the old path, so these keep working either way.
export const REPO_SLUG = "LucaBiada/opencode-mobile"
export const REPO_URL = `https://github.com/${REPO_SLUG}`
export const ISSUES_URL = `${REPO_URL}/issues`
export const RELEASES_PAGE = `${REPO_URL}/releases/latest`
export const RELEASES_API = `https://api.github.com/repos/${REPO_SLUG}/releases/latest`

// No hosted site yet, so both live in the repo. Replace with the Devmote domain
// when the site exists (docs/rebrand.md, step 4).
export const SETUP_GUIDE_URL = `${REPO_URL}#readme`
export const PRIVACY_POLICY_URL = `${REPO_URL}/blob/main/docs/privacy.md`
