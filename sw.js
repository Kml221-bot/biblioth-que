/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-64ce4f1b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-512x512.png",
    "revision": "81eaa5a3be1115c6e0f7f195bed5c44a"
  }, {
    "url": "pwa-192x192.png",
    "revision": "2e565ee7c946e48db5ed4ac61d1bb65e"
  }, {
    "url": "logo.svg",
    "revision": "b665301b61d0477301ca7bdb3243a81d"
  }, {
    "url": "logo-realistic.png",
    "revision": "c9c4d66705b21ef68baebf5a6e03ebe1"
  }, {
    "url": "index.html",
    "revision": "10f22fbcb12d0d7e39db43a79ad8e79b"
  }, {
    "url": "image.png",
    "revision": "481b609a1a95e9a9a173eb62cb6f374f"
  }, {
    "url": "auth-bg.png",
    "revision": "423686d0841e9c4eabe41b632b717885"
  }, {
    "url": "auth-bg-dark.png",
    "revision": "481b609a1a95e9a9a173eb62cb6f374f"
  }, {
    "url": "assets/vendor-BLw7466y.js",
    "revision": null
  }, {
    "url": "assets/useToast-DQzliXc1.js",
    "revision": null
  }, {
    "url": "assets/useSpeech-COBwYfxL.js",
    "revision": null
  }, {
    "url": "assets/Terms-DhEBotYP.js",
    "revision": null
  }, {
    "url": "assets/supabase-DnpPD4O5.js",
    "revision": null
  }, {
    "url": "assets/Security-DEieLZkF.js",
    "revision": null
  }, {
    "url": "assets/ResetPassword-DDvqwLL1.js",
    "revision": null
  }, {
    "url": "assets/Recommandations-Hm_iNPkv.js",
    "revision": null
  }, {
    "url": "assets/ReadingMode-43JmJ7y-.js",
    "revision": null
  }, {
    "url": "assets/react-core-DMeigGRh.js",
    "revision": null
  }, {
    "url": "assets/radix-ui-D1kCqBOy.js",
    "revision": null
  }, {
    "url": "assets/QuizPage-CJwt0QR5.js",
    "revision": null
  }, {
    "url": "assets/Profil-plwmyUaY.js",
    "revision": null
  }, {
    "url": "assets/Privacy-BpcmYSG6.js",
    "revision": null
  }, {
    "url": "assets/Pricing-_zAFl-eu.js",
    "revision": null
  }, {
    "url": "assets/pdf-viewer-DpNiOEW-.js",
    "revision": null
  }, {
    "url": "assets/offlineReader-EzykbtCg.js",
    "revision": null
  }, {
    "url": "assets/OfflineLibrary-DfzobxX6.js",
    "revision": null
  }, {
    "url": "assets/NotFound-Cxqn7lbz.js",
    "revision": null
  }, {
    "url": "assets/nestApiService-Bdd_-hLF.js",
    "revision": null
  }, {
    "url": "assets/motion-BjzJZ0Ek.js",
    "revision": null
  }, {
    "url": "assets/Marketplace-CZZAiwZK.js",
    "revision": null
  }, {
    "url": "assets/index-SXFUjvKS.css",
    "revision": null
  }, {
    "url": "assets/index-DaVwE9pL.js",
    "revision": null
  }, {
    "url": "assets/icons-BQAXreod.js",
    "revision": null
  }, {
    "url": "assets/Historique-BQ2REOIv.js",
    "revision": null
  }, {
    "url": "assets/Features-Cxf3mT60.js",
    "revision": null
  }, {
    "url": "assets/epubService-yFHPNOTi.js",
    "revision": null
  }, {
    "url": "assets/epub-reader-DSgGmzkv.js",
    "revision": null
  }, {
    "url": "assets/Emprunts-B-6IBkc2.js",
    "revision": null
  }, {
    "url": "assets/DashboardLayout-iUGl24D6.js",
    "revision": null
  }, {
    "url": "assets/Dashboard-_YS4IQLa.js",
    "revision": null
  }, {
    "url": "assets/Cookies-Dh7rclhv.js",
    "revision": null
  }, {
    "url": "assets/Contact-CjoJfAHR.js",
    "revision": null
  }, {
    "url": "assets/Communautes-CDSL-WAY.js",
    "revision": null
  }, {
    "url": "assets/CoinShop-C6iesDqb.js",
    "revision": null
  }, {
    "url": "assets/Classement-BcGHSbGy.js",
    "revision": null
  }, {
    "url": "assets/charts-s1bRT6To.js",
    "revision": null
  }, {
    "url": "assets/Catalogue-B9KUZB8H.js",
    "revision": null
  }, {
    "url": "assets/Card-DaJbZTQ0.js",
    "revision": null
  }, {
    "url": "assets/BookViewer-BG1HMmj8.js",
    "revision": null
  }, {
    "url": "assets/booksData-F5mb-cRO.js",
    "revision": null
  }, {
    "url": "assets/Blog-CistiWsW.js",
    "revision": null
  }, {
    "url": "assets/badgeSystem-CbP5edLg.js",
    "revision": null
  }, {
    "url": "assets/Badge-BtiEpznu.js",
    "revision": null
  }, {
    "url": "assets/AuthPage-Cx7w7jry.js",
    "revision": null
  }, {
    "url": "assets/AuthorSpace-Brcx8HCv.js",
    "revision": null
  }, {
    "url": "assets/authorService-C_BGCEmA.js",
    "revision": null
  }, {
    "url": "assets/AuthorDashboard-CGaGfz_o.js",
    "revision": null
  }, {
    "url": "assets/AIPage-BzoLreu1.js",
    "revision": null
  }, {
    "url": "assets/AIChat-CxlnFxQI.js",
    "revision": null
  }, {
    "url": "assets/AdminPanel-j8WLd0Ok.js",
    "revision": null
  }, {
    "url": "assets/About-BR2-twAB.js",
    "revision": null
  }, {
    "url": "assets/Abonnements-hMBl_zzI.js",
    "revision": null
  }, {
    "url": "logo-realistic.png",
    "revision": "c9c4d66705b21ef68baebf5a6e03ebe1"
  }, {
    "url": "logo.svg",
    "revision": "b665301b61d0477301ca7bdb3243a81d"
  }, {
    "url": "pwa-192x192.png",
    "revision": "2e565ee7c946e48db5ed4ac61d1bb65e"
  }, {
    "url": "pwa-512x512.png",
    "revision": "81eaa5a3be1115c6e0f7f195bed5c44a"
  }, {
    "url": "manifest.webmanifest",
    "revision": "7806384241c06f685742f1ffda812b76"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^never-cache-supabase-disabled$/i, new workbox.NetworkFirst({
    "cacheName": "supabase-api-cache",
    "networkTimeoutSeconds": 5,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 3600
    })]
  }), 'GET');
  workbox.registerRoute(/\.(?:png|jpg|jpeg|svg|gif|webp)$/i, new workbox.CacheFirst({
    "cacheName": "images-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 200,
      maxAgeSeconds: 2592000
    })]
  }), 'GET');
  workbox.registerRoute(({
    url
  }) => url.pathname.startsWith("/api/reader/proxy"), new workbox.NetworkFirst({
    "cacheName": "reader-proxy-cache",
    "networkTimeoutSeconds": 8,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 60,
      maxAgeSeconds: 21600
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/(.*\.)?(openlibrary\.org|archive\.org|gutenberg\.org|mangadex\.org)\/.*/i, new workbox.StaleWhileRevalidate({
    "cacheName": "reader-assets-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 180,
      maxAgeSeconds: 604800
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 31536000
    })]
  }), 'GET');

}));
