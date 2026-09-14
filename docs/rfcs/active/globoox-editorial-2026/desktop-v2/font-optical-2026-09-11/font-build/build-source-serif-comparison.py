#!/usr/bin/env python3
"""Make the isolated Quality comparison's reproducible Source Serif 4 webfont.

Input: complete OFL SourceSerif4[opsz,wght].ttf from Google Fonts.
Output: static wght450/opsz60 WOFF2 with Latin/Cyrillic/punctuation coverage.
Input and output locations must be supplied explicitly.
"""
from pathlib import Path
import argparse
import hashlib
import json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
from fontTools.pens.boundsPen import BoundsPen

parser=argparse.ArgumentParser()
parser.add_argument('--source',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
axes={'wght':450,'opsz':60}
source=TTFont(args.source,recalcTimestamp=False)
static=instantiateVariableFont(source,axes,inplace=False,optimize=True)
options=subset.Options()
options.layout_features=['*']
options.name_IDs=['*']
options.name_legacy=True
options.name_languages=['*']
options.notdef_glyph=True
options.notdef_outline=True
options.recommended_glyphs=True
options.glyph_names=True
# Keep font copyright/license records (name IDs 0,13,14) and layout closure.
requested=set(range(0x0020,0x0250))|set(range(0x0400,0x0530))|set(range(0x2000,0x2070))|{0x20AC,0x2116,0xFEFF}
worker=subset.Subsetter(options=options)
worker.populate(unicodes=requested)
worker.subset(static)
static.flavor='woff2'
static.recalcTimestamp=False
args.output.parent.mkdir(parents=True,exist_ok=True)
static.save(args.output,reorderTables=True)
result=TTFont(args.output)
source_cmap=source.getBestCmap()
result_cmap=result.getBestCmap()
required='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя'
missing=[c for c in required if ord(c) not in result_cmap]
assert not missing, f'Missing required letters: {missing}'
expected=requested & set(source_cmap)
assert expected==set(result_cmap), 'Subset coverage differs from requested available source glyphs'
assert 'fvar' not in result and 'gvar' not in result and 'HVAR' not in result
source_glyphs=source.getGlyphSet(location=axes)
result_glyphs=result.getGlyphSet()
def bounds(gs,name):
    pen=BoundsPen(gs)
    gs[name].draw(pen)
    return pen.bounds
comparisons=[]
for c in required:
    old=bounds(source_glyphs,source_cmap[ord(c)])
    new=bounds(result_glyphs,result_cmap[ord(c)])
    delta=max(abs(a-b) for a,b in zip(old,new))
    comparisons.append({'char':c,'sourceBounds':old,'staticBounds':new,'maxDeltaUnits':delta})
max_delta=max(row['maxDeltaUnits'] for row in comparisons)
# Static instancing rounds fractional variable coordinates to the font's integer grid.
assert max_delta <= 1.1, f'Outline delta exceeds rounding tolerance: {max_delta}'
upm=source['head'].unitsPerEm
licenses=[n.toUnicode() for n in result['name'].names if n.nameID in (0,13,14)]
assert any('Open Font License' in n for n in licenses), 'Missing OFL license name record'
report={'source':str(args.source),'sourceSHA256':hashlib.sha256(args.source.read_bytes()).hexdigest(),'output':str(args.output),'axes':axes,'bytes':args.output.stat().st_size,'sha256':hashlib.sha256(args.output.read_bytes()).hexdigest(),'unitsPerEm':upm,'cmapSize':len(result_cmap),'requiredLetters':len(required),'missingRequiredLetters':missing,'requestedAvailableCoveragePreserved':len(expected),'maxOutlineDeltaUnits':max_delta,'maxOutlineDeltaAt20_2px':max_delta/upm*20.2,'retainedTables':sorted(result.keys()),'licenseRecords':list(dict.fromkeys(licenses)),'outlineComparisons':comparisons}
args.output.with_suffix('.verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ('outlineComparisons','licenseRecords')},indent=2))
