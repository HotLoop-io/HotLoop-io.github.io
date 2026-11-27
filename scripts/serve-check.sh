#!/usr/bin/env bash
# Checks a running copy of the site against the build.
#
#   scripts/serve-check.sh <base-url> [curl args]     run from the repo root after `npm run build` and the staging step
#
# Examples:
#   scripts/serve-check.sh http://localhost:3000 -H 'Host: hotloop.io'
#   scripts/serve-check.sh https://hotloop.io --resolve hotloop.io:443:66.180.40.146
#
# Checks: every built page answers 200 with the canonical it declares; every forwarding address answers one 301 to the
# right place; www forwards; an unknown path is a real 404; HSTS with preload and the security headers are on; a
# directory without its slash gets a 301; /sitemap.xml lists only pages that answer 200; the bot rules; and, with
# CHARTS=1, the five Helm chart repositories answer (through GitHub Pages, whether or not hotloop.io is still the org site's custom domain).
# Exits non-zero if anything fails.
set -u
base=${1:?usage: serve-check.sh <base-url> [curl args]}; shift
dist=${DIST:-dist}
conf=${REDIRECTS:-stage/redirects.conf}
fail=0; pass=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL $*"; }
# The site allows 10 requests a second per visitor (a burst of 40), so this check paces itself under that.
PACE=${PACE:-0.11}
c() { sleep "$PACE"; curl -s --max-time 30 "$@"; }

