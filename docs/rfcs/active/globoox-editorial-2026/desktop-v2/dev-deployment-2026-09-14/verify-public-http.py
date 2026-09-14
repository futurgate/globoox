#!/usr/bin/env python3
"""Public HTTP-only deployment verification. No cookies, auth, browser or account API."""
import argparse
import concurrent.futures
import datetime
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = 'https://dev.globoox.co'
ROOT = Path(__file__).resolve().parent
EXPECTED = json.loads((ROOT / 'expected-how-copy.json').read_text())
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

def normalize(text):
    return ' '.join(text.split())

class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.links = []
        self.scripts = []
        self.images = []
        self.meta = []
        self.jsonld = []
        self.ld_current = None
        self.skip = None
        self.how_depth = 0
        self.how_text = []
        self.text = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'): self.ids.append(attrs['id'])
        if tag == 'link': self.links.append(attrs)
        if tag == 'meta': self.meta.append(attrs)
        if tag == 'img': self.images.append(attrs)
        if tag == 'section':
            if self.how_depth: self.how_depth += 1
            elif attrs.get('id') == 'how-it-works': self.how_depth = 1
        if tag in ('script', 'style'):
            self.skip = tag
            if tag == 'script':
                self.scripts.append(attrs)
                if attrs.get('type') == 'application/ld+json': self.ld_current = []
    def handle_endtag(self, tag):
        if tag == 'section' and self.how_depth: self.how_depth -= 1
        if tag == self.skip:
            if tag == 'script' and self.ld_current is not None:
                self.jsonld.append(''.join(self.ld_current))
                self.ld_current = None
            self.skip = None
    def handle_data(self, data):
        if self.ld_current is not None: self.ld_current.append(data)
        if self.skip: return
        self.text.append(data)
        if self.how_depth: self.how_text.append(data)

