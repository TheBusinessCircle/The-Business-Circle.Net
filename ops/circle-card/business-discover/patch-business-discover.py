"""Scoped onboarding patch; supports the existing local-hub onboarding additions."""
from pathlib import Path

FLOW = 'src/components/circle-card/circle-card-onboarding-flow.tsx'
PAGE = 'src/app/(member)/dashboard/circle-card/onboarding/page.tsx'
SERVICE = 'src/server/circle-card/onboarding.service.ts'
STATE = 'src/lib/circle-card/onboarding-flow-state.ts'
PATHS = (FLOW, PAGE, SERVICE, STATE)
MARKER = 'discoverAfterFirstCardTypeSelection'

def once(source, old, new):
    if source.count(old) != 1:
        raise RuntimeError('Expected one onboarding anchor: ' + old[:90])
    return source.replace(old, new, 1)

def patch_sources(sources):
    if MARKER in sources[FLOW]:
        raise RuntimeError('Business Discover defaults already installed; no changes made.')
    result = dict(sources)
    s = sources[STATE]
    if MARKER in s:
        raise RuntimeError('Partial previous patch requires review.')
    s += '''
/** Business selection enables discovery unless the owner has already chosen. */
export function discoverAfterFirstCardTypeSelection(
  nextCardType: "PERSONAL" | "CREATOR" | "BUSINESS",
  currentShowInDiscover: boolean,
  preserveDiscoverChoice: boolean
) {
  return preserveDiscoverChoice ? currentShowInDiscover : nextCardType === "BUSINESS";
}
'''
    result[STATE] = s
    s = sources[FLOW]
    if '  showInDiscover: boolean;' not in s:
        s = once(s, '  cardType: CircleCardType;', '  cardType: CircleCardType;\n  showInDiscover: boolean;')
    s = once(s, 'import { stepAfterFirstCircleCardSave }', 'import { discoverAfterFirstCardTypeSelection, stepAfterFirstCircleCardSave }')
    s = once(s, '  const [values, setValues] = useState(defaults);', '''  const [values, setValues] = useState(defaults);
  // Preserve saved Business preferences and explicit changes made during this visit.
  const discoverChoiceMade = useRef(Boolean(defaults.cardId) && defaults.cardType === "BUSINESS");''')
    s = once(s, '    setValues((current) => ({ ...current, [key]: value }));', '''    if (key === "showInDiscover") discoverChoiceMade.current = true;
    const preserveDiscoverChoice = discoverChoiceMade.current;
    setValues((current) => ({
      ...current,
      [key]: value,
      ...(key === "cardType" ? {
        showInDiscover: discoverAfterFirstCardTypeSelection(
          value as CircleCardType, current.showInDiscover, preserveDiscoverChoice
        )
      } : {})
    }));''')
    # Show the choice immediately when the owner selects Business.
    s = once(s, '                  </fieldset>\n                  <div className="space-y-2">', '''                  </fieldset>
                  {values.cardType === "BUSINESS" ? (
                    <label className="flex items-start gap-3 rounded-2xl border border-gold/20 bg-gold/8 p-4">
                      <input type="checkbox" checked={values.showInDiscover} onChange={(event) => update("showInDiscover", event.target.checked)} className="mt-1 h-5 w-5" />
                      <span className="text-sm">Show my published business card in Circle Discover
                        <span className="mt-1 block text-xs text-muted">Discover starts on for new business cards so customers can find you. You can switch it off here or in Settings. Your draft stays private until you publish.</span>
                      </span>
                    </label>
                  ) : null}
                  <div className="space-y-2">''')
    result[FLOW] = s
    s = sources[PAGE]
    if '        showInDiscover: true,' not in s:
        s = once(s, '        cardType: true,', '        cardType: true,\n        showInDiscover: true,')
    if 'showInDiscover: card?.showInDiscover ?? false,' in s:
        s = once(s, 'showInDiscover: card?.showInDiscover ?? false,', 'showInDiscover: card?.showInDiscover ?? (query?.cardType === "BUSINESS"),')
    else:
        if '  const query = await searchParams;' not in s:
            # Base onboarding has no query-based card type selection.
            s = once(s, '        cardType: card?.cardType ?? "PERSONAL",', '        cardType: card?.cardType ?? "PERSONAL",\n        showInDiscover: card?.showInDiscover ?? false,')
        else:
            raise RuntimeError('Unrecognised onboarding default selection.')
    result[PAGE] = s
    s = sources[SERVICE]
    if 'import { buildCircleCardDiscoverVisibilityData }' not in s:
        s = 'import { buildCircleCardDiscoverVisibilityData } from "@/lib/circle-card/privacy";\n' + s
    if 'showInDiscover: z.boolean()' not in s:
        s = once(s, '  cardType: z.enum(["PERSONAL", "CREATOR", "BUSINESS"]),', '  cardType: z.enum(["PERSONAL", "CREATOR", "BUSINESS"]),\n  showInDiscover: z.boolean().default(false),')
    s = once(s, '  const data = {\n    cardType: values.cardType,', '''  const data = {
    // Persist draft preferences; Discover and local-hub queries still require publication.
    showInDiscover: values.showInDiscover,
    discoverOptedInAt: null,
    cardType: values.cardType,''')
    if 'data: { isPublished: true }' in s:
        s = once(s, 'data: { isPublished: true }', 'data: { isPublished: true, ...buildCircleCardDiscoverVisibilityData({ showInDiscover: values.showInDiscover }) }')
    elif 'buildCircleCardDiscoverVisibilityData({ showInDiscover: values.showInDiscover })' not in s:
        raise RuntimeError('Unknown onboarding publication implementation.')
    result[SERVICE] = s
    return result

def patch_directory(root):
    root = Path(root).resolve()
    sources = {}
    for relative in PATHS:
        path = root / relative
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise RuntimeError('Onboarding source escapes candidate release.')
        sources[relative] = path.read_text(encoding='utf-8')
    result = patch_sources(sources)
    # All anchors are checked before any candidate source is written.
    for relative, content in result.items():
        (root / relative).write_text(content, encoding='utf-8')
    return result

if __name__ == '__main__':
    import sys
    patch_directory(sys.argv[1])