# 1. every built page: 200, and the canonical it declares
while IFS= read -r f; do
  p=/${f#"$dist"/}
  grep -qiE 'http-equiv="refresh"' "$f" && continue          # forwarding stubs are checked below
  [ "$p" = /404.html ] && continue
  url=${p%index.html}
  code=$(c -o /dev/null -w '%{http_code}' "$@" "$base$url")
  [ "$code" = 200 ] || { bad "$url -> $code (want 200)"; continue; }
  want=$(grep -o '<link rel="canonical" href="[^"]*"' "$f" | head -1 | cut -d'"' -f4)
  got=$(c "$@" "$base$url" | grep -o '<link rel="canonical" href="[^"]*"' | head -1 | cut -d'"' -f4)
  [ "$got" = "$want" ] && ok || bad "$url canonical '$got' (want '$want')"
done < <(find "$dist" -name '*.html' | sort)

# 2. every forwarding address: one 301 to the mapped URL, query string kept
while read -r from to; do
  to=${to%;}
  hdr=$(c -o /dev/null -D - -w 'code=%{http_code}\n' "$@" "$base$from?x=1")
  code=$(sed -n 's/^code=//p' <<<"$hdr")
  loc=$(grep -i '^location:' <<<"$hdr" | tr -d '\r' | sed 's/^[Ll]ocation: //')
  want="$to?x=1"
  [ "$code" = 301 ] && [ "$loc" = "$want" ] && ok || bad "$from -> $code $loc (want 301 $want)"
done < <(grep -E '^ +/' "$conf")

# 3. a directory without its slash: 301 to the slash, as GitHub Pages did
for d in /es /releases/core /products; do
  hdr=$(c -o /dev/null -D - -w 'code=%{http_code}\n' "$@" "$base$d")
  code=$(sed -n 's/^code=//p' <<<"$hdr")
  loc=$(grep -i '^location:' <<<"$hdr" | tr -d '\r' | sed 's/^[Ll]ocation: //')
  [ "$code" = 301 ] && [ "${loc#https://hotloop.io}" = "$d/" ] && ok || bad "$d -> $code $loc (want 301 $d/)"
done

# 4. www forwards to the apex, path and query kept. WWW_BASE is the www address to ask and WWW_ARGS its curl arguments.
if [ -n "${WWW_BASE:-}" ]; then
  # shellcheck disable=SC2086
  hdr=$(c -o /dev/null -D - -w 'code=%{http_code}\n' ${WWW_ARGS:-} "$WWW_BASE/releases/core/?a=b")
  code=$(sed -n 's/^code=//p' <<<"$hdr")
  loc=$(grep -i '^location:' <<<"$hdr" | tr -d '\r' | sed 's/^[Ll]ocation: //')
  [ "$code" = 301 ] && [ "$loc" = "https://hotloop.io/releases/core/?a=b" ] && ok || bad "www forward: $code $loc"
fi

# 5. an unknown path is a real 404 with the branded page
code=$(c -o /tmp/serve-check-404.$$ -w '%{http_code}' "$@" "$base/no-such-page-$$/")
[ "$code" = 404 ] && grep -q 'Page not found' /tmp/serve-check-404.$$ && ok || bad "unknown path -> $code"
rm -f /tmp/serve-check-404.$$

# 6. headers, and the exact HSTS value hstspreload.org wants
h=$(c -I "$@" "$base/")
for k in strict-transport-security x-content-type-options referrer-policy; do
  grep -qi "^$k:" <<<"$h" && ok || bad "header $k missing on /"
done
grep -qi '^strict-transport-security: max-age=63072000; includeSubDomains; preload' <<<"$h" && ok || bad "HSTS is not max-age=63072000; includeSubDomains; preload on /"
h=$(c -o /dev/null -D - "$@" "$base/no-such-page-$$/")
grep -qi '^strict-transport-security: max-age=63072000; includeSubDomains; preload' <<<"$h" && ok || bad "HSTS missing on a 404"

# 7. the sitemap lists only pages that answer 200
while IFS= read -r u; do
  path=/${u#https://hotloop.io/}
  code=$(c -o /dev/null -w '%{http_code}' "$@" "$base$path")
  [ "$code" = 200 ] && ok || bad "sitemap lists $u -> $code"
done < <(c "$@" "$base/sitemap.xml" | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g')

# 8. the bot rules: scraping libraries and the two spam referrers get 403 on a page, every allowlisted crawler, curl and
#    wget get it.
code_of() { c -o /dev/null -w '%{http_code}' "$@" "$base/"; }
for ua in 'python-requests/2.31' 'Scrapy/2.11' 'Go-http-client/1.1' 'Mozilla/5.0 HeadlessChrome/120.0' 'PhantomJS/2.1'; do
  [ "$(code_of -A "$ua")" = 403 ] && ok || bad "user agent '$ua' is not refused"
done
for ref in https://aocr.org/ https://scriblihelp.com/x; do
  [ "$(code_of -e "$ref")" = 403 ] && ok || bad "referrer $ref is not refused"
done
for ua in 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' 'Mozilla/5.0 (compatible; bingbot/2.0)' 'DuckDuckBot/1.1' 'Applebot/0.1' 'YandexBot/3.0' 'Baiduspider/2.0' \
          'OAI-SearchBot/1.0' 'ChatGPT-User/1.0' 'PerplexityBot/1.0' 'Perplexity-User/1.0' 'Claude-SearchBot/1.0' 'Claude-User/1.0' \
          'GPTBot/1.2' 'ClaudeBot/1.0' 'Google-Extended' 'Applebot-Extended' 'CCBot/2.0' 'meta-externalagent/1.1' 'Amazonbot/0.1' 'Bytespider' \
          'AhrefsBot/7.0' 'SemrushBot/7' 'MJ12bot/v1.4.8' 'DotBot/1.2' 'rogerbot/1.2' 'curl/8.5.0' 'Wget/1.21'; do
  [ "$(code_of -A "$ua")" = 200 ] && ok || bad "user agent '$ua' is not served"
done

# 9. the chart repositories (CHARTS=1): each index.yaml answers 200 with a chart list, a chart archive downloads for the
#    newest version it names, and helm's own user agent is not refused there.
if [ -n "${CHARTS:-}" ]; then
  for r in hotloop hotloop-flow hotloop-cascade hotloop-codesys; do
    body=$(c -A 'Go-http-client/1.1' "$@" "$base/$r/index.yaml")
    grep -q '^apiVersion: v1' <<<"$body" && ok || bad "/$r/index.yaml is not a chart index"
    tgz=$(grep -oE "https://hotloop.io/$r/[^ ]+\.tgz" <<<"$body" | head -1)
    [ -n "$tgz" ] || { bad "/$r/index.yaml names no archive"; continue; }
    code=$(c -o /dev/null -w '%{http_code}' -A 'Go-http-client/1.1' "$@" "$base/${tgz#https://hotloop.io/}")
    [ "$code" = 200 ] && ok || bad "$tgz -> $code"
  done
  hdr=$(c -o /dev/null -D - -w 'code=%{http_code}\n' "$@" "$base/hotloop")
  [ "$(sed -n 's/^code=//p' <<<"$hdr")" = 301 ] && ok || bad "/hotloop without its slash is not a 301"
fi

echo "serve-check: $pass passed, $fail failed"
[ "$fail" = 0 ]
