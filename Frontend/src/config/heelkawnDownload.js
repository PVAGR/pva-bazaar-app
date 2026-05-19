/** HeelKawn Android playtest — served from pvabazaar.org after frontend deploy. */
export const HEELKAWN_DOWNLOAD = {
  /** Same-origin APK (filled by deploy-frontend CI from GitHub release). */
  siteApkPath: '/downloads/HeelKawn-android.apk',
  /** Direct GitHub release fallback if site copy is missing. */
  githubApkUrl:
    'https://github.com/PVAGR/HeelKawn1/releases/download/android-latest/HeelKawn-android.apk',
  releasesPage: 'https://github.com/PVAGR/HeelKawn1/releases/tag/android-latest',
  packageId: 'org.pvagr.heelkawn',
  versionName: '1.0',
  versionCode: 1,
};
