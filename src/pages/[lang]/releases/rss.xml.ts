import type { APIContext } from 'astro';
import { feed } from '../../../lib/feed';
import { OTHERS, byCode } from '../../../i18n/locales';

// The release feed in each of the other thirteen languages, at /<language>/releases/rss.xml.
export function getStaticPaths() {
  return OTHERS.map((l) => ({ params: { lang: l.path }, props: { code: l.code } }));
}

export async function GET(context: APIContext) {
  return feed(context.site!, (context.props as { code: string }).code ?? byCode('en').code);
}