class PublicRedirectsOnly(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urllib.parse.urlsplit(newurl)
        if parsed.scheme != 'https' or parsed.netloc != 'dev.globoox.co':
            raise RuntimeError('Unexpected off-origin redirect: ' + newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def fetch(path, ranged=False):
    url = urllib.parse.urljoin(BASE, path)
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != 'https' or parsed.netloc != 'dev.globoox.co':
        raise ValueError('Only the authorized public development hostname is allowed')
    headers = {'User-Agent':'Globoox-Deployment-Verification/1.0', 'Accept-Encoding':'identity'}
    if ranged: headers['Range'] = 'bytes=0-1023'
    request = urllib.request.Request(url, headers=headers)
    # A fresh opener carries no cookies or account authentication.
    with urllib.request.build_opener(PublicRedirectsOnly()).open(request, timeout=25) as response:
        limit = 131072 if ranged else 2097152
        body = response.read(limit)
        return {
            'status':response.status,
            'url':response.url,
            'content_type':response.headers.get('Content-Type', ''),
            'content_range':response.headers.get('Content-Range'),
            'x_robots_tag':response.headers.get('X-Robots-Tag'),
            'sample_bytes':len(body),
            'sample_sha256':hashlib.sha256(body).hexdigest(),
        }, body

def web_apps(value):
    if isinstance(value, list): return sum((web_apps(x) for x in value), [])
    if not isinstance(value, dict): return []
    kind = value.get('@type', [])
    count = [value] if kind == 'WebApplication' or (isinstance(kind, list) and 'WebApplication' in kind) else []
    return count + sum((web_apps(x) for x in value.values() if isinstance(x, (dict,list))), [])

def verify_page(spec):
    path, locale, kind = spec
    result = {'path':path,'kind':kind,'locale':locale,'checks':{}}
    try:
        info, body = fetch(path)
        result.update(info)
        parser = Document()
        parser.feed(body.decode('utf-8'))
        declarations = [json.loads(x) for x in parser.jsonld]
        apps = sum((web_apps(x) for x in declarations), [])
        canonical = [x.get('href') for x in parser.links if x.get('rel') == 'canonical']
        robots = [x.get('content','') for x in parser.meta if x.get('name','').lower() in ('robots','googlebot')]
        result['canonical'] = canonical
        result['robots'] = robots
        result['web_application_count'] = len(apps)
        result['checks']['status_200'] = info['status'] == 200
        result['checks']['same_path'] = urllib.parse.urlsplit(info['url']).path == path
        result['checks']['single_correct_canonical_path'] = len(canonical) == 1 and urllib.parse.urlsplit(canonical[0]).path == path
        result['checks']['html_content_type'] = 'text/html' in info['content_type']
        result['checks']['expected_web_application_count'] = len(apps) == (1 if kind == 'published' else 0)
        if kind == 'published':
            result['checks']['localized_structured_data'] = len(apps) == 1 and apps[0].get('inLanguage') == locale and urllib.parse.urlsplit(apps[0].get('url','')).path == path
        else:
            result['checks']['meta_noindex'] = any('noindex' in x.lower() for x in robots)
        if kind == 'legal':
            result['checks']['legal_title_marker'] = parser.ids.count('legal-title') == 1
            result['checks']['explicit_draft_label'] = 'Draft for review · Not yet published' in normalize(' '.join(parser.text))
        else:
            result['checks']['editorial_title_marker'] = parser.ids.count('editorial-title') == 1
            usage = EXPECTED['locales'][locale]
            steps = [part for step in usage['steps'] for part in (step['step'],step['description'])]
            expected = normalize(' '.join([usage['label'],usage['heading'],*steps,*steps]))
            actual = normalize(' '.join(parser.how_text))
            result['checks']['how_copy_exact_no_added_note'] = actual == expected
            result['how_text_sha256'] = hashlib.sha256(actual.encode()).hexdigest()
            if actual != expected:
                result['how_actual'] = actual
                result['how_expected'] = expected
        result['passed'] = all(result['checks'].values())
        assets = {
            'css':[x['href'] for x in parser.links if x.get('rel') == 'stylesheet' and x.get('href','').startswith('/_next/')],
            'js':[x['src'] for x in parser.scripts if x.get('src','').startswith('/_next/')],
            'optimized_image':[x['src'] for x in parser.images if x.get('src','').startswith('/_next/image?')],
        }
        return result, assets
    except Exception as error:
        result.update(passed=False,error=str(error))
        return result, {}

def verify_asset(spec):
    category, path = spec
    result = {'category':category,'path':path}
    try:
        info, body = fetch(path, ranged=True)
        result.update(info)
        media = {'css':('text/css',),'js':('javascript',),'image':('image/',),'optimized_image':('image/',),'video':('video/mp4',)}
        result['checks'] = {
            'status_200_or_206':info['status'] in (200,206),
            'nonempty_body':bool(body),
            'expected_content_type':any(x in info['content_type'] for x in media[category]),
        }
        result['passed'] = all(result['checks'].values())
    except Exception as error:
        result.update(passed=False,error=str(error))
    return result

def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument('--run', action='store_true', help='Explicitly begin public HTTP verification after deployment READY.')
    options = args.parse_args()
    if not options.run:
        print('Prepared only. Run with --run after READY.')
        return 0
    locales = ('en','es','fr','ru')
    specs = [(f'/{loc}',loc,'published') for loc in locales]
    specs += [('/landing-editorial','en','preview')]
    specs += [(f'/landing-editorial/{loc}',loc,'preview') for loc in locales]
    specs += [(f'/landing-editorial/legal/{doc}','en','legal') for doc in ('terms','privacy')]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(pool.map(verify_page,specs))
    pages = [response[0] for response in responses]
    sources = responses[0][1]
    assets = [(key,url) for key in ('css','js','optimized_image') for url in sources.get(key,[])[:1]]
    assets += [('image','/redesign/hero-botanical/ginkgo.png'),('image','/icon.svg')]
    assets += [('video','/screenrecordings/' + name) for name in ('mac_screen_record_1280w_h264.mp4','ipad_screen_record_768x1170_h264.mp4','iphone_screen_record_540x1170_h264.mp4')]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        asset_results = list(pool.map(verify_asset,assets))
    categories = {x['category'] for x in asset_results}
    report = {
        'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'base_url':BASE,
        'expected_commit':EXPECTED['sha'],
        'method':'Public HTTP requests only; no cookies, auth, browser or account APIs. Source identity is verified separately by root via deployment API.',
        'pages':pages,
        'assets':asset_results,
        'asset_categories_complete':{'css','js','image','video','optimized_image'} <= categories,
        'limitations':['No hydration, layout, keyboard, playback, or authenticated user behavior tested. A Vercel preview X-Robots-Tag may supplement page robots metadata.'],
    }
    report['passed'] = all(x['passed'] for x in pages+asset_results) and report['asset_categories_complete']
    output = ROOT / 'report.json'
    output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'passed':report['passed'],'page_count':len(pages),'asset_count':len(asset_results),'failed_pages':[x['path'] for x in pages if not x['passed']],'failed_assets':[x['path'] for x in asset_results if not x['passed']],'report':str(output)},ensure_ascii=False,indent=2))
    return 0 if report['passed'] else 1

if __name__ == '__main__':
    sys.exit(main())
